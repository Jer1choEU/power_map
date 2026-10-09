import fs from 'node:fs';
const path=process.argv[2]??'data/italia-2026.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
const adj=new Map(data.entities.map(e=>[e.id,new Set()]));
for(const r of data.relations){adj.get(r.from)?.add(r.to);adj.get(r.to)?.add(r.from)}
const byId=new Map(data.entities.map(e=>[e.id,e]));
const scored=[...adj].map(([id,near])=>({id,name:byId.get(id).name,degree:near.size,neighbors:[...near].map(x=>byId.get(x).name)})).sort((a,b)=>b.degree-a.degree||a.name.localeCompare(b.name,'it'));
const components=[];const visited=new Set();
for(const [id] of adj){if(visited.has(id))continue;const queue=[id],component=[];visited.add(id);for(let i=0;i<queue.length;i++){const at=queue[i];component.push(at);for(const to of adj.get(at)){if(!visited.has(to)){visited.add(to);queue.push(to)}}}components.push(component)}
const md=['# Power Map — report copertura','','Dataset: '+path,'Soggetti: '+data.entities.length,'Relazioni: '+data.relations.length,'Fonti: '+data.sources.length,'Componenti isolate: '+components.length,'','## Maggior numero di connessioni','',...scored.slice(0,15).map((x,i)=>String(i+1)+'. '+x.name+' — '+x.degree+' collegamenti'),'','## Componenti','',...components.sort((a,b)=>b.length-a.length).map((c,i)=>'- Componente '+(i+1)+': '+c.length+' soggetti'),'','> Il numero di connessioni non è una misura di influenza, controllo o responsabilità. È soltanto il numero di relazioni censite in questo dataset.'];
console.log(md.join('\n'));
