import fs from 'node:fs/promises';
const endpoint='https://dati.anticorruzione.it/opendata/api/3/action/package_show';
const packages=['aggiudicazioni','aggiudicatari','cig-2025'];
const output=[];
const allowed=new Set(['dati.anticorruzione.it','www.anticorruzione.it','anticorruzione.it']);
for(const id of packages){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/plain, */*','Accept-Language':'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7','User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36','Referer':'https://dati.anticorruzione.it/opendata/dataset/'},body:JSON.stringify({id}),signal:controller.signal,redirect:'manual'});
  if(!response.ok)throw Error('HTTP '+response.status+' '+(await response.text()).slice(0,180));
  const body=await response.json();
  if(body.success!==true||!Array.isArray(body.result?.resources))throw Error('Invalid CKAN response');
  const resources=body.result.resources.flatMap(r=>{
   const format=String(r.format||'').toUpperCase(),raw=String(r.url||'');
   let url;try{url=new URL(raw)}catch{return []}
   if(url.protocol!=='https:'||!allowed.has(url.hostname))return [];
   const isCsv=format.includes('CSV')||/\.csv(?:$|\?)/i.test(url.pathname+url.search);
   const isZip=format.includes('ZIP')||/\.zip(?:$|\?)/i.test(url.pathname+url.search);
   if(!isCsv&&!isZip)return [];
   return [{id:r.id,name:r.name,format,isCsv,isZip,url:url.href,size:r.size??null,lastModified:r.last_modified??null}];
  });
  output.push({package:id,status:'ok',resources});
 }catch(e){console.error(id+': '+String(e));output.push({package:id,status:'error',error:String(e)})}
 finally{clearTimeout(timer)}
}
await fs.mkdir('build',{recursive:true});
await fs.writeFile('build/anac-resources.json',JSON.stringify({fetchedAt:new Date().toISOString(),catalog:endpoint,packages:output,warning:'Metadata only. URLs and licensing must be reviewed; ZIP archives require a separate safe extractor.'},null,2)+'\n');
console.log(output.map(p=>p.package+': '+p.status+(p.resources?' ('+p.resources.length+' CSV/ZIP)':'' )).join('\n'));
if(output.every(p=>p.status!=='ok'))process.exitCode=1;
