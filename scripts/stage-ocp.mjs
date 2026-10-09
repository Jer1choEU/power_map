import fs from 'node:fs/promises';
const output='data/ocp-2025.json',outReport='data/ocp-2025-report.json';
const candidate=JSON.parse(await fs.readFile('build/ocp/candidate.json','utf8'));
const report=JSON.parse(await fs.readFile('build/ocp/report.json','utf8'));
let prior=null;
try{prior=JSON.parse(await fs.readFile(outReport,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
if(prior?.archiveSha256&&prior.archiveSha256===report.archiveSha256){
 console.log('Identical OCDS archive SHA256; no new proposal required.');
 process.exit(0);
}
await fs.mkdir('data',{recursive:true});
await fs.writeFile(output,JSON.stringify(candidate,null,2)+'\n');
await fs.writeFile(outReport,JSON.stringify(report,null,2)+'\n');
console.log('Staged candidate '+candidate.entities.length+' entities, '+candidate.relations.length+' edges; archive '+report.archiveSha256);
