// Diagnose public ANAC catalog mirrors, without downloading or importing records.
const urls=[
 "https://data.europa.eu/api/hub/search/datasets/aggiudicazioni",
 "https://data.europa.eu/api/hub/repo/datasets/aggiudicazioni",
 "https://data.europa.eu/api/hub/search/datasets/cig-2025",
 "https://www.dati.gov.it/opendata/api/3/action/package_show?id=aggiudicazioni",
 "https://data.europa.eu/data/datasets/aggiudicazioni?locale=it"
];
for(const url of urls){
 try{
   const res=await fetch(url,{headers:{'Accept':'application/json, application/ld+json, text/html;q=0.5','User-Agent':'PowerMap/0.5 (+https://github.com/Jer1choEU/power_map)'},redirect:'manual',signal:AbortSignal.timeout(12000)});
   const text=await res.text();
   console.log(JSON.stringify({url,status:res.status,contentType:res.headers.get('content-type'),bytes:text.length,snippet:text.replace(/\s+/g,' ').slice(0,220)}));
   if(res.ok && url.includes('/api/hub/search/datasets/')){
     const dataset=JSON.parse(text).result;
     console.log(JSON.stringify({dataset:url,keys:Object.keys(dataset),candidateArrays:Object.entries(dataset).filter(([k,v])=>/distrib|resource/i.test(k)).map(([key,v])=>({key,type:Array.isArray(v)?'array':typeof v,length:Array.isArray(v)?v.length:undefined,first:Array.isArray(v)?JSON.stringify(v[0]).slice(0,1600):JSON.stringify(v).slice(0,1600)}))}));
   }
 }catch(err){console.log(JSON.stringify({url,error:String(err)}))}
}
