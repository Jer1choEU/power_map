import {createGunzip} from 'node:zlib';
import {Readable} from 'node:stream';
import {createInterface} from 'node:readline';
const url='https://fastly.data.open-contracting.org/downloads/italy_anac/4225/2025.jsonl.gz';
try{
 const response=await fetch(url,{signal:AbortSignal.timeout(25000),redirect:'manual'});
 console.log('HTTP '+response.status+' type '+response.headers.get('content-type')+' size '+response.headers.get('content-length'));
 if(!response.ok||!response.body)process.exit(1);
 const stream=Readable.fromWeb(response.body).pipe(createGunzip());
 const lines=createInterface({input:stream,crlfDelay:Infinity});
 for await(const line of lines){if(!line.trim())continue;const item=JSON.parse(line);console.log('ROOT '+Object.keys(item).join(','));
 console.log('SAMPLE '+JSON.stringify({ocid:item.ocid,id:item.id,tag:item.tag,buyer:item.buyer,tender:item.tender&&{id:item.tender.id,procuringEntity:item.tender.procuringEntity},awards:item.awards?.slice(0,2),parties:item.parties?.slice(0,3)}).slice(0,5000));break}
 lines.close();
}catch(e){console.error(String(e));process.exitCode=1}
