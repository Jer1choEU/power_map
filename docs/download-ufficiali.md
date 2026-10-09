# Download controllato delle fonti ufficiali

`scripts/download-official.mjs` scarica soltanto URL HTTPS esplicitamente registrati in `sources/downloads.json`. Sono ammessi i domini ANAC / data.europa.eu / Registro Trasparenza UE, senza redirect automatici. Ogni file è limitato a 15 MB, con timeout di 45 secondi, checksum SHA-256 e metadati di provenienza.

## Attivazione

1. Individuare sul portale ufficiale una **distribuzione diretta CSV** aggiornata, verificarne formato, licenza e dimensione. Il link alla pagina del catalogo non è un URL diretto al CSV.
2. Aggiungere nel manifest una voce `{"id":"anac-mese-verificato","kind":"anac","url":"https://<URL CSV REALE>","enabled":true}` usando il vero URL. Il manifest è intenzionalmente vuoto finché non esiste un indirizzo verificato.
3. Avviare manualmente il workflow **Official downloads (review only)**.
4. Esaminare l'artefatto e il checksum, poi identificare correttamente le intestazioni, produrre un mapping e usare `scripts/import-official-csv.mjs`.
5. Revisionare entità e relazioni; solo dopo integrare nel dataset approvato.

L'archivio del Registro Trasparenza UE è distribuito principalmente come XML/XLS: **il downloader CSV non lo supporta ancora direttamente**. Non si deve rinominare un file XLS/XML in .csv. I file ANAC possono essere molto più grandi del limite impostato; per quelli serve uno streaming con limiti e processamento specifico, anziché aumentare indiscriminatamente la dimensione.

## Test
`node --test tests/*.test.mjs`: verifica dataset di partenza, blocco delle righe ANAC errate e assenza di collegamenti inventati dal registro UE. CI configurata ma esito da verificare nei run di GitHub Actions.

## Limitazioni
Questa funzionalità **non recupera ancora automaticamente i dataset reali** perché non sono stati configurati URL di distribuzione verificati. Nessun nuovo soggetto entra nella mappa e non viene fatta alcuna pubblicazione automatica. I report sono solo artefatti temporanei.
