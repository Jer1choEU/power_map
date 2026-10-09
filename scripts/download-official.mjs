import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { Readable } from 'node:stream';

export const allowedHosts=new Set(['dati.anticorruzione.it','www.anticorruzione.it','anticorruzione.it','data.europa.eu','transparency-register.europa.eu']);
export function checkedUrl(value){
 const u=new URL(value);
 if(u.protocol!=='https:'||!allowedHosts.has(u.hostname)||u.username||u.password)throw Error('Unapproved download URL');
 return u;
}
export async function download(entry,{fetcher=fetch,directory='build/downloads',maxBytes=250*1024*1024}={}){
 if(!['anac','eu-transparency'].includes(entry.kind))throw Error('Unknown source kind');
 if(!/^[-a-z0-9_]+$/.test(entry.id||''))throw Error('Unsafe source ID');
 const url=checkedUrl(entry.url);
 if(!Number.isSafeInteger(maxBytes)||maxBytes<=0)throw Error('Invalid download limit');
 await fsp.mkdir(directory,{recursive:true});
 const output=path.join(directory,entry.id+'.csv'),temporary=output+'.partial';
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),120000);
 let size=0;const hash=crypto.createHash('sha256');
 try{
  const response=await fetcher(url,{redirect:'manual',signal:controller.signal,headers:{'Accept':'text/csv,application/octet-stream;q=0.8','User-Agent':'PowerMapResearch/0.2'}});
  if(response.status>=300&&response.status<400)throw Error('Redirect rejected: direct official URL required');
  if(!response.ok)throw Error('HTTP '+response.status);
  const type=response.headers.get('content-type')||'';
  if(!/(text\/csv|text\/plain|application\/csv|application\/octet-stream)/i.test(type))throw Error('Unexpected content type '+type);
  const expected=Number(response.headers.get('content-length')||0);
  if(expected>maxBytes)throw Error('Declared size exceeds limit');
  if(!response.body)throw Error('Empty response stream');
  const counter=new Transform({transform(chunk,_enc,cb){size+=chunk.length;if(size>maxBytes){cb(Error('Download exceeds byte limit'));return}hash.update(chunk);cb(null,chunk)}});
  await pipeline(Readable.fromWeb(response.body),counter,fs.createWriteStream(temporary,{flags:'wx'}));
  if(expected&&expected!==size)throw Error('Incomplete download');
  if(size===0)throw Error('Empty downloaded file');
  await fsp.rename(temporary,output);
  const meta={id:entry.id,sourceUrl:url.href,bytes:size,sha256:hash.digest('hex'),fetchedAt:new Date().toISOString(),contentType:type};
  await fsp.writeFile(output+'.meta.json',JSON.stringify(meta,null,2)+'\n');
  return meta;
 }catch(error){await fsp.rm(temporary,{force:true});throw error}finally{clearTimeout(timer)}
}
async function main(){
 const manifest=JSON.parse(await fsp.readFile('sources/downloads.json','utf8'));if(manifest.version!==1||!Array.isArray(manifest.sources))throw Error('Invalid manifest');
 let count=0;
 for(const entry of manifest.sources){if(!entry.enabled)continue;const result=await download(entry);console.log(result.id+' '+result.bytes+' bytes sha256='+result.sha256);count++}
 console.log('Completed '+count+' downloads (review-only, never auto-published).');
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname))main().catch(e=>{console.error(e);process.exitCode=1});
