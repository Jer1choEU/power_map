import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {extractRelations,importOcp} from '../scripts/import-ocp.mjs';

test('only unambiguous awards with legal fiscal identifiers create edges',async()=>{
 const doc=JSON.parse((await fs.readFile('tests/fixtures/ocp-sample.jsonl','utf8')).split('\n')[0]);
 const links=extractRelations(doc);
 assert.equal(links.length,1);
 assert.equal(links[0].relation.type,'aggiudicazione');
 assert.equal(links[0].relation.eventDate,'2023-11-01');
 assert.equal(links[0].relation.from,'institution:it-cf:12345678901');
 assert.equal(links[0].relation.to,'company:it-cf:09876543210');
 assert.equal(extractRelations({...doc,awards:[{...doc.awards[0],items:[{id:'A123456789'},{id:'B123456789'}]}]}).length,0);
});
test('fixture importer never creates edges from person tax ids or missing sources',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pm-ocp-'));
 try{
  const result=await importOcp({fixture:'tests/fixtures/ocp-sample.jsonl',outputDir:dir,asOf:'2026-10-09'});
  assert.equal(result.relations.length,1);
  assert.equal(result.entities.length,2);
  assert.deepEqual(result.relations[0].sourceIds,['source:ocp-anac']);
  const report=JSON.parse(await fs.readFile(path.join(dir,'report.json'),'utf8'));
  assert.equal(report.rows,2);
  assert.equal(report.skippedRows,1);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
