# Turni Smart - GTT

Web app per la gestione dei turni GTT, deposito Gerbido.

## Funzionalita

- Preconoscenza: carica il PDF mensile e consulta i turni per data
- Riepilogo: tutto il periodo in una schermata, settimana per settimana, con la
  barra oraria della giornata
- Orari Linee: carica il PDF del deposito per lo sviluppo completo dei turni
- Calendario mensile: vista a griglia con tap per dettaglio
- Ballottaggio: incolla il turno assegnato direttamente nella card
- Condivisione: calendario, WhatsApp e copia turno
- Storico: i documenti caricati restano memorizzati nel browser
- Senza rete: aggiunta alla Home, la app si apre e funziona anche in deposito
  o in galleria. Quando esce una versione nuova lo dice, e ricarica al tocco

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

La storia del progetto, con l'origine dei dati dei posti cambio, i difetti
trovati e cosa resta aperto, sta in
[`docs/registro-progetto.md`](docs/registro-progetto.md).

Per una verifica locale della versione di produzione:

```bash
npm run build
npm run preview
```
