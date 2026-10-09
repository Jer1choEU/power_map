import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyEuPublication} from '../scripts/stage-eu-register.mjs';
const SRC='https://ec.europa.eu/transparencyregister/public/files/ODP/download/XML/latest';
const make=()=>{
 const registry='eu-tr:institution:transparency-register';
 const entities=[{id:registry,name:'Registro per la trasparenza UE',type:'istituzione'}];
 const relations=[];
 for(let i=0;i<220;i++){
  const id='eu-tr:organization:'+String(i).padStart(12,'0')+'-01';
  entities.push({id,name:'Organizzazione '+i,type:'organizzazione'});
  relations.push({id:'rel:eu-tr:'+String(i),from:id,to:registry,type:'iscrizione',validFrom:'2020-01-01',validTo:null,eventDate:'2020-01-01',sourceIds:['source:eu-transparency'],label:'Iscrizione'});
 }
 const data={version:1,mode:'real',entities,relations,sources:[{id:'source:eu-transparency',url:SRC}]};
 const report={sourceUrl:SRC,archiveSha256:'a'.repeat(64),exportDate:'2026-10-09',globalRegistrations:17000,italianOrganizations:220,rejectedItalianRecords:0};
 return {data,report};
};
test('first validated export is ready for automatic publication',()=>{
 const {data,report}=make();assert.equal(verifyEuPublication(data,report),'publish');
});
test('unchanged digest does not publish duplicates',()=>{
 const {data,report}=make();assert.equal(verifyEuPublication(data,report,data,report),'none');
});
test('source switch, identity churn and missing proof stop publication',()=>{
 const {data,report}=make();
 assert.throws(()=>verifyEuPublication(data,{...report,sourceUrl:'https://example.org'}),/Unexpected official/);
 const altered=structuredClone(data);altered.relations[0].to='eu-tr:organization:123';
 assert.throws(()=>verifyEuPublication(altered,report),/Bad registration relation|Broken registration/);
 const churn=structuredClone(data);churn.relations=churn.relations.slice(0,180);const meta={...report,italianOrganizations:180};
 assert.throws(()=>verifyEuPublication(churn,meta,data,report),/Unexpected Italian|Registration count|drop|churn/);
});
