# Architettura — dove metto le mani

React 18 con Vite 6. Applicazione statica, mobile-first, pubblicata su GitHub
Pages. **Tutto avviene nel browser**: i PDF vengono letti li', i dati restano in
`localStorage`, nessuna chiamata a servizi esterni.

---

## Dove metto le mani per fare X

| Devo... | File |
|---|---|
| cambiare come si legge il PDF dei turni mensili | `src/parserPreconoscenza.js` |
| cambiare come si leggono gli sviluppi turno | `src/parserOrari.js` |
| toccare i rientri (lettura dal grafico) | `src/parserRientri.js` |
| toccare la ricerca dei rientri | `src/utils/depotReturns.js` |
| toccare le uscite dal deposito | `src/utils/depotDepartures.js` |
| aggiungere una palina o un posto cambio | `src/constants/changePoints.js` + `gttPaline.js` |
| cambiare come si chiamano i turni | `src/constants/shiftClassification.js` |
| cambiare cosa si vede nei Rientri | `src/components/DepotReturnsPanel.jsx` |
| cambiare cosa si vede nelle Uscite | `src/components/DepotDeparturesPanel.jsx` |
| cambiare la scheda di un turno | `src/components/ShiftCard.jsx` |
| toccare salvataggio e ripristino | `src/storage.js` |
| capire perche' un PDF non viene letto | `src/utils/orariDiagnostics.js` + `?diag=orari` |

---

## I moduli

### Il nucleo

| File | Cosa fa |
|---|---|
| `src/App.jsx` | Stato dell'applicazione e composizione delle viste. **Passa tutto di qui**: e' il file piu' conteso. |
| `src/parserPreconoscenza.js` | Legge il PDF dei turni mensili. |
| `src/parserOrari.js` | Legge gli sviluppi turno. `parseOrari`, `detectGt`, `getDevSegments`. |
| `src/storage.js` | `localStorage`: preconoscenza, orari, preferenze, backup. |
| `src/analytics.js` | Statistiche del periodo. |
| `src/calendarExport.js` | Esportazione ICS. |

### Deposito

| File | Cosa fa |
|---|---|
| `src/parserRientri.js` | Legge il grafico di servizio: legenda, tempi di uscita/rientro, `U.L.`/`Entra`. Risolve i capolinea in coordinate. |
| `src/utils/depotReturns.js` | Cerca i rientri. `searchReturns`, `withDistance`. Legge **solo** le chiavi `RIENTRI …`. |
| `src/utils/depotDepartures.js` | Cerca le uscite. `searchDepartures`. |

### Dati di dominio

| File | Cosa contiene |
|---|---|
| `src/constants/changePoints.js` | I posti cambio, con le loro paline. |
| `src/constants/gttPaline.js` | Coordinate delle paline, dal GTFS. `distanceMeters`. |
| `src/constants/gttTermini.js` | 91 capolinea di 23 linee, dal GTFS. `findTerminus`. |
| `src/constants/depotGerbido.js` | Le linee del Gerbido. |
| `src/constants/shiftClassification.js` | Tipologie di turno e ballottaggi (Accordo TPL). |
| `src/constants/restCodes2026.js` | Codici di riposo. |

### Utilita'

| File | Cosa fa |
|---|---|
| `src/utils/gttLinks.js` | URL verso GTT, Google Maps, Moovit. |
| `src/utils/nearbyStops.js` | Posizione GPS e percorsi da dove si e'. |
| `src/utils/busRadar.js` | Indirizzo per aprire BusRadar dentro l'app. |
| `src/utils/clock.js` | Un solo orologio condiviso per tutta l'app. |
| `src/utils/shiftTiming.js` | Conto alla rovescia fino all'attacco, sveglie. |
| `src/utils/preconoscenzaOverview.js` | Righe da disegnare per la vista periodo. |
| `src/utils/orariDiagnostics.js` | Il referto di `?diag=orari`. |

---

## Come circolano i dati

```
PDF Preconoscenza ──▶ parserPreconoscenza ──┐
                                            ├──▶ storage ──▶ App.jsx ──▶ viste
PDF Orari ──▶ parserOrari ──┬──▶ sviluppi ──┘
                            └──▶ parserRientri ──▶ chiavi "RIENTRI …"
```

**Una cosa da sapere su `developments`.** E' l'unica mappa salvata, e contiene
due cose diverse:

- chiavi come `05 302` — gli sviluppi dei turni, dalla pagina TURNI;
- chiavi come `RIENTRI 5 LUN - VEN` — le ultime corse, dal grafico di servizio.

Il prefisso `RIENTRI ` non e' cosmetico: nessun turno puo' averlo, quindi
`getDevSegments` non le pesca per sbaglio e `searchReturns` legge solo quelle
(→ `decisioni/0001`).

**Gli orari salvati portano la versione del parser.** Una lettura fatta prima
che l'app sapesse ricavare i rientri sopravvive all'aggiornamento e non li ha:
senza quel numero l'app non saprebbe distinguerla da un PDF incompleto, e
darebbe la colpa al PDF. Sta in `RIENTRI_PARSER_VERSION`; **va alzato quando
cambia cio' che il parser ricava dalla stessa pagina**.

---

## Vincoli tecnici

- Nessuna API esterna, nessuna chiave nel frontend.
- Niente variabili `VITE_*` per segreti: finiscono nel sito pubblico.
- La base Vite resta `/turni-smart/` (serve a Pages).
- Non cambiare il percorso di `sw.js` ne' il prefisso cache `turni-smart-`:
  `public/reset-cache.html` ci conta.
- L'app **non si ricarica da sola** quando arriva una versione nuova: il
  ricambio lo comanda l'utente (→ `decisioni/0007`).
- Non cambiare `WAKE_EVENT_PREFIX`: la scorciatoia delle sveglie cerca quel
  titolo e smetterebbe di trovarlo in silenzio (→ `decisioni/0008`).

---

## Le zone fragili

**`App.jsx`** — ~1700 righe, tutto ci passa. E' il file su cui due lavori
paralleli collidono per primi.

**I due parser d'origine** — `parserPreconoscenza.js` e la parte di
`parserOrari.js` che ricostruisce gli sviluppi (`getDevSegments`,
`findExactShiftPath`, `pickBestWindowChain`) sono arrivati gia' fatti e non
hanno test propri. Non si toccano senza test mirati: e' prudenza, non pigrizia.

**`detectGt`** — classifica le pagine per tipo di servizio; se sbaglia al
confine fra due sezioni, l'errore si propaga in silenzio a tutto il documento.
Il referto `?diag=orari` esiste per questo.
