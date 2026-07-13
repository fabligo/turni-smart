# Turni Smart - GTT

Web app per la gestione dei turni GTT, deposito Gerbido.

## Funzionalita

- Preconoscenza: carica il PDF mensile e consulta i turni per data
- Orari Linee: carica il PDF del deposito per lo sviluppo completo dei turni
- Calendario mensile: vista a griglia con tap per dettaglio
- Ballottaggio: incolla il turno assegnato direttamente nella card
- Condivisione: calendario, WhatsApp e copia turno
- Storico: i documenti caricati restano memorizzati nel browser

## Sviluppo

```bash
npm ci
npm run dev
```

Controllo completo prima di una pull request:

```bash
npm run check
```

## Pubblicazione

`main` e il repository GitHub sono la fonte ufficiale del progetto. Ogni pull
request esegue lint, test, controllo anti-segreti e build. Dopo il merge su
`main`, GitHub Actions pubblica automaticamente GitHub Pages.

```text
https://trailpress.github.io/turni-smart/
```

Il deploy non richiede il Mac acceso, chiavi SSH locali o comandi manuali.
Per il flusso remoto e l'uso da iPhone consulta
[`docs/cloud-workflow.md`](docs/cloud-workflow.md).

Per una verifica locale della versione di produzione:

```bash
npm run build
npm run preview
```
