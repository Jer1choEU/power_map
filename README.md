# Power Map — La rete del potere

Progetto indipendente per visualizzare **relazioni documentate** tra persone, imprese, istituzioni e media in Italia.

## Stato attuale
**MVP 0.1 / prototipo statico.** Include grafo interattivo SVG, selezione nodi e schede, ricerca, filtri per categorie e relazione, layout responsive. Tutti i dati demo sono inventati: non rappresentano persone, organizzazioni o connessioni reali.

## Avvio
Apri `index.html` in un browser. Non servono dipendenze, build o chiavi API.

## Principi del progetto
- Relazioni verificabili: ogni collegamento reale deve esporre una fonte originale e la data di consultazione.
- Relazioni temporali: validità da/a e distinzione tra storico e attuale.
- Entità disambiguate: ID stabili per omonimi e organizzazioni.
- Nessuna inferenza di illecito dalla semplice presenza di una relazione.
- Rettifiche, provenienza dei dati e aggiornamenti tracciabili.
- Raccolta nel rispetto delle condizioni d'uso delle fonti e della normativa applicabile.

## Roadmap
1. Prototipo UI statico (completato).
2. Modello dati: entità, relazioni, fonti, date, provenienza e revisioni.
3. API read-only e Cloudflare D1, dati importati da fonti ufficiali.
4. Pipeline di acquisizione con convalida e revisione delle relazioni.
5. Esplorazione per periodo, percorsi tra soggetti, zoom e grafi di grandi dimensioni.
6. Pubblicazione e metodologia trasparente.

## Tecnologie
Al momento: HTML, CSS, JavaScript e SVG nativi per un primo MVP senza infrastruttura. Per le prossime fasi si valuteranno React + TypeScript, Cytoscape.js, Cloudflare Workers e D1.

## Pubblicazione
Puoi attivare GitHub Pages da Settings → Pages, selezionando Deploy from a branch → main / root.

La mappa originale del 2007 costituisce un'ispirazione storica: questo repository non è affiliato a Beppe Grillo e non contiene i suoi dati originali.
