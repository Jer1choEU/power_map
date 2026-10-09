import fs from 'node:fs';
const path = process.argv[2] ?? 'data/demo.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const fail = (m) => { console.error('ERRORE: ' + m); process.exitCode = 1; };
if (data.version !== 1 || !['demo', 'real'].includes(data.mode)) fail('Versione o modalità non valida');
for (const field of ['entities','relations','sources']) if (!Array.isArray(data[field])) fail(field + ' deve essere un array');
if (process.exitCode) process.exit();
const unique = (items,kind) => { const ids = items.map(x=>x.id); if(ids.some(x=>typeof x!=='string'||!x.trim()))fail(kind+': ID mancante'); if(new Set(ids).size!==ids.length)fail(kind+': ID duplicati'); return new Set(ids); };
const entities=unique(data.entities,'entities'),sources=unique(data.sources,'sources');unique(data.relations,'relations');
const datesOk = s=>s===null || (typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s);
for(const e of data.entities){if(!e.name?.trim()||!['persona','impresa','istituzione','media'].includes(e.type))fail('Entità non valida: '+e.id);}
for(const s of data.sources){if(!s.title?.trim()||!datesOk(s.accessedAt))fail('Fonte incompleta: '+s.id);try{const u=new URL(s.url);if(!['http:','https:'].includes(u.protocol))throw Error();}catch{fail('URL fonte non valido: '+s.id)}}
for(const r of data.relations){
if(!entities.has(r.from)||!entities.has(r.to))fail('Entità sconosciuta nella relazione '+r.id);
if(!['incarico','partecipazione','collaborazione','aggiudicazione'].includes(r.type))fail('Tipo non valido: '+r.id);
if(!datesOk(r.validFrom)||!datesOk(r.validTo)||r.validFrom&&r.validTo&&r.validFrom>r.validTo)fail('Periodo non valido: '+r.id);
if(!Array.isArray(r.sourceIds)||r.sourceIds.some(id=>!sources.has(id)))fail('Fonte inesistente: '+r.id);
if(data.mode==='real'&&r.sourceIds.length===0)fail('Relazione reale senza fonte: '+r.id);
}
if(!process.exitCode)console.log('OK: '+data.mode+' · '+data.entities.length+' entità · '+data.relations.length+' relazioni · '+data.sources.length+' fonti');
