import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
const [,,kind,file,mappingFile]=process.argv;
if(!['anac','eu-transparency'].includes(kind)||!file||!mappingFile)throw Error('Usage: node scripts/import-official-csv.mjs anac|eu-transparency input.csv mapping.json');
const mapping=JSON.parse(await fs.readFile(mappingFile,'utf8'));
if(mapping.kind!==kind||!mapping.sourceUrl||!mapping.observedAt||!mapping.columns)throw Error('Invalid mapping: sourceUrl, observedAt, columns and kind required');
if(!/^https:\/\//.test(mapping.sourceUrl))throw Error('Official source HTTPS URL required');
const allowed=kind==='anac'?['dati.anticorruzione.it','www.anticorruzione.it','anticorruzione.it','www.dati.gov.it']:['transparency-register.europa.eu','data.europa.eu'];
if(!allowed.includes(new URL(mapping.sourceUrl).hostname))throw Error('Source domain not allowlisted');
function parseCSV(content,delimiter){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<content.length;i++){const c=content[i];if(c==='"'){if(quoted&&content[i+1]==='"'){field+='"';i++}else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(field);field=''}else if((c==='\n'||c==='\r'&&content[i+1]!=='\n')&&!quoted){row.push(field);field='';if(row.some(x=>x!==''))rows.push(row);row=[]}else if(c!=='\r'||quoted)field+=c;}if(quoted)throw Error('Unclosed CSV quote');if(field!==''||row.length){row.push(field);rows.push(row)}return rows}
const text=(await fs.readFile(file,'utf8')).replace(/^\uFEFF/,'');const rows=parseCSV(text,mapping.delimiter??',');const header=rows.shift();if(!header)throw Error('Empty CSV');
function get(row,key){const column=mapping.columns[key];if(!column)return '';const index=header.indexOf(column);if(index<0)throw Error('Missing column '+column);return (row[index]??'').trim()}
const cleanId=s=>s.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,100);
const digest=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
const entities=new Map(), relations=[],errors=[];const sourceId='source:'+kind+':'+digest(mapping.sourceUrl+mapping.observedAt);
for(let i=0;i<rows.length;i++){const row=rows[i];try{
 if(kind==='anac'){
  const cig=get(row,'cig'),buyerId=get(row,'buyerId'),buyerName=get(row,'buyerName'),supplierId=get(row,'supplierId'),supplierName=get(row,'supplierName');
  if(!/^[a-zA-Z0-9]{10}$/.test(cig)||!buyerId||!supplierId||!buyerName||!supplierName)throw Error('Missing/invalid CIG or organization identifier');
  const buyer='institution:anac:'+cleanId(buyerId),supplier='company:anac:'+cleanId(supplierId);
  entities.set(buyer,{id:buyer,name:buyerName,type:'istituzione',description:'Stazione appaltante da dataset ANAC; identificativo da verificare'});
  entities.set(supplier,{id:supplier,name:supplierName,type:'impresa',description:'Aggiudicatario da dataset ANAC; identificativo da verificare'});
  relations.push({id:'rel:anac:'+cig+':'+digest(buyerId+'|'+supplierId),from:buyer,to:supplier,type:'aggiudicazione',label:'Aggiudicazione pubblica CIG '+cig,validFrom:null,validTo:null,sourceIds:[sourceId]});
 }else{
  const regId=get(row,'registrationId'),name=get(row,'name');if(!regId||!name)throw Error('Missing registration ID or organization name');
  const id='organization:eu-tr:'+cleanId(regId);
  entities.set(id,{id,name,type:'impresa',description:'Organizzazione iscritta al Registro per la trasparenza UE; categoria legale da verificare'});
 }
}catch(e){errors.push({line:i+2,reason:String(e.message)})}}
if(errors.length)throw Error('Rejected '+errors.length+' rows; first errors: '+JSON.stringify(errors.slice(0,10)));
const result={sourceId:'reviewed-official-records',entities:[...entities.values()],sources:[{id:sourceId,title:mapping.title??('Official dataset '+kind),url:mapping.sourceUrl,publisher:kind==='anac'?'ANAC':'Transparency Register EU',accessedAt:mapping.observedAt}],relations};
await fs.mkdir('build',{recursive:true});await fs.writeFile('build/'+kind+'-candidate.json',JSON.stringify(result,null,2)+'\n');
console.log('Candidate (not published): '+entities.size+' entities, '+relations.length+' relations from '+rows.length+' rows');
