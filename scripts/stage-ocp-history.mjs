import fs from 'node:fs/promises';
import path from 'node:path';

const SRC='https://data.open-contracting.org/en/publication/117';
const YEARS=['2020','2021','2022','2023','2024','2025'];
const HEX=/^[a-f0-9]{64}$/;

export function verifyHistory(data,report,previous=null,priorReport=null){
 if(data?.mode!=='real'||data.version!==1||data.sources?.length!==1||data.sources[0].url!==SRC)throw Error('History source untrusted');
 if(report?.sourceUrl!==SRC||!HEX.test(report.archiveSetSHA256||''))throw Error('History checksum invalid');
 for(const year of YEARS)if(!HEX.test(report.years?.[year]?.sha256||''))throw Error('Historical year missing '+year);
 if(report.duplicateAwards<0)throw Error('Invalid cross-year dedup');
 if(data.relations?.length<3000||data.entities?.length<1000)throw Error('Historical data anomalously small');
 if(data.relations.length!==report.relations||data.entities.length!==report.entities)throw Error('History report mismatch');
 const ids=new Set(data.entities.map(e=>e.id)),relids=new Set();
 if(ids.size!==data.entities.length)throw Error('Duplicate history node');
 for(const r of data.relations){
  if(r.type!=='aggiudicazione'||!ids.has(r.from)||!ids.has(r.to)||r.sourceIds?.length!==1||r.sourceIds[0]!=='source:ocp-anac'||!/\bCIG [a-zA-Z0-9]{10}\b/.test(r.label))throw Error('Invalid historical award');
  if(relids.has(r.id))throw Error('Duplicate historical award');
  relids.add(r.id);
 }
 if(previous){
  const old=new Set(previous.relations.map(r=>r.id));
  const shared=data.relations.filter(r=>old.has(r.id)).length;
  if(shared/old.size<.8||data.relations.length<previous.relations.length*.85)throw Error('Unexpected historical data loss or churn');
 }
 if(priorReport?.archiveSetSHA256===report.archiveSetSHA256)return 'none';
 return 'publish';
}

export async function stageHistory({candidateFile='build/ocp-history/candidate.json',reportFile='build/ocp-history/report.json',target='data/ocp-history.json',targetReport='data/ocp-history-report.json'}={}){
 const data=JSON.parse(await fs.readFile(candidateFile,'utf8'));
 const report=JSON.parse(await fs.readFile(reportFile,'utf8'));
 const optional=async f=>{try{return JSON.parse(await fs.readFile(f,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}};
 const previous=await optional(target),priorReport=await optional(targetReport);
 const action=verifyHistory(data,report,previous,priorReport);
 if(action==='none'){console.log('History unchanged');return}
 await fs.mkdir(path.dirname(target),{recursive:true});
 await fs.writeFile(target,JSON.stringify(data,null,2)+'\n');
 await fs.writeFile(targetReport,JSON.stringify({...report,automatic:true,qualityGate:'history-v1'},null,2)+'\n');
 console.log('Historical ANAC archive automatically staged: '+data.relations.length+' awards');
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 stageHistory().catch(e=>{console.error(e);process.exitCode=1});
}