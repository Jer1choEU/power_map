const url='https://data.europa.eu/api/hub/search/datasets/aggiudicazioni';
const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
if(!response.ok)throw Error('EU metadata HTTP '+response.status);
const obj=await response.json();const data=obj.result;
console.log('EU dataset keys: '+Object.keys(data).join(', '));
for(const [key,value] of Object.entries(data)){
 if(!/distrib|resource|download/i.test(key))continue;
 console.log(JSON.stringify({key,type:Array.isArray(value)?'array':typeof value,length:Array.isArray(value)?value.length:undefined,sample:String(JSON.stringify(Array.isArray(value)?value[0]:value)).slice(0,1200)}));
}
