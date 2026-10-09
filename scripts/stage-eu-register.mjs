import fs from 'node:fs/promises';
import path from 'node:path';

const SRC='https://ec.europa.eu/transparencyregister/public/files/ODP/download/XML/latest';
const HASH=/^[a-f0-9]{64}$/;
function requireSafe(pass,message){if(!pass)throw Error('EU publication halted: '+message)}

export function verifyEuPublication(candidate,report,previous=null,priorReport=null){
 requireSafe(report?.sourceUrl===SRC,'Unexpected official source');
 requireSafe(HASH.test(report.archiveSha256||''),'Missing official file digest');
 requireSafe(/^\d{4}-\d{2}-\d{2}$/.test(report.exportDate||''),'No XML export date');
 requireSafe(report.exportDate>='2026-01-01','Outdated source export');
 requireSafe(report.globalRegistrations>=10000,'Unexpected global record count');
 requireSafe(report.italianOrganizations>=200 && report.italianOrganizations<=6000,'Unexpected Italian organization count');
 requireSafe(candidate?.version===1&&candidate.mode==='real','Bad graph mode');
 requireSafe(candidate.sources?.length===1&&candidate.sources[0].url===SRC,'Provenance mismatch');
 requireSafe(candidate.entities?.length===report.italianOrganizations+1,'Entity count mismatch');
 requireSafe(candidate.relations?.length===report.italianOrganizations,'Registration count mismatch');
 requireSafe(report.rejectedItalianRecords<=100,'Too many invalid registrants');
 const nodes=new Set(candidate.entities.map(e=>e.id)),ids=new Set();
 requireSafe(nodes.size===candidate.entities.length,'Duplicate organization IDs');
 for(const rel of candidate.relations){
  requireSafe(rel.type==='iscrizione'&&rel.from?.startsWith('eu-tr:organization:')&&rel.to==='eu-tr:institution:transparency-register','Bad registration relation');
  requireSafe(nodes.has(rel.from)&&nodes.has(rel.to)&&rel.sourceIds?.length===1&&rel.sourceIds[0]==='source:eu-transparency','Broken registration provenance');
  requireSafe(!ids.has(rel.id),'Duplicate registration');
  ids.add(rel.id);
 }
 if(previous){
  requireSafe(report.italianOrganizations>=previous.relations.length*.85,'Large unexplained drop in registrants');
  requireSafe(report.italianOrganizations<=previous.relations.length*1.35,'Large unexplained jump in registrants');
  const old=new Set(previous.relations.map(r=>r.id));
  const intersection=candidate.relations.filter(r=>old.has(r.id)).length;
  requireSafe(intersection/old.size>=.8,'Excessive churn of registration identities');
 }
 if(priorReport?.archiveSha256===report.archiveSha256)return 'none';
 return 'publish';
}
export async function stageEu({candidateFile='build/eu-register/candidate.json',reportFile='build/eu-register/report.json',dataFile='data/eu-transparency.json',publishedReport='data/eu-transparency-report.json'}={}){
 const candidate=JSON.parse(await fs.readFile(candidateFile,'utf8'));
 const report=JSON.parse(await fs.readFile(reportFile,'utf8'));
 const optional=async f=>{try{return JSON.parse(await fs.readFile(f,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}};
 const previous=await optional(dataFile),priorReport=await optional(publishedReport);
 const action=verifyEuPublication(candidate,report,previous,priorReport);
 if(action==='none'){console.log('EU archive unchanged; no action.');return}
 await fs.mkdir(path.dirname(dataFile),{recursive:true});
 await fs.writeFile(dataFile,JSON.stringify(candidate,null,2)+'\n');
 await fs.writeFile(publishedReport,JSON.stringify({...report,automatic:true,qualityGate:'eu-registrations-v1'},null,2)+'\n');
 console.log('EU registry staged for automatic publication: '+candidate.relations.length+' registrations.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 stageEu().catch(e=>{console.error(e);process.exitCode=1});
}