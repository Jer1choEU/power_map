import test from 'node:test';
import assert from 'node:assert/strict';
import {combineYears,availableFutureYear} from '../scripts/import-ocp-history.mjs';
import {verifyHistory} from '../scripts/stage-ocp-history.mjs';

function yearObject(year,cig){
 const buyer='institution:it-cf:12345678901',company='company:it-cf:09876543210';
 return {year,
  data:{entities:[{id:buyer,name:'Comune',type:'istituzione'},{id:company,name:'Società',type:'impresa'}],
   relations:[{id:'rel:ocp:'+cig,from:buyer,to:company,type:'aggiudicazione',label:'Aggiudicazione CIG '+cig,eventDate:'2022-02-02',validFrom:null,validTo:null,sourceIds:['source:ocp-anac']}]},
  report:{year,archiveSha256:'a'.repeat(64),rows:10000,eligibleRelations:1,relations:1}};
}
test('multi-year import combines nodes without inventing new links',()=>{
 const {data,report}=combineYears([yearObject('2020','A123456789'),yearObject('2021','B123456789')],{asOf:'2026-10-09'});
 assert.equal(data.entities.length,2);
 assert.equal(data.relations.length,2);
 assert.equal(report.yearCount,2);
 assert.match(report.archiveSetSHA256,/^[a-f0-9]{64}$/);
});
test('year collision with contradictory supplier fails closed',()=>{
 const a=yearObject('2020','A123456789'),b=yearObject('2021','B123456789');
 b.data.relations[0].id=a.data.relations[0].id;b.data.relations[0].to='company:it-cf:11111111111';
 b.data.entities.push({id:'company:it-cf:11111111111',name:'Other',type:'impresa'});
 assert.throws(()=>combineYears([a,b]),/conflicts/);
});
test('future year is only accepted when signed official CDN HEAD succeeds',async()=>{
 const redirected=async(_url,opts)=>opts.method==='HEAD'?new Response(null,{status:200}):new Response(null,{status:302,headers:{location:'https://fastly.data.open-contracting.org/downloads/italy_anac/4225/2026.jsonl.gz'}});
 assert.equal(await availableFutureYear('2026',{fetcher:redirected}),true);
 assert.equal(await availableFutureYear('2026',{fetcher:async()=>new Response(null,{status:404})}),false);
 await assert.rejects(availableFutureYear('2026',{fetcher:async()=>new Response(null,{status:302,headers:{location:'https://evil.com/file.gz'}})}),/Untrusted/);
});
test('automatic historical publication rejects missing annual identity',()=>{
 const graph={version:1,mode:'real',sources:[{url:'https://data.open-contracting.org/en/publication/117'}],entities:Array.from({length:1100},(_,i)=>({id:'company:it-cf:'+i,name:'Demo'})),relations:Array.from({length:3000},(_,i)=>({id:'rel:ocp:'+i,from:'company:it-cf:0',to:'company:it-cf:1',type:'aggiudicazione',label:'CIG ABC1234567',sourceIds:['source:ocp-anac']}))};
 const report={sourceUrl:'https://data.open-contracting.org/en/publication/117',archiveSetSHA256:'b'.repeat(64),entities:1100,relations:3000,duplicateAwards:0,years:{}};
 assert.throws(()=>verifyHistory(graph,report),/Historical year missing/);
});
