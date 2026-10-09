# Importazioni ANAC e Registro Trasparenza UE

Le fonti pubblicano file in vari formati: ANAC mette a disposizione CSV/JSON di gare, partecipanti e aggiudicatari; il Registro per la trasparenza UE fornisce esportazioni XML/XLS. Questo **importatore tratta CSV pre-normalizzati**: per il Registro UE occorre convertire preventivamente l'XLS/XML in CSV conservando gli identificativi originali.

## Procedura

1. Scaricare manualmente un file da una distribuzione ufficiale, verificare condizioni di riutilizzo e colonne esatte.
2. Preparare un mapping JSON, senza dedurre nomi di colonne dal portale. `mapping.kind` deve essere `anac` o `eu-transparency`, insieme a `sourceUrl`, `observedAt`, `delimiter`, `title`, `columns`.
3. ANAC richiede `cig`, `buyerId`, `buyerName`, `supplierId`, `supplierName`. L'importatore deve ricevere **righe già associate all'aggiudicazione**, non la mera partecipazione a una gara.
4. UE richiede `registrationId` e `name`; genera **solo entità candidate**, non una relazione con un funzionario o un'istituzione.
5. Eseguire `node scripts/import-official-csv.mjs anac export.csv mapping.json` (o `eu-transparency`).
6. Revisionare il file `build/<kind>-candidate.json` prima di copiarne i record in `sources/imports/reviewed.json`; non promuovere dati in blocco senza verifica degli ID e delle fonti.

L'importatore si arresta se una riga è ambigua/incompleta, non pubblica automaticamente, e non contiene crawler o URL di download inventati. Il tipo `collaborazione` per aggiudicazioni è provvisorio: servirà estendere lo schema delle relazioni ai contratti pubblici. Per le organizzazioni EU il tipo `impresa` è provvisorio e va verificato caso per caso.

Fonti:
- https://www.anticorruzione.it/en/-/portale-dei-dati-aperti-dell-autorita-nazionale-anticorruzione
- https://data.europa.eu/data/datasets/transparency-register
