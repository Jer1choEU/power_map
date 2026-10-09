import fs from 'node:fs/promises';
const endpoint='https://dati.anticorruzione.it/opendata/api/3/action/package_show';
const packages=['aggiudicazioni','aggiudicatari','cig-2025'];
const output=[];
for(const id of packages){
 try{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
  let response;
  try{response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','User-Agent':'PowerMapResearch/0.3'},body:JSON.stringify({id}),signal:controller.signal,redirect:'error'});}finally{clearTimeout(timer)}
  if(!response.ok)throw Error('HTTP '+response.status);
  const body=await response.json();
  if(body.success!==true||!Array.isArray(body.result?.resources))throw Error('Invalid CKAN response');
  const resources=body.result.resources.filter(r=>String(r.format).toLowerCase()==='csv').map(r=>({id:r.id,name:r.name,url:r.url,size:r.size??null,lastModified:r.last_modified??null}));
  output.push({package:id,status:'ok',resources});
 }catch(e){output.push({package:id,status:'error',error:String(e)})}
}
await fs.mkdir('build',{recursive:true});
await fs.writeFile('build/anac-resources.json',JSON.stringify({fetchedAt:new Date().toISOString(),catalog:endpoint,packages:output,warning:'Resource URLs are discovered metadata, not approved for automatic download. Validate URL, format, licensing and columns.'},null,2)+'\n');
console.log(output.map(p=>p.package+': '+p.status+(p.resources?' ('+p.resources.length+' CSV)':'' )).join('\n'));
if(output.every(p=>p.status!=='ok'))process.exitCode=1;
