# Fonti e regole per Power Map

## Stato
Il prototipo visualizza ancora dati demo incorporati in `index.html`. `data/demo.json` introduce il formato strutturato che alimenterà il futuro grafo; non è ancora connesso all'interfaccia.

## Fonti candidate (da verificare prima di qualsiasi import)
- Registro delle Imprese / InfoCamere: visure, amministratori e assetti; controllare accessibilità e licenze.
- CONSOB ed emittenti quotati: comunicazioni su partecipazioni rilevanti, assetti proprietari e governance.
- Registro trasparenza UE: organizzazioni e rappresentanti di interessi.
- Camera, Senato e altre amministrazioni: incarichi istituzionali pubblicati.
- Dichiarazioni pubbliche previste dalle norme sulla trasparenza politica, quando pertinenti e riutilizzabili.

## Regole inderogabili per record reali
1. Non pubblicare una relazione senza almeno una fonte verificabile e identificabile.
2. Conservare URL, editore, data di accesso e, dove disponibile, data di pubblicazione.
3. Distinguere relazioni attive, cessate e non databili.
4. Non equiparare nomi uguali senza identificatori affidabili.
5. Non attribuire illeciti, interessi occulti o conflitti d'interesse automaticamente.
6. Gestire rettifiche, contestazioni, licenze e privacy con revisione umana.
7. Rispettare rate limit e condizioni d'uso; niente scraping indiscriminato.

## Dataset
Il file `data/schema.json` definisce lo schema JSON v1. Il comando `node scripts/validate.mjs data/demo.json` esegue controlli referenziali e di provenienza. In modalità `real`, ogni relazione deve avere almeno una fonte; si tratta comunque di validazione strutturale, non di fact-checking.

## Pubblicazione
Per pubblicare la demo GitHub Pages: Settings → Pages → Deploy from a branch → main / root. Se Pages non è abilitato nel repository, questa scelta richiede l'intervento del proprietario.
