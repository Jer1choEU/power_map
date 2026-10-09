const api='https://data.europa.eu/api/hub/search/datasets/transparency-register';
const response=await fetch(api,{headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(30000)});
console.log('HTTP '+response.status);
if(!response.ok)process.exit(1);
const body=(await response.json()).result;
console.log('Dataset: '+body.id+' distribution count '+(body.distributions?.length||0));
for(const d of body.distributions||[]){
 const name=d.title?.en||d.title?.it||'',format=d.format?.id||'';
 const url=d.download_url?.[0]||d.access_url?.[0];
 if(/organisation|registrant|organization/i.test(name)){
  console.log(JSON.stringify({name,format,url,issued:d.issued,modified:d.modified,byteSize:d.byte_size}).slice(0,1000));
 }
}
