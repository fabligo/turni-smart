# 0006 — Una sola conversazione per volta tocca il codice

*21 agosto 2026*

## Contesto

Il progetto e' stato sviluppato da piu' conversazioni in parallelo. Misura della
sessione del 21 agosto: **13 PR, 4 con conflitti di merge** — una su tre. Tutti
negli stessi file: `DepotReturnsPanel.jsx` (toccato 5 volte), `depotReturns.js`
(4), `parserOrari.js` (3), `styles.css` (3).

Un merge e' stato committato **con i marcatori di conflitto ancora dentro**. Se
ne e' accorto solo `npm run check`.

La causa e' strutturale: tutto passa da `App.jsx` e da tre o quattro moduli di
utilita'. Il parallelismo rende quando le aree non si toccano; qui si toccano
quasi sempre.

## Decisione

Una sola conversazione per volta tocca il codice dell'applicazione.

Una seconda va bene per il lavoro che **non** tocca il codice: leggere
documenti, raccogliere paline e capolinea, esaminare PDF. Se proprio servono due
conversazioni sul codice, devono avere **file disgiunti**, dichiarati in
`stato.md` prima di cominciare.

## Conseguenze

- `docs/stato.md` va letto all'inizio e aggiornato alla fine di ogni sessione.
- Il contesto di una conversazione lunga si accorcia comunque: le decisioni si
  scrivono **qui**, non si tengono in chat.
