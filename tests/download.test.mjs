import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {download,checkedUrl} from '../scripts/download-official.mjs';
const entry={id:'anac_test',kind:'anac',url:'https://dati.anticorruzione.it/example.csv'};
const mock=(body,extra={})=>async()=>new Response(body,{status:200,headers:{'content-type':'text/csv',...extra}});
test('allowlist rejects insecure and external hosts',()=>{
 assert.throws(()=>checkedUrl('http://dati.anticorruzione.it/data.csv'));
 assert.throws(()=>checkedUrl('https://dati.anticorruzione.it.evil.example/data.csv'));
 assert.doesNotThrow(()=>checkedUrl(entry.url));
});
test('streaming download writes bytes and matching SHA256',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pm-stream-'));
 try{
  const result=await download(entry,{directory:dir,fetcher:mock('a,b\n1,2\n')});
  assert.equal(result.bytes,8);
  assert.match(result.sha256,/^[0-9a-f]{64}$/);
  assert.equal(await fs.readFile(path.join(dir,'anac_test.csv'),'utf8'),'a,b\n1,2\n');
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('oversized stream fails and leaves no partial file',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pm-stream-'));
 try{
  await assert.rejects(download(entry,{directory:dir,fetcher:mock('this exceeds the quota'),maxBytes:5}),/limit/);
  assert.deepEqual(await fs.readdir(dir),[]);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('redirect responses rejected',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pm-stream-'));
 try{
  await assert.rejects(download(entry,{directory:dir,fetcher:async()=>new Response(null,{status:302,headers:{location:'https://example.com'}})}),/Redirect rejected/);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
