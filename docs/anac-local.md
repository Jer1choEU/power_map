# Primo import ANAC senza GitHub-hosted download

GitHub Actions scopre gli URL via **data.europa.eu**, ma ANAC attualmente blocca le richieste dei runner con HTTP 403.

## Percorso consigliato (Windows)
1. Aprire il catalogo ufficiale ANAC https://dati.anticorruzione.it oppure https://data.europa.eu/data/datasets/aggiudicazioni?locale=it
2. Scaricare tramite browser i file **aggiudicazioni CSV**, **aggiudicatari CSV** e **CIG**, mantenendo le date originali nel nome. Usare esclusivamente download consentiti dal portale. I CIG possono essere raggruppati per anno, le aggiudicazioni per mese: non sono intercambiabili.
3. Clonare la repository o scaricarne uno ZIP.
4. Eseguire nel terminale PowerShell, dalla cartella della repository:

```powershell
py -3 scripts/anac-local.py "C:\Users\NOME\Downloads\20260901-aggiudicazioni_csv.zip" "C:\Users\NOME\Downloads\20260901-aggiudicatari_csv.zip" "C:\Users\NOME\Downloads\cig_csv_2025_08.zip"
```

Modificare nomi e percorsi con quelli dei file realmente scaricati. Il comando è illustrativo: non attesta che quei tre file siano disponibili in quella posizione.

Il comando non estrae i file sul disco e non pubblica dati: controlla i percorsi degli archivi, legge le intestazioni, calcola SHA-256 e salva `build/anac-local-report.json`.

## Passaggio successivo
Dopo aver esaminato le **intestazioni reali**, creare uno schema di normalizzazione che unisca i file tramite CIG, associando solo l'aggiudicatario corretto alla stazione appaltante. Verificare la forma degli identificativi fiscali, le differenze fra date delle distribuzioni, le licenze e la provenienza delle singole informazioni.

Non pubblicare gli ZIP grezzi su GitHub; `build/` e `raw-data/` sono ignorati. Per archiviare file grandi o proprietari, usare storage privato autorizzato, non il repository Git.

## Canale a lungo termine
ANAC prevede una procedura ufficiale per richiedere estrazioni dalla BDNCP: https://www.anticorruzione.it/-/banca-dati-nazionale-contratti-pubblici

In parallelo, chiedere all'Autorità modalità consentite per accesso automatizzato ai file CSV/JSON da infrastrutture cloud.
