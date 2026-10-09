import fs from 'node:fs/promises';
import crypto from 'node:crypto';

// A source-specific OpenCorporates discovery adapter. Produces candidate ENTITIES only.
// No inferred relationships; licensing and entity identity must be reviewed before publication.
const token=process.env.OPENCORPORATES_API_TOKEN;
if(!token){console.error('OPENCORPORATES_API_TOKEN missing; external discovery not attempted.');process.exit(2)}
const config=JSON.parse(await fs.readFile('sources/discovery-seeds.json','utf8'));
const results=[], errors=[];
const max=Math.min(Number(process.env.MAX_COMPANIES||5),10);
for(const seed of config.companies.slice(0,max)){
  if(seed.jurisdiction_code!=='it'||!/^\\d{5,}$/.test(seed.company_number)){
    errors.push({seed,error:'Require exact Italian company number and jurisdiction; no fuzzy matching'});continue;
  }
  const endpoint='https://api.opencorporates.com/v0.4/companies/'+encodeURIComponent(seed.jurisdiction_code)+'/'+encodeURIComponent(seed.company_number);
  try{
    const response=await fetch(endpoint,{headers:{'X-API-TOKEN':token,'Accept':'application/json'},signal:AbortSignal.timeout(20000)});
    if(!response.ok){errors.push({seed,status:response.status});if([401,403,429].includes(response.status))break;continue}
    const payload=await response.json();const company=payload?.results?.company;
    if(!company?.name||!company?.company_number||company.jurisdiction_code!==seed.jurisdiction_code){errors.push({seed,error:'Invalid API response'});continue}
    results.push({id:'opencorporates:'+company.jurisdiction_code+':'+company.company_number,name:company.name,type:'impresa',description:'Candidate legal entity from OpenCorporates; human review required.',registry:{jurisdiction:company.jurisdiction_code,number:company.company_number},origin:{url:company.opencorporates_url??endpoint,asOf:company.updated_at??null},status:'unreviewed'});
  }catch(e){errors.push({seed,error:String(e)})}
}
await fs.mkdir('build',{recursive:true});
const report={generatedAt:new Date().toISOString(),provider:'OpenCorporates',mode:'discovery-only',results,errors,notice:'Candidates are not approved for publication; verify licenses, identifiers and the official registry source.'};
await fs.writeFile('build/opencorporates-candidates.json',JSON.stringify(report,null,2)+'\n');
console.log('Found '+results.length+' candidate companies; '+errors.length+' errors. No relationships generated.');
if(errors.length)console.error(JSON.stringify(errors));
