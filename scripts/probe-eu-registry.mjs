const url='https://ec.europa.eu/transparencyregister/public/files/ODP/download/XML/latest';
const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000),headers:{Accept:'*/*'}});
let sample='';
if(response.ok&&response.body){const reader=response.body.getReader();const first=await reader.read();if(!first.done)sample=new TextDecoder().decode(first.value).slice(0,200);await reader.cancel();}
console.log(JSON.stringify({url,status:response.status,location:response.headers.get('location'),type:response.headers.get('content-type'),length:response.headers.get('content-length'),sample}));
if(!response.ok)process.exitCode=1;
