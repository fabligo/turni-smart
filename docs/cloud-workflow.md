# Lavorare su Turni Smart senza il Mac

Il repository GitHub e' la fonte principale. Il Mac non deve essere acceso per
modificare, verificare o pubblicare l'app.

## Da iPhone o da un altro dispositivo

1. Apri il repository `trailpress/turni-smart` su GitHub o nell'app GitHub.
2. Avvia una sessione Codex Cloud collegata al repository. In alternativa usa
   GitHub Codespaces: il dev container installa automaticamente le dipendenze.
3. Lavora su un branch temporaneo chiamato `codex/<descrizione>`.
4. Apri una pull request verso `main` e attendi il controllo verde
   `Lint, test e build`.
5. Esegui il merge. GitHub pubblica automaticamente l'app senza usare il Mac.
6. Segui lo stato da **Actions** nel repository. In caso di errore, il passaggio
   fallito mostra il motivo e il deploy non sostituisce la versione funzionante.

## Comandi dell'ambiente remoto

```bash
npm ci
npm run dev -- --host 0.0.0.0
npm run check
```

In Codex Cloud il comando di configurazione e' `npm ci`; quello di verifica e'
`npm run check`. GitHub Actions aggiunge anche l'audit delle dipendenze.

## Pubblicazione

Il workflow **Pubblica Turni Smart** parte dopo ogni merge su `main` e pubblica:

```text
https://trailpress.github.io/turni-smart/
```

In **Settings > Pages**, la sorgente deve essere **GitHub Actions**. Il workflow
usa il permesso temporaneo integrato di GitHub (`GITHUB_TOKEN`): non servono
token personali, chiavi SSH o segreti di deploy.

## Dati personali dell'app

Preconoscenze, Orari Linee, preferenze e numeri vettura restano nel browser del
dispositivo. Non vengono caricati nel repository e non si sincronizzano
automaticamente tra iPhone e altri dispositivi. Prima di cambiare telefono o
cancellare i dati del browser, usa il backup disponibile negli strumenti
dell'app e ripristinalo sul nuovo dispositivo.

## Segreti

Al momento l'app non richiede segreti runtime. Se in futuro viene aggiunto un
backend, le chiavi private devono stare nei Secrets di GitHub Actions o nelle
variabili server-side del provider. Non devono mai essere inserite in file
pubblici, JavaScript del frontend o variabili `VITE_*`.
