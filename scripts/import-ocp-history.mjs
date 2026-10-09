import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {importOcp} from './import-ocp.mjs';

export const REQUIRED_YEARS=['2020','2021','2022','2023','2024','2025'];
const optionalYears=['2026'];
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');

export async function availableFutureYear(year,{fetcher=fetch}={}){
 const url='https://data.open-contracting.org/en/publication/117/download?name='+year+'.jsonl.gz';
 const response=await fetcher(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(25000)});
 if(response.status===404)return false;
 if(![301,302,303,307,308].includes(response.status))throw Error('Unexpected OCP availability HTTP '+response.status);
 const location=response.headers.get('location');if(!location)throw Error('Missing OCP archive redirect');
 const target=new URL(location,url);
 if(target.protocol!=='https:'||target.hostname!=='fastly.data.open-contracting.org'||!target.pathname.startsWith('/downloads/italy_anac/')||!target.pathname.endsWith('/'+year+'.jsonl.gz'))throw Error('Untrusted OCP archive location');
 const probe=await fetcher(target.href,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(25000)});
 if(probe.status===404)return false;
 if(probe.status!==200)throw Error('Cannot verify archive availability HTTP '+probe.status);
 return true;
}

export function combineYears(years,{asOf=new Date().toISOString().slice(0,10)}={}){
 const entities=new Map(),relations=new Map(),reports={},conflicts=[];
 for(const item of years){
  const {year,data,report}=item;
  if(report.year!==year||!(/^[a-f0-9]{64}$/).test(report.archiveSha256||''))throw Error('Missing yearly archive identity '+year);
  if(!Array.isArray(data?.relations)||!data.relations.length||!Array.isArray(data.entities))throw Error('Missing annual data '+year);
  const yearNodes=new Map(data.entities.map(n=>[n.id,n]));
  for(const r of data.relations){
   if(r.type!=='aggiudicazione'||!yearNodes.has(r.from)||!yearNodes.has(r.to))throw Error('Invalid award '+year);
   const prev=relations.get(r.id);
   if(prev){
    if(prev.from!==r.from||prev.to!==r.to||prev.eventDate!==r.eventDate){
     conflicts.push({id:r.id,year,reason:'Conflicting award identity'});continue;
    }
   }else relations.set(r.id,r);
   for(const id of [r.from,r.to]){
    const next=yearNodes.get(id),old=entities.get(id);
    if(old&&old.type!==next.type)throw Error('Entity type collision '+id);
    if(!old)entities.set(id,next);
   }
  }
  reports[year]={sha256:report.archiveSha256,rows:report.rows,eligible:report.eligibleRelations,relations:report.relations,sourceUrl:report.resolvedArchiveUrl??null};
 }
 if(conflicts.length>0)throw Error('Cross-year award identity conflicts: '+conflicts.length);
 const result={version:1,mode:'real',updatedAt:asOf,entities:[...entities.values()].sort((a,b)=>a.id.localeCompare(b.id)),
   sources:[{id:'source:ocp-anac',title:'ANAC contracts in OCDS via Open Contracting Partnership (CC BY 4.0)',url:'https://data.open-contracting.org/en/publication/117',publisher:'Open Contracting Partnership / ANAC',accessedAt:asOf}],
   relations:[...relations.values()].sort((a,b)=>a.id.localeCompare(b.id))};
 const identity=sha(Object.entries(reports).sort(([a],[b])=>a.localeCompare(b)).map(([year,r])=>year+':'+r.sha256).join('|'));
 return {data:result,report:{years:reports,yearCount:years.length,archiveSetSHA256:identity,entities:result.entities.length,relations:result.relations.length,duplicateAwards:years.reduce((sum,y)=>sum+y.data.relations.length,0)-result.relations.length,sourceUrl:result.sources[0].url}};
}

export async function run({yearImporter=importOcp,yearAvailability=availableFutureYear,outputDir='build/ocp-history',maxPerYear=1200}={}){
 const years=[...REQUIRED_YEARS],unavailable=[];
 for(const y of optionalYears){
  if(await yearAvailability(y))years.push(y);else unavailable.push(y);
 }
 const items=[];
 for(const year of years){
  const folder=path.join(outputDir,'years',year);
  const data=await yearImporter({year,maxRelations:maxPerYear,outputDir:folder});
  const report=JSON.parse(await fs.readFile(path.join(folder,'report.json'),'utf8'));
  items.push({year,data,report});
 }
 const {data,report}=combineYears(items);
 report.unavailableYears=unavailable;
 if(data.relations.length<3000)throw Error('Annual historical coverage unexpectedly low');
 await fs.mkdir(outputDir,{recursive:true});
 await fs.writeFile(path.join(outputDir,'candidate.json'),JSON.stringify(data,null,2)+'\n');
 await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('Multi-year OCP completed: '+data.entities.length+' entities, '+data.relations.length+' awards, years '+years.join(','));
 return {data,report};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 run().catch(e=>{console.error(e);process.exitCode=1});
}