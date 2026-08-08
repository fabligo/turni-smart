# Turni Smart - istruzioni operative

## Prima di cominciare

Leggi `docs/registro-interventi-2026-08.md`. E' il registro dei lavori di
agosto 2026 (PR #19-#39) e contiene il contesto che questi vincoli non dicono:
da dove vengono i dati dei posti cambio e quali sono verificati sul campo,
quali difetti sono gia' stati trovati e come, cosa e' rimasto in sospeso, e
quali dati non vanno dedotti per nessun motivo.

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

## Pubblicazione

Le pull request verso `main` vengono verificate da GitHub Actions. Il merge su
`main` avvia automaticamente il deploy Pages; non modificare direttamente
branch o artefatti generati di deploy.
