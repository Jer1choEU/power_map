import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {assessUpdate,stageFiles} from '../scripts/stage-ocp.mjs';

const published=JSON.parse(await fs.readFile('data/ocp-2025.json','utf8'));
const priorReport=JSON.parse(await fs.readFile('data/ocp-2025-report.json','utf8'));
const fresh=()=>structuredClone(published);
const nextReport=()=>structuredClone(priorReport);

test('identical archive needs no repeated publication after migration',()=>{
 const report=nextReport();
 const oneTime=assessUpdate(fresh(),report,published,priorReport);
 assert.equal(oneTime.action,'report-only');
 const alreadyUpdated={...priorReport,publicationMode:'automatic',qualityGate:'strict-v1'};
 assert.equal(assessUpdate(fresh(),report,published,alreadyUpdated).action,'none');
});

test('safe source refresh can publish without human merge',()=>{
 const report=nextReport();report.archiveSha256='f'.repeat(64);
 const result=assessUpdate(fresh(),report,published,priorReport);
 assert.equal(result.action,'publish');
 assert.equal(result.report.publicationMode,'automatic');
});

test('unknown provenance and checksum fail closed',()=>{
 const report=nextReport();report.archiveSha256='invalid';
 assert.throws(()=>assessUpdate(fresh(),report,published,priorReport),/SHA256/);
 const other=nextReport();other.source='https://example.com/not-anac';
 assert.throws(()=>assessUpdate(fresh(),other,published,priorReport),/source not allowlisted/);
});

test('missing CIG or evidence fails closed',()=>{
 const candidate=fresh();candidate.relations[0].label='Aggiudicazione senza codice';
 assert.throws(()=>assessUpdate(candidate,nextReport(),published,priorReport),/explicit CIG/);
 const withoutEvidence=fresh();withoutEvidence.relations[0].sourceIds=[];
 assert.throws(()=>assessUpdate(withoutEvidence,nextReport(),published,priorReport),/evidence mismatch/);
});

test('large unexplained changes block automatic release',()=>{
 const candidate=fresh();candidate.relations=candidate.relations.slice(0,900);
 const report=nextReport();report.archiveSha256='e'.repeat(64);report.relations=900;
 assert.throws(()=>assessUpdate(candidate,report,published,priorReport),/material change|data loss/);
 const corrupted=nextReport();corrupted.conflictingNames=999;
 assert.throws(()=>assessUpdate(fresh(),corrupted,published,priorReport),/identity-name disagreements/);
});

test('only metadata is refreshed for an unchanged initial archive',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pm-ocp-publish-'));
 try{
  const candidatePath=path.join(dir,'candidate.json'),reportPath=path.join(dir,'report.json');
  const outputPath=path.join(dir,'published.json'),outputReportPath=path.join(dir,'published-report.json');
  await Promise.all([
   fs.copyFile('data/ocp-2025.json',candidatePath),
   fs.copyFile('data/ocp-2025-report.json',reportPath),
   fs.copyFile('data/ocp-2025.json',outputPath),
   fs.copyFile('data/ocp-2025-report.json',outputReportPath)
  ]);
  const original=await fs.readFile(outputPath,'utf8');
  const opts={candidatePath,reportPath,outputPath,outputReportPath};
  assert.equal((await stageFiles(opts)).action,'report-only');
  assert.equal(await fs.readFile(outputPath,'utf8'),original);
  assert.equal((await stageFiles(opts)).action,'none');
  const out=JSON.parse(await fs.readFile(outputReportPath,'utf8'));
  assert.equal(out.publicationMode,'automatic');
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
