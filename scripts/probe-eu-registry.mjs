const urls=['https://transparency-register.europa.eu/odplastorganisationxml_en','https://data.europa.eu/data-management/store/api/data/sg/01M323JV693WY8VP2989DA0ZR2'];
for(const url of urls){
 for(const method of ['GET']){
  try{
   const response=await fetch(url,{method,redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'Accept':'*/*','User-Agent':'PowerMapResearch/0.3'}});
   let start='',bytes=0;
   if(response.body && response.ok){
    const reader=response.body.getReader();for(let i=0;i<7;i++){const next=await reader.read();if(next.done)break;bytes+=next.value.length;start+=new TextDecoder().decode(next.value);if(start.length>=1200)break}
    await reader.cancel();
   }
   console.log(JSON.stringify({url,method,status:response.status,location:response.headers.get('location'),type:response.headers.get('content-type'),length:response.headers.get('content-length'),sample:start.slice(0,1500).replace(/\n/g,' '),bytes}));
  }catch(e){console.log(JSON.stringify({url,error:String(e)}))}
 }
}
