# ANAC: scoperta risorse e avvio dei primi lotti

## Catalogo
Il workflow `Discover ANAC resources` interroga via CKAN `package_show` per `aggiudicazioni`, `aggiudicatari` e `cig-2025`. Salva un artefatto `anac-resources.json` con i soli URL HTTPS appartenenti ai domini ufficiali consentiti, includendo CSV e ZIP e i metadati resi disponibili. In caso di errore il pacchetto è marcato `error`; non viene interpretato come dataset vuoto.

## Procedura per una prima acquisizione effettiva
1. Eseguire il workflow di scoperta e leggere l'artefatto. Accertare che il pacchetto `aggiudicazioni` esista e abbia risorse CSV/ZIP.
2. Verificare licenza, dimensioni, delimitatori, intestazioni e se ogni risorsa contiene aggiudicazioni oppure soli CIG.
3. Se la distribuzione è CSV diretto HTTPS e il suo dominio è autorizzato, aggiungere l'URL verificato a `sources/downloads.json` ed eseguire `Official downloads (review only)`.
4. Se è ZIP, **non usarlo come CSV**: predisporre una decompressione isolata con limiti di grandezza e verifiche sui percorsi prima dell'import.
5. Normalizzare le righe di **aggiudicazione** con CIG e identificativi verificabili di stazione appaltante e aggiudicatario. Non trattare semplici concorrenti come aggiudicatari.
6. Eseguire importazione, validazione, analisi dei duplicati e revisione delle fonti. Soltanto i lotti revisionati devono essere promossi nel dataset.
7. Misurare la copertura pubblicata (CIG unici, identificativi aziendali verificati, periodi di riferimento, righe rifiutate).

## Limiti
La ricerca delle distribuzioni è configurata, ma **non è stata ancora eseguita con un risultato verificato in GitHub Actions**. Gli URL effettivi dei download sono da confermare e il parser ZIP non è ancora implementato. Nessun nuovo record ANAC è stato inserito nel dataset pubblico.

Riferimenti:
- https://data.europa.eu/data/datasets/aggiudicazioni?locale=it
- https://docs.ckan.org/en/latest/api/
