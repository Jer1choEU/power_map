# Import ANAC automatizzato: percorso OCP

## Fonte effettivamente raggiungibile

Il mirror Open Contracting Partnership espone l'archivio ANAC in formato **OCDS JSONL compresso**. La distribuzione 2025 è stata scaricata con successo da GitHub Actions (HTTP 200) e contiene stazioni appaltanti, aggiudicazioni, fornitori, identificatori, date e importi.

- Scheda dataset: https://data.open-contracting.org/en/publication/117
- Distribuzione 2025: https://fastly.data.open-contracting.org/downloads/italy_anac/4225/2025.jsonl.gz
- Licenza della raccolta: Creative Commons Attribution 4.0 (attribuire ANAC e OCP, indicare le elaborazioni)

**L'anno di archivio non è l'anno della gara:** il dataset 2025 contiene anche aggiudicazioni precedenti. Conserviamo la data dell'aggiudicazione nel campo `eventDate`, non come durata di un rapporto.

## Workflow

`.github/workflows/ocp-ingest.yml`:
1. Ogni lunedì e su avvio manuale scarica l'archivio compresso.
2. Legge il JSONL senza caricare tutto in memoria.
3. Richiede stazione appaltante e aggiudicatario identificabili con codice IT-CF di 11 cifre, data di aggiudicazione e un unico CIG riconoscibile.
4. Scarta importazioni ambigue, deduplica le relazioni, limita il lotto a 1200 collegamenti.
5. Verifica schema, riferimenti e date.
6. Carica un artefatto per revisione e tenta di creare automaticamente una PR verso `main`, senza merge automatico.

Per la creazione automatica delle PR il repository deve consentire a GitHub Actions di crearle (Settings → Actions → General → Workflow permissions). In caso contrario, il workflow può comunque produrre un artefatto verificabile.

## Copertura e limiti

L'archivio OCP consultato nel 2026 copre **2020–settembre 2025**. Non è una fonte completa per gli appalti 2026. Il lotto non è rappresentativo di tutti gli appalti: rappresenta le prime 1200 relazioni non ambigue nell'ordine dell'archivio. Il report indica record scartati e possibili anomalie. Non si identificano automaticamente persone omonime e non si deducono irregolarità da un affidamento.

I dati candidati non entrano nella mappa pubblica prima della revisione/merge. Per la copertura 2026 occorrerà un canale autorizzato che renda disponibili i record ANAC più recenti.

### Test locale
```sh
node --test tests/ocp.test.mjs
node scripts/import-ocp.mjs --year 2025 --max-relations 1200
node scripts/validate.mjs build/ocp/candidate.json
```
