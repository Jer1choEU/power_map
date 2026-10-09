const url='https://data.europa.eu/api/hub/search/datasets/aggiudicazioni';
const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
if(!response.ok)throw Error('EU metadata HTTP '+response.status);
const data=(await response.json()).result;
console.log('EU distributions: '+data.distributions.length);
for(const d of data.distributions.filter(d=>String(d.title?.it||d.title?.en||'').includes('20260601')).slice(0,3)){
 console.log(JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k])=>/url|format|title|issued|modified|access|download/i.test(k)))).slice(0,3500));
}
