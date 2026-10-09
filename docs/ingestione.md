# Acquisizione Power Map

`npm` e dipendenze esterne non sono richiesti. Esegui:

```sh
node scripts/ingest.mjs
node scripts/validate.mjs build/candidate.json
node scripts/coverage.mjs build/candidate.json
```

## Come funziona
- `sources/registry.json` elenca gli adattatori esplicitamente abilitati.
- `sources/imports/reviewed.json` contiene esclusivamente record revisionati e normalizzati (inizialmente vuoto).
- `scripts/ingest.mjs` unisce il dataset pubblico esistente ai nuovi record, blocca conflitti di identificatori e riferimenti mancanti, deduplica per ID.
- GitHub Actions esegue settimanalmente la procedura e archivia **solo un candidato**: non committa e non pubblica automaticamente dati.
- Un revisore deve verificare fonti, date, licenze e identità prima di promuovere il file candidato a `data/italia-2026.json`.

## Limiti attuali
**Non esistono ancora crawler né connettori live**: la schedulazione processa i file di import revisionati presenti nella repo. Senza nuove acquisizioni la rete non cresce. Nuovi adattatori HTTP devono essere implementati per le singole fonti verificando condizioni d'uso, sicurezza e qualità dei dati. L'ID duplicato con contenuti discordanti ferma il processo: non si sovrascrivono dati in silenzio.

## Copertura progressiva
Società quotate e relativi organi → partecipazioni rilevanti → partecipate pubbliche → imprese → istituzioni → gruppi editoriali → appalti. Tenere separati dato osservato e inferenze; nessun grafo implica automaticamente illeciti.
