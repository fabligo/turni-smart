# Stato del progetto

**Questo file si legge all'inizio di ogni sessione e si aggiorna alla fine.**
E' il solo posto che dice cosa e' in corso e chi tiene cosa. Senza, due
conversazioni rifanno lo stesso lavoro in modo diverso.

*Aggiornato: 22 agosto 2026 · 229 test verdi · issue aperte: #63, #64*

## Per aprire la prossima sessione

Copiare questa riga, cambiando il numero:

> Lavora sulla issue https://github.com/trailpress/turni-smart/issues/63 —
> leggi prima AGENTS.md e docs/stato.md.

**Il collegamento per esteso, non `#62`.** Un numero da solo non dice in quale
progetto cercare, e ogni repository ha il suo `AGENTS.md`: una sessione aperta
sul repository sbagliato legge le istruzioni sbagliate, non trova la issue, e si
ferma dopo aver speso tutto il giro di avvio. E' gia' successo.

---

## Chi tiene cosa

| Area | Conversazione | Stato |
|---|---|---|
| Rientri in deposito | sessione del 22 agosto | chiusa |
| Uscite dal deposito (#62) | sessione del 21 agosto | chiusa |
| BusRadar dentro l'app | altra conversazione (PR #60) | ultima attivita' 14 agosto |
| Documentazione e processo | sessione del 21 agosto | chiusa |

Chi apre una sessione nuova aggiunge la sua riga **prima** di toccare il codice,
e la toglie quando ha finito. Vedi `decisioni/0006`.

---

## Cosa funziona

**Preconoscenza** — caricamento del PDF mensile, calendario, vista periodo,
statistiche, esportazione ICS, turni comunicati a mano, archivio per mese.

**Orari** — sviluppi turno, consultazione linee, referto diagnostico su
`?diag=orari`.

**Rientri** — letti dal grafico di servizio (`U.L.` → `Entra`), con i nomi veri
dei posti dalla legenda, la distanza da dove si e' e l'ordine di vicinanza.
Segnala quando non li puo' calcolare, distinguendo tre casi diversi. La linea
sulla scheda vale anche per M1S, M1N, CP1 e le altre che numeri non sono, e il
nome del posto non si porta piu' dietro il ruolo («C.so Maroncelli», non «C.so
Maroncelli - Capolinea Ritorno M1s»).

**Uscite** — cosa esce dal Gerbido, per fascia oraria e per posto cambio. Lette
dal grafico di servizio (`Esce` → `I.L.`), come i rientri. Ogni scheda dice
l'ora di uscita, l'ora di ingresso in linea e **quanti minuti ci mette**: sono
quelli della tabella dei tempi, non le ore di una ripresa. Senza quella pagina
lo dicono, invece di arrangiarsi.

**Turni** — classificati secondo l'Accordo TPL (100/200/300/400, T2R, T2RP).

**Sveglie** — suggerimento per i turni che attaccano presto, con scorciatoia iOS.

**Senza rete** — service worker, l'app si apre anche offline. Le versioni nuove
le mette in uso da sola, all'apertura o a schermo spento: non le chiede piu'
(→ `decisioni/0011`).

---

## Cosa resta aperto

Il lavoro sta nelle **[issue](https://github.com/trailpress/turni-smart/issues)**,
non qui: si aprono dal telefono, si leggono senza aprire una sessione, e i
modelli in `.github/ISSUE_TEMPLATE/` fanno le domande giuste subito.

Aperte adesso:

| # | | |
|---|---|---|
| [#63](https://github.com/trailpress/turni-smart/issues/63) | dati | Paline di `GCAS` e dei due posti cambio in sospeso |
| [#64](https://github.com/trailpress/turni-smart/issues/64) | debito | Le zone senza test: i due parser d'origine e `detectGt` |

Chiusa il 21 agosto: [#62](https://github.com/trailpress/turni-smart/issues/62)
— le Uscite leggevano le riprese della pagina turni (→ `decisioni/0010`).

### Limiti noti, senza issue

Cose vere ma che nessuno ha mai lamentato. Se danno fastidio, diventano issue.

- **`MERCOLEDI'`** — 17 segmenti su una pagina sola, oggi valgono come feriale
  generico: corretto ma grossolano. Domanda posta all'utente, senza risposta.
- **Le uscite non dicono la direzione ne' la vettura.** Il grafico di servizio
  dice dove la vettura entra in linea, non da che parte prosegue, e il numero
  prima di `Esce` non si distingue dalla coda della tabella dei tempi. Restano
  vuoti invece che indovinati (→ `decisioni/0010`). Se servono, il posto dove
  cercarli e' l'elenco delle corse della vettura, che oggi il parser non legge.
- **Uscite che toccano un posto cambio piu' avanti nella corsa.** Il filtro
  guarda dove la vettura entra in linea; una tappa piu' tardi nella corsa non
  compare. Nessun caso reale riportato.
- **BusRadar non legge i parametri che gli mandiamo.** Il riquadro mostra la
  mappa, ma finche' la modifica non arriva nell'altro repository non si apre
  centrato sul mezzo.
- **Il bundle e' grosso** (~700 kB js, ~2,3 MB il worker pdf.js). Mai
  affrontato perche' mai lamentato.

---

## Domande in attesa di risposta dall'utente

- La linea `MERCOLEDI'` e' una scolastica, un servizio di mercato, o altro?
- Le paline di [#63](https://github.com/trailpress/turni-smart/issues/63).

---

## Come aggiornare questo file

A fine sessione, tre righe bastano:

1. la propria riga in «Chi tiene cosa» — tolta, o aggiornata;
2. cosa e' cambiato in «Cosa funziona»;
3. le issue chiuse o aperte, nella tabella qui sopra.

Se e' stata presa una decisione che chi viene dopo non deve ridiscutere, un file
nuovo in `decisioni/`.

Questo file resta corto di proposito: e' l'unico che **ogni** sessione legge, e
ogni riga in piu' la pagano tutte.
