# Import ANAC automatizzato: percorso OCP

## Fonte effettivamente raggiungibile

Il mirror Open Contracting Partnership espone l'archivio ANAC in formato **OCDS JSONL compresso**. La distribuzione 2025 è stata scaricata con successo da GitHub Actions (HTTP 200) e contiene stazioni appaltanti, aggiudicazioni, fornitori, identificatori, date e importi.

- Scheda dataset: https://data.open-contracting.org/en/publication/117
- Collegamento stabile al download 2025: https://data.open-contracting.org/en/publication/117/download?name=2025.jsonl.gz (redirect verificato verso l'archivio su fastly.data.open-contracting.org)
- Licenza della raccolta: Creative Commons Attribution 4.0 (attribuire ANAC e OCP, indicare le elaborazioni)

**L'anno di archivio non è l'anno della gara:** il dataset 2025 contiene anche aggiudicazioni precedenti. Conserviamo la data dell'aggiudicazione nel campo `eventDate`, non come durata di un rapporto.

## Workflow

`.github/workflows/ocp-ingest.yml`:
1. Ogni lunedì e su avvio manuale scarica l'archivio compresso.
2. Legge il JSONL senza caricare tutto in memoria.
3. Richiede stazione appaltante e aggiudicatario identificabili con codice IT-CF di 11 cifre, data di aggiudicazione e un unico CIG riconoscibile.
4. Scarta importazioni ambigue, deduplica le relazioni, limita il lotto a 1200 collegamenti.
5. Verifica schema, riferimenti e date.
6. Verifica i vincoli di qualità prima della pubblicazione: fonte, SHA-256, conteggi, identità fiscali, CIG, data evento, integrità delle relazioni e assenza di grandi perdite rispetto al dataset precedente.
7. Se la sorgente è invariata non pubblica duplicati; se è nuova e supera i controlli, aggiorna direttamente `main` con un commit di GitHub Actions. Conserva l'artefatto diagnostico per 30 giorni.

Non è più necessario approvare o fare il merge delle PR per questi aggiornamenti. È richiesto il permesso GitHub Actions `contents: write` e un branch `main` che consenta i commit del workflow. Non vengono forzate le protezioni del branch: un eventuale rifiuto di `git push` fa fallire il workflow senza alterare la pubblicazione precedente.

## Copertura e limiti

L'archivio OCP consultato nel 2026 copre **2020–settembre 2025**. Non è una fonte completa per gli appalti 2026. Il lotto non è rappresentativo di tutti gli appalti: rappresenta le prime 1200 relazioni non ambigue nell'ordine dell'archivio. Il report indica record scartati e possibili anomalie. Non si identificano automaticamente persone omonime e non si deducono irregolarità da un affidamento.

I dati diventano disponibili sulla mappa dopo che il workflow ha superato i controlli e il commit è stato accettato su `main` (la pubblicazione del sito, se presente, dipende dal suo hosting). Variazioni anomale vengono **bloccate**: nessuna pubblicazione silenziosa quando cambiano in modo sostanziale i nodi o le relazioni. Per la copertura 2026 occorrerà un canale autorizzato che renda disponibili i record ANAC più recenti.

### Test locale
```sh
node --test tests/ocp.test.mjs
node scripts/import-ocp.mjs --year 2025 --max-relations 1200
node scripts/validate.mjs build/ocp/candidate.json
```

Il workflow usa il link stabile OCP per seguire le nuove versioni: controlla che il redirect rimanga HTTPS e punti al dominio/CDN e alla struttura autorizzati. Il report registra l'URL della versione effettivamente scaricata e il suo checksum SHA-256.

## Pubblicazione completamente automatica (strict-v1)

La validazione preventiva non sostituisce una verifica fattuale individuale di ogni contratto: l'import può contenere denominazioni varianti, aziende omonime o ditte individuali. Per questo vengono accettati soltanto record con identificativi fiscali di 11 cifre, CIG singolo e fonte OCP/ANAC esplicita. L'aggiornamento si interrompe se la fonte non è più quella prevista, diminuisce troppo il numero di relazioni, i rapporti precedenti cambiano significativamente, aumenta l'ambiguità delle denominazioni o si rilevano record malformati. Non si tenta il merge automatico di dati provenienti da altre fonti.

La prima esecuzione dopo l'attivazione può aggiornare solo il report di provenienza con `publicationMode: automatic` e `qualityGate: strict-v1`, senza riscrivere i 1.200 contratti storici se l'archivio SHA-256 è identico.
