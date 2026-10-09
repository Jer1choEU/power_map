import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const config=JSON.parse(await fs.readFile('sources/registry.json','utf8'));
const base=JSON.parse(await fs.readFile('data/italia-2026.json','utf8'));
const byId=new Map(base.entities.map(e=>[e.id,e]));
const bySource=new Map(base.sources.map(s=>[s.id,s]));
const byRelation=new Map(base.relations.map(r=>[r.id,r]));
let ingested=0,skipped=0;
for(const source of config.sources){
 if(!source.enabled)continue;
 // Every adapter is an explicitly reviewed, checked-in JSON export.
 // Network fetching and HTML parsing must be implemented per source and approved separately.
 if(source.adapter!=='local-json')throw Error('Unsupported adapter: '+source.adapter);
 const file=path.resolve(root,source.path);
 if(!file.startsWith(root+path.sep))throw Error('Path escapes repository');
 const input=JSON.parse(await fs.readFile(file,'utf8'));
 if(input.sourceId!==source.id)throw Error('Source mismatch: '+source.id);
 for(const record of input.entities??[]){
  if(!record.id||!record.name||!record.type)throw Error('Invalid entity');
  if(byId.has(record.id)&&JSON.stringify(byId.get(record.id))!==JSON.stringify(record))throw Error('Conflicting entity '+record.id);
  byId.set(record.id,record);
 }
 for(const record of input.sources??[]){
  if(!record.id||!record.url||!record.accessedAt)throw Error('Invalid source');
  if(bySource.has(record.id)&&JSON.stringify(bySource.get(record.id))!==JSON.stringify(record))throw Error('Conflicting source '+record.id);
  bySource.set(record.id,record);
 }
 for(const r of input.relations??[]){
  if(!byId.has(r.from)||!byId.has(r.to))throw Error('Missing endpoint '+r.id);
  if(!Array.isArray(r.sourceIds)||r.sourceIds.length===0||r.sourceIds.some(id=>!bySource.has(id)))throw Error('Missing evidence '+r.id);
  if(byRelation.has(r.id)){
   if(JSON.stringify(byRelation.get(r.id))!==JSON.stringify(r))throw Error('Conflicting relation '+r.id);
   skipped++;continue;
  }
  byRelation.set(r.id,r);ingested++;
 }
}
const result={...base,entities:[...byId.values()].sort((a,b)=>a.id.localeCompare(b.id)),sources:[...bySource.values()].sort((a,b)=>a.id.localeCompare(b.id)),relations:[...byRelation.values()].sort((a,b)=>a.id.localeCompare(b.id))};
await fs.mkdir('build',{recursive:true});
await fs.writeFile('build/candidate.json',JSON.stringify(result,null,2)+'\n');
await fs.writeFile('build/report.json',JSON.stringify({ingested,skipped,totalEntities:result.entities.length,totalRelations:result.relations.length,totalSources:result.sources.length},null,2)+'\n');
console.log('Candidate ready: '+ingested+' new relations; '+skipped+' duplicates. REVIEW REQUIRED — never auto-publish.');
