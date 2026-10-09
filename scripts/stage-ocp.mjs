import fs from 'node:fs/promises';
import path from 'node:path';

const GOOD_SOURCE='https://data.open-contracting.org/en/publication/117';
const SHA=/^[a-f0-9]{64}$/;
const TAX_ID=/^(institution|company):it-cf:[0-9]{11}$/;
const CIG=/\bCIG [A-Za-z0-9]{10}\b/;

function assert(condition,message){if(!condition)throw Error('Publication refused: '+message)}

export function assessUpdate(candidate,report,published,previousReport){
 assert(candidate?.mode==='real'&&candidate.version===1,'dataset metadata invalid');
 assert(report?.year==='2025','unexpected archive year');
 assert(SHA.test(report.archiveSha256||''),'missing SHA256');
 assert(report.source===GOOD_SOURCE,'source not allowlisted');
 assert(Number.isSafeInteger(report.rows)&&report.rows>=5000,'unexpected source row count');
 assert(report.malformedRows===0,'malformed JSONL rows');
 assert(Array.isArray(candidate.entities)&&candidate.entities.length>=900,'too few entities');
 assert(Array.isArray(candidate.relations)&&candidate.relations.length>=900&&candidate.relations.length<=1200,'unexpected relation count');
 assert(report.entities===candidate.entities.length&&report.relations===candidate.relations.length,'report totals mismatch');
 assert(Array.isArray(candidate.sources)&&candidate.sources.length===1&&candidate.sources[0].url===GOOD_SOURCE&&candidate.sources[0].id==='source:ocp-anac','untrusted provenance');
 assert(Number.isInteger(report.conflictingNames)&&report.conflictingNames<=Math.max(100,Math.floor(report.eligibleRelations*.02)),'excessive identity-name disagreements');
 const entities=new Set();
 for(const item of candidate.entities){
  assert(TAX_ID.test(item.id)&&item.name?.trim().length>1,'invalid subject identity');
  assert((item.id.startsWith('institution:')&&item.type==='istituzione')||(item.id.startsWith('company:')&&item.type==='impresa'),'identity/type mismatch');
  assert(!entities.has(item.id),'duplicate subject '+item.id);
  entities.add(item.id);
 }
 const relIds=new Set();
 for(const rel of candidate.relations){
  assert(rel.type==='aggiudicazione'&&rel.id?.startsWith('rel:ocp:'),'unexpected relation type');
  assert(!relIds.has(rel.id),'duplicate relation '+rel.id);
  relIds.add(rel.id);
  assert(entities.has(rel.from)&&entities.has(rel.to)&&rel.from.startsWith('institution:')&&rel.to.startsWith('company:'),'missing award endpoint');
  assert(CIG.test(rel.label||''),'missing explicit CIG');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(rel.eventDate||'')&&!Number.isNaN(Date.parse(rel.eventDate)),'missing award event date');
  assert(rel.validFrom===null&&rel.validTo===null,'procurement relationship represented as tenure');
  assert(Array.isArray(rel.sourceIds)&&rel.sourceIds.length===1&&rel.sourceIds[0]==='source:ocp-anac','award evidence mismatch');
 }
 if(published){
  assert(previousReport?.archiveSha256&&SHA.test(previousReport.archiveSha256),'existing publication lacks checksum');
  assert(published.mode==='real'&&Array.isArray(published.relations),'previous publication invalid');
  const prevIds=new Set(published.relations.map(r=>r.id));
  const preserved=candidate.relations.filter(r=>prevIds.has(r.id)).length;
  const overlap=preserved/Math.max(1,prevIds.size);
  assert(overlap>=.8,'material change to existing award sample ('+(overlap*100).toFixed(1)+'% retained)');
  assert(candidate.relations.length>=published.relations.length*.8,'large data loss');
 }
 const finalized={...report,publicationMode:'automatic',qualityGate:'strict-v1',publishedSource:'OCP mirror of ANAC'};
 if(previousReport?.archiveSha256===report.archiveSha256){
  if(previousReport.publicationMode==='automatic'&&previousReport.qualityGate==='strict-v1'){
   return {action:'none',report:finalized};
  }
  return {action:'report-only',report:finalized};
 }
 return {action:'publish',report:finalized};
}

export async function stageFiles(opts={}){
 const candidatePath=opts.candidatePath||'build/ocp/candidate.json';
 const reportPath=opts.reportPath||'build/ocp/report.json';
 const outputPath=opts.outputPath||'data/ocp-2025.json';
 const outputReportPath=opts.outputReportPath||'data/ocp-2025-report.json';
 const candidate=JSON.parse(await fs.readFile(candidatePath,'utf8'));
 const report=JSON.parse(await fs.readFile(reportPath,'utf8'));
 const optional=async file=>{try{return JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}};
 const prior=await optional(outputPath),previousReport=await optional(outputReportPath);
 const result=assessUpdate(candidate,report,prior,previousReport);
 if(result.action==='none'){console.log('Verified archive SHA256 unchanged; nothing to publish.');return result}
 await fs.mkdir(path.dirname(outputPath),{recursive:true});
 if(result.action==='publish')await fs.writeFile(outputPath,JSON.stringify(candidate,null,2)+'\n');
 await fs.writeFile(outputReportPath,JSON.stringify(result.report,null,2)+'\n');
 console.log('Automatic publication prepared: '+result.action+' · '+candidate.entities.length+' entities · '+candidate.relations.length+' awards · '+report.archiveSha256);
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const get=(arg,fallback)=>{const i=process.argv.indexOf(arg);return i<0?fallback:process.argv[i+1]};
 stageFiles({
  candidatePath:get('--candidate',undefined),reportPath:get('--report',undefined),
  outputPath:get('--output',undefined),outputReportPath:get('--output-report',undefined)
 }).catch(e=>{console.error(e);process.exitCode=1});
}
