# Stato e limiti dell'automazione di Power Map

## Pipeline automatizzate

| Fonte | Workflow | Pianificazione (UTC) | Pubblicazione |
| --- | --- | --- | --- |
| ANAC/OCP, campione 2025 | `ocp-ingest.yml` | lunedì 08:15 | commit diretto a `main` dopo validazione `strict-v1` |
| ANAC/OCP, archivio 2020–2025 (+2026 quando disponibile) | `ocp-history.yml` | martedì 09:30 | commit diretto dopo controlli su sei annualità, CIG e variazioni |
| Registro per la trasparenza UE — organizzazioni italiane | `eu-register.yml` | ogni giorno 05:20 | commit diretto dopo controllo di identità, exportDate, checksum e integrità |
| OpenCorporates | `discover-corporates.yml` | solo avvio manuale | ancora discovery: richiede API token, semi identificativi verificati e verifica della licenza |
| ANAC originario | `discover-anac.yml` | lunedì 07:45 | sola scoperta metadati: ZIP originali rispondono HTTP 403 dai runner |
| Inserimenti locali revisionati | `ingest.yml` | in base al workflow configurato | candidate JSON, non modifica la mappa automaticamente |

Gli orari sono UTC, quindi variano rispetto all'ora italiana secondo l'ora legale. GitHub può ritardare l'avvio degli schedule.

## Che cosa può e non può fare senza supervisione

Le pipeline ANAC/OCP ed EU gestiscono autonomamente download, normalizzazione, validazione, blocco anomalie, deduplicazione e commit sul branch `main`. Un'esecuzione fallita non sostituisce il dataset pubblicato.

**ANAC/OCP:** l'archivio storico è campionato a un massimo di **1.200 aggiudicazioni per annualità** per evitare un frontend sovraccarico. Il numero non è rappresentativo del totale dei contratti nazionali. L'archivio OCP consultato in ottobre 2026 arriva a settembre 2025; i nuovi record relativi al 2026 entreranno solo quando OCP pubblicherà il file annuale 2026 e il controllo di disponibilità avrà esito positivo.

**UE:** vengono visualizzate soltanto le iscrizioni di organizzazioni con sede in Italia e un ID di registrazione plausibile. Le relazioni `iscrizione` **non** dimostrano influenza su un'istituzione, accordi commerciali o illeciti. L'esportazione proviene dall'endpoint ufficiale del Registro per la trasparenza e può contenere incongruenze di formato: sono previste correzioni limitate ai caratteri XML non validi e fail-closed oltre la soglia configurata.

**OpenCorporates:** senza un token fornito dall'intestatario e conformità alle condizioni di licenza non si possono usare automaticamente i dati; il solo nome di una società non è prova sufficiente di identità. È necessario attivare un canale autorizzato.

## Pubblicazione web

Il branch `main` contiene i dataset e `index.html` ne elenca automaticamente le opzioni solo quando il file JSON corrispondente è presente. La disponibilità pubblica del sito dipende dall'hosting (GitHub Pages o altro) e non è garantita da un commit GitHub.

## Diagnostica

Consultare la sezione GitHub Actions della repository. Ogni esecuzione conserva un report dei dataset acquisiti, quando possibile, e interrompe la pubblicazione in presenza di cambiamenti inattesi. I file sorgenti grezzi non vengono committati su GitHub.
