import fs from 'node:fs/promises';

// ANAC's CKAN blocks CI runner traffic with HTTP 403. Official data.europa.eu
// republishes the ANAC distributions' DCAT metadata with original URLs.
const endpoint='https://data.europa.eu/api/hub/search/datasets/';
const packages=['aggiudicazioni','aggiudicatari','cig-2025'];
const output=[];
const allowed=new Set(['dati.anticorruzione.it','www.anticorruzione.it','anticorruzione.it']);
for(const id of packages){
 try{
  const response=await fetch(endpoint+encodeURIComponent(id),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000),redirect:'manual'});
  if(!response.ok)throw Error('EU catalog HTTP '+response.status);
  const body=await response.json();
  if(body?.result?.id!==id||!Array.isArray(body.result.distributions))throw Error('Unexpected EU catalog dataset');
  const resources=body.result.distributions.flatMap(d=>{
   if(String(d?.format?.id||'').toUpperCase()!=='CSV')return [];
   const raw=d.download_url?.[0]??d.access_url?.[0];let url;
   try{url=new URL(raw)}catch{return []}
   if(url.protocol!=='https:'||!allowed.has(url.hostname))return [];
   return [{id:d.id,name:d.title?.it??d.title?.en??d.id,format:'CSV',isCsv:true,isZip:url.pathname.toLowerCase().endsWith('.zip'),url:url.href,size:d.byte_size??null,lastModified:d.modified??null,provenance:endpoint+id}];
  });
  output.push({package:id,status:'ok',resources,metadataSource:endpoint+id});
 }catch(err){output.push({package:id,status:'error',error:String(err)});console.error(id+': '+String(err))}
}
await fs.mkdir('build',{recursive:true});
await fs.writeFile('build/anac-resources.json',JSON.stringify({fetchedAt:new Date().toISOString(),catalog:'data.europa.eu (ANAC metadata mirror)',packages:output,warning:'URLs point to original ANAC files. Metadata discovery is not a download or a validation of source rows.'},null,2)+'\n');
console.log(output.map(p=>p.package+': '+p.status+(p.resources?' ('+p.resources.length+' CSV distributions)':'' )).join('\n'));
if(output.every(p=>p.status!=='ok'||!p.resources.length))process.exitCode=1;
