const endpoint='https://zenodo.org/api/records/11452793';
try{
 const response=await fetch(endpoint,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
 console.log('Zenodo HTTP '+response.status);
 if(!response.ok)throw Error('Request failed');
 const record=await response.json();
 console.log(JSON.stringify({id:record.id,title:record.metadata?.title,license:record.metadata?.rights??record.metadata?.license,fileCount:(record.files||[]).length,files:(record.files||[]).filter(x=>/aggiudicazioni_csv|aggiudicatari_csv|stazioni-appaltanti_csv/.test(x.key||'')).map(x=>({key:x.key,size:x.size,checksum:x.checksum,url:x.links?.self}))}));
}catch(e){console.log('Zenodo error: '+String(e));process.exitCode=1}
