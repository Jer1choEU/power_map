import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const run=(args)=>spawnSync(process.execPath,args,{encoding:'utf8'});
test('real and demo datasets pass structural verification',()=>{
 for(const file of ['data/demo.json','data/italia-2026.json']){
  const result=run(['scripts/validate.mjs',file]);assert.equal(result.status,0,result.stderr);
 }
});
test('ANAC importer rejects incomplete or ambiguous awards',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'power-map-'));
 try{
  const csv=path.join(dir,'input.csv'),mapping=path.join(dir,'mapping.json');
  fs.writeFileSync(csv,'cig,buyerId,buyerName,supplierId,supplierName\nABC1234567,01234,Comune Test,9988,Impresa Demo\nBAD,01234,Comune Test,9988,Impresa Demo\n');
  fs.writeFileSync(mapping,JSON.stringify({kind:'anac',sourceUrl:'https://dati.anticorruzione.it/dataset',observedAt:'2026-10-09',columns:{cig:'cig',buyerId:'buyerId',buyerName:'buyerName',supplierId:'supplierId',supplierName:'supplierName'}}));
  const result=run(['scripts/import-official-csv.mjs','anac',csv,mapping]);assert.notEqual(result.status,0);
  assert.match(result.stderr,/Rejected 1 rows/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('EU importer creates no invented relations',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'power-map-'));
 try{
  const csv=path.join(dir,'input.csv'),mapping=path.join(dir,'mapping.json');
  fs.writeFileSync(csv,'id,name\nREG-001,"Associazione, Demo"\n');
  fs.writeFileSync(mapping,JSON.stringify({kind:'eu-transparency',sourceUrl:'https://data.europa.eu/data/datasets/transparency-register',observedAt:'2026-10-09',columns:{registrationId:'id',name:'name'}}));
  const result=run(['scripts/import-official-csv.mjs','eu-transparency',csv,mapping]);
  assert.equal(result.status,0,result.stderr);
  const candidate=JSON.parse(fs.readFileSync('build/eu-transparency-candidate.json','utf8'));
  assert.equal(candidate.entities.length,1);assert.equal(candidate.relations.length,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});fs.rmSync('build/eu-transparency-candidate.json',{force:true})}
});
