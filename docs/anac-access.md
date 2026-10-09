# ANAC — accesso ai dataset e stato verificato

**Verifica eseguita su GitHub Actions il 9 ottobre 2026.**

- Il catalogo CKAN diretto di `dati.anticorruzione.it` risponde `HTTP 403` da GitHub-hosted runners.
- L'API pubblica `https://data.europa.eu/api/hub/search/datasets/aggiudicazioni` restituisce invece i metadati originali ANAC e i link alle distribuzioni.
- In questa verifica sono state individuate **8 distribuzioni CSV di aggiudicazioni**, **8 di aggiudicatari** e **13 di CIG 2025**. Non sono download: sono metadati.
- I file ZIP originali, comunque ospitati su `dati.anticorruzione.it`, rispondono anch'essi `HTTP 403` dai runner.
- Non sono stati importati nuovi dati pubblicabili nella mappa.

## Cosa fa ora la pipeline
`scripts/discover-anac.mjs` usa l'API metadata di data.europa.eu. `scripts/anac-intake.py` tenta un download diretto per dataset e, se disponibile, ispeziona soltanto l'intestazione CSV con limiti su dimensioni, redirect e ZIP. I blocchi esterni producono un artefatto e un avviso esplicito, senza mascherare la mancata acquisizione come successo dei dati.

Il workflow `.github/workflows/discover-anac.yml` parte su push pertinenti a `main`, nelle PR, su richiesta o ogni lunedì. Nessuna nuova relazione entra nella mappa senza importazione e revisione.

## Come superare il blocco **senza aggirare restrizioni**
1. Richiedere ad ANAC una modalità di acquisizione automatizzata consentita (API, accesso per IP o mirror ufficiale). La documentazione e i contatti del portale sono disponibili su https://www.anticorruzione.it/en/-/portale-dei-dati-aperti-dell-autorita-nazionale-anticorruzione
2. In alternativa, un operatore autorizzato può scaricare tramite il portale e consegnare i file a un ambiente di elaborazione controllato.
3. Prima di pubblicare relazioni occorre unire per CIG il dataset dei CIG/stazioni appaltanti e quello degli aggiudicatari. Non confondere partecipanti, aggiudicazioni e aggiudicatari.
4. Registrare URL, data, licenza, identificativi fiscali e informazioni sulla provenienza. Non inferire comportamenti illeciti dall'esistenza di contratti.

## Riprodurre la verifica
```sh
node scripts/discover-anac.mjs
python3 -m unittest discover -s tests -p 'test_anac_intake.py' -v
python3 scripts/anac-intake.py build/anac-resources.json
```

L'ultimo comando può terminare con errore di rete e salva `build/anac-intake.json` con i dettagli.
