# Piano di copertura nazionale — Power Map

## Obiettivo
Costruire un grafo interrogabile di **relazioni pubblicamente documentate**, non una classifica di persone “potenti”. La completezza assoluta non è verificabile: per ogni settore misureremo soggetti rilevati, fonti coperte, data ultima verifica e relazioni senza dati sufficienti.

## Ordine di acquisizione
1. **Società quotate**: CONSOB, rapporti di corporate governance, azionariati rilevanti e incarichi degli organi sociali.
2. **Partecipazioni pubbliche**: MEF, CDP e società controllate/partecipate con fonti istituzionali.
3. **Imprese non quotate**: Registro Imprese, nel rispetto di disponibilità, licenze e costi dei dati.
4. **Istituzioni**: cariche pubbliche e organigrammi tramite open data ufficiali.
5. **Media**: titolari e partecipazioni di gruppi editoriali, dati societari e fonti AGCOM quando applicabili.
6. **Rappresentanza di interessi**: registri pubblici e trasparenza dei finanziamenti politici, con revisione manuale.
7. **Appalti e contratti pubblici**: identificativi aziende e stazioni appaltanti, separando aggiudicazioni da partecipazioni e incarichi.
8. **Unione europea**: registri istituzionali e di trasparenza disponibili.

## Ogni relazione deve registrare
- identificativo stabile di origine e destinazione;
- tipo preciso (incarico, quota, controllo, ecc.), direzione e percentuale se disponibile;
- data di osservazione **separata** dal periodo reale di validità;
- URL della fonte, editore e data di accesso;
- provenienza, versione del record, eventuale rettifica.

## Garanzie
- Non dedurre un conflitto d'interesse o un illecito dalla sola connessione.
- Mantenere il dato azionario **datato**: quote di anni differenti non sono una fotografia simultanea.
- Non aggregare omonimi automaticamente.
- Ingestione solo con autorizzazione/licenza adeguata, audit e revisione.
- Minimizzare i dati personali e prevedere rettifiche.

## Stato al 9 ottobre 2026
**Prima traccia manuale verificata:** Enel, Eni, Terna, rispettivi vertici, MEF, CDP, CDP Reti, BlackRock e Romano Minozzi. Non è ancora attivo un ingest automatico, né un database nazionale.

## Automazione successiva
- Adattatori per singola fonte → scaricamento controllato → normalizzazione → schema e controllo referenziale → rilevamento differenze → revisione → pubblicazione del grafo.
- Cronologia append-only per audit; versioni temporali anziché sovrascrittura.
- Indicatori di completezza per classe di fonte e aggiornamenti scaduti.
