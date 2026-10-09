import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const manifest=JSON.parse(await fs.readFile('sources/downloads.json','utf8'));
const allow=new Set(['dati.anticorruzione.it','www.anticorruzione.it','anticorruzione.it','data.europa.eu','transparency-register.europa.eu']);
await fs.mkdir('build/downloads',{recursive:true});
let completed=0;
for(const entry of manifest.sources||[]){
 if(!entry.enabled)continue;
 if(!['anac','eu-transparency'].includes(entry.kind))throw Error('Unknown kind '+entry.kind);
 let u=new URL(entry.url);
 if(u.protocol!=='https:'||!allow.has(u.hostname))throw Error('Unapproved download URL');
 if(!entry.id||!/^[-a-z0-9_]+$/.test(entry.id))throw Error('Unsafe source id');
 const response=await fetch(u,{redirect:'manual',headers:{'User-Agent':'PowerMapResearch/0.1 (+https://github.com/Jer1choEU/power_map)'},signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw Error(entry.id+' HTTP '+response.status);
 const type=response.headers.get('content-type')||'';
 if(!/(csv|text\/plain|application\/octet-stream)/i.test(type))throw Error(entry.id+' unexpected content type '+type);
 const limit=15*1024*1024;const chunks=[];let size=0;
 for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw Error(entry.id+' exceeds 15MB limit');chunks.push(chunk)}
 const buf=Buffer.concat(chunks);
 const digest=crypto.createHash('sha256').update(buf).digest('hex');
 const output=path.join('build/downloads',entry.id+'.csv');
 await fs.writeFile(output,buf);
 await fs.writeFile(output+'.meta.json',JSON.stringify({id:entry.id,sourceUrl:entry.url,bytes:size,sha256:digest,fetchedAt:new Date().toISOString()},null,2));
 console.log(entry.id+': '+size+' bytes, sha256='+digest);completed++;
}
console.log('Downloads completed: '+completed+'. No files were published.');
