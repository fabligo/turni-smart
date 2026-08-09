# Turni Smart - istruzioni operative

## Prima di cominciare

Leggi `docs/registro-progetto.md`. Ripercorre tutta la storia del progetto,
dal primo commit del 26 maggio 2026 in poi, e contiene il contesto che questi
vincoli non dicono: da dove vengono i dati dei posti cambio e quali sono
verificati sul campo, quali difetti sono gia' stati trovati e come, cosa e'
rimasto in sospeso, e quali dati non vanno dedotti per nessun motivo.

## Progetto

- React 18 con Vite 6, applicazione statica e mobile-first.
- I PDF e lo storico utente vengono elaborati e salvati nel browser.
- GitHub `main` e' la fonte di produzione.
- Le modifiche devono usare branch temporanei `codex/<descrizione>`.

## Comandi

```bash
npm ci
npm run dev
npm run check
```

`npm run check` deve passare prima di ogni commit: esegue lint, test,
controllo anti-segreti e build completa. GitHub Actions esegue inoltre
`npm run audit` con accesso alla rete per verificare le dipendenze.

## Vincoli

- Non modificare il comportamento dei parser Preconoscenza e Orari senza test mirati.
- Non cambiare classificazioni GTT, sviluppo turni o calendario per lavori infrastrutturali.
- Non introdurre API esterne o chiavi nel frontend.
- Non usare variabili `VITE_*` per segreti: vengono incluse nel sito pubblico.
- Non committare `.env`, chiavi SSH, token, certificati o bundle `dist`.
- Conservare la base Vite `/turni-smart/` per GitHub Pages.
- Non cambiare il percorso `sw.js` ne' il prefisso delle cache `turni-smart-`:
  `public/reset-cache.html` e la rimozione delle versioni vecchie ci contano.
- Non far ricaricare la app da sola quando arriva una versione nuova: il
  ricambio lo comanda l'utente. Il perche' sta in `docs/registro-progetto.md`
  sezione 13.

## Pubblicazione

Le pull request verso `main` vengono verificate da GitHub Actions. Il merge su
`main` avvia automaticamente il deploy Pages; non modificare direttamente
branch o artefatti generati di deploy.
