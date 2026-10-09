import fs from 'node:fs/promises';
import {Readable,Transform} from 'node:stream';
import {createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
import crypto from 'node:crypto';
import path from 'node:path';

const PUBLIC_DOWNLOAD='https://data.open-contracting.org/en/publication/117/download?name=';
const ALLOWED_YEARS=new Set(['2020','2021','2022','2023','2024','2025']);
const isTaxId=id=>/^[0-9]{11}$/.test(String(id??''));
const isCig=id=>/^[A-Za-z0-9]{10}$/.test(String(id??''));
const isDate=date=>typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);

export function extractRelations(doc) {
 const result=[];
 if(!doc||typeof doc!=='object'||!String(doc.ocid||'').startsWith('ocds-')||!Array.isArray(doc.parties))return result;
 const buyer=doc.parties.find(p=>p?.id===doc.buyer?.id && p.roles?.includes('buyer') && isTaxId(p.identifier?.id) && p.identifier?.scheme==='IT-CF');
 if(!buyer||!buyer.name?.trim())return result;
 const buyerTax=buyer.identifier.id;
 for(const award of (doc.awards||[])){
  if(!award?.id||!isDate(award.date?.slice(0,10))||!Array.isArray(award.suppliers)||award.status==='cancelled')continue;
  const cigs=[...new Set((award.items||[]).map(i=>String(i?.id??'')).filter(isCig))];
  if(cigs.length!==1)continue; // no ambiguous award-to-lot mapping
  const cig=cigs[0].toUpperCase();
  for(const supplier of award.suppliers){
   const party=doc.parties.find(p=>p?.id===supplier.id && p.roles?.includes('supplier') && p.identifier?.scheme==='IT-CF' && isTaxId(p.identifier?.id));
   if(!party?.name?.trim())continue;
   const from='institution:it-cf:'+buyerTax,to='company:it-cf:'+party.identifier.id;
   if(from===to)continue;
   const amount=award.value?.currency==='EUR' && Number.isFinite(award.value.amount) && award.value.amount>=0 ? Number(award.value.amount.toFixed(2)) : null;
   const label='Aggiudicazione CIG '+cig+(amount!==null?' · €'+amount.toLocaleString('it-IT'):'');
   result.push({
    buyer:{id:from,name:buyer.name.trim(),type:'istituzione',description:'Stazione appaltante identificata nel registro OCDS ANAC (IT-CF).'},
    supplier:{id:to,name:party.name.trim(),type:'impresa',description:'Aggiudicatario identificato nel registro OCDS ANAC (IT-CF). Verificare eventuale natura di ditta individuale.'},
    relation:{id:'rel:ocp:'+hash([doc.ocid,award.id,cig,buyerTax,party.identifier.id].join('|')),from,to,type:'aggiudicazione',label,eventDate:award.date.slice(0,10),validFrom:null,validTo:null,sourceIds:['source:ocp-anac']}
   });
  }
 }
 return result;
}

async function* readLines(opts,report){
 if(opts.fixture){
  const content=await fs.readFile(opts.fixture,'utf8');
  report.archiveSha256=crypto.createHash('sha256').update(content).digest('hex');
  for(const line of content.split(/\r?\n/))if(line.trim())yield line;
  return;
 }
 if(!ALLOWED_YEARS.has(opts.year))throw Error('Year not allowlisted');
 const url=PUBLIC_DOWNLOAD+opts.year+'.jsonl.gz';
 const redirect=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000)});
 if(![301,302,303,307,308].includes(redirect.status))throw Error('Expected OCP archive redirect, got HTTP '+redirect.status);
 const location=redirect.headers.get('location');
 if(!location)throw Error('Missing archive redirect location');
 const target=new URL(location,url);
 if(target.protocol!=='https:'||target.hostname!=='fastly.data.open-contracting.org'||!target.pathname.startsWith('/downloads/italy_anac/')||!target.pathname.endsWith('/'+opts.year+'.jsonl.gz'))throw Error('Untrusted OCP archive redirect');
 report.resolvedArchiveUrl=target.href;
 const response=await fetch(target.href,{redirect:'manual',signal:AbortSignal.timeout(120000),headers:{Accept:'application/gzip,application/octet-stream'}});
 if(!response.ok||!response.body)throw Error('Archive HTTP '+response.status);
 const cap=120*1024*1024, inflatedCap=900*1024*1024;
 let compressed=0,inflated=0;const compressedHash=crypto.createHash('sha256');
 const limitedCompressed=new Transform({transform(chunk,enc,cb){compressed+=chunk.length;compressedHash.update(chunk);cb(compressed>cap?Error('Archive too large'):null,chunk)}});
 const limitedInflated=new Transform({transform(chunk,enc,cb){inflated+=chunk.length;cb(inflated>inflatedCap?Error('Inflated archive too large'):null,chunk)}});
 const stream=Readable.fromWeb(response.body).pipe(limitedCompressed).pipe(createGunzip()).pipe(limitedInflated);
 for await(const line of createInterface({input:stream,crlfDelay:Infinity}))if(line.trim())yield line;
 report.archiveSha256=compressedHash.digest('hex');
}
export async function importOcp(options={}){
 const max=Number(options.maxRelations??1200);
 if(!Number.isInteger(max)||max<1||max>10000)throw Error('maxRelations must be 1..10000');
 const sources=[{id:'source:ocp-anac',title:'ANAC procurement OCDS archive '+(options.year||'fixture')+' (Open Contracting Partnership, CC BY 4.0)',publisher:'Open Contracting Partnership / ANAC',url:'https://data.open-contracting.org/en/publication/117',accessedAt:options.asOf||new Date().toISOString().slice(0,10)}];
 const entities=new Map(),relations=new Map();
 const report={year:options.year||'fixture',rows:0,malformedRows:0,skippedRows:0,eligibleRelations:0,limited:false,conflictingNames:0,source:sources[0].url};
 for await(const line of readLines(options,report)){
  report.rows++;
  let doc;try{doc=JSON.parse(line)}catch{report.malformedRows++;continue}
  const valid=extractRelations(doc);
  if(valid.length===0)report.skippedRows++;
  for(const pair of valid){
   report.eligibleRelations++;
   if(relations.size>=max&&!relations.has(pair.relation.id)){report.limited=true;continue}
   for(const ent of [pair.buyer,pair.supplier]){
    const prior=entities.get(ent.id);
    if(prior&&prior.name!==ent.name)report.conflictingNames++;
    if(!prior)entities.set(ent.id,ent);
   }
   relations.set(pair.relation.id,pair.relation);
  }
 }
 if(report.malformedRows>0)throw Error('Malformed JSONL rows: '+report.malformedRows);
 if(relations.size===0)throw Error('No supported award relationships found (failing closed)');
 const data={version:1,mode:'real',updatedAt:options.asOf||new Date().toISOString().slice(0,10),
 entities:[...entities.values()].sort((a,b)=>a.id.localeCompare(b.id)),
 sources,relations:[...relations.values()].sort((a,b)=>a.id.localeCompare(b.id))};
 const out=options.outputDir||'build/ocp';
 await fs.mkdir(out,{recursive:true});
 await fs.writeFile(path.join(out,'candidate.json'),JSON.stringify(data,null,2)+'\n');
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({...report,entities:entities.size,relations:relations.size},null,2)+'\n');
 console.log(JSON.stringify({...report,entities:entities.size,relations:relations.size}));
 return data;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const args=process.argv.slice(2);
 const get=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
 importOcp({year:get('--year','2025'),fixture:get('--fixture',null),maxRelations:get('--max-relations','1200'),outputDir:get('--output-dir','build/ocp'),asOf:get('--as-of',undefined)}).catch(e=>{console.error(e);process.exitCode=1});
}