# 0007 — L'app non si ricarica da sola

*agosto 2026 · vedi registro § 13*

## Contesto

Un service worker che si aggiorna da solo puo' ricaricare la pagina mentre la si
sta usando. Su un telefono, davanti al deposito, alle cinque del mattino, e'
esattamente cio' che non deve succedere.

## Decisione

Quando arriva una versione nuova l'app **non si ricarica da sola**: lo segnala e
il ricambio lo comanda l'utente.

Restano vincolati anche il percorso di `sw.js` e il prefisso delle cache
`turni-smart-`: `public/reset-cache.html` e la rimozione delle versioni vecchie
ci contano.

## Conseguenze

Il dettaglio completo, compreso perche' un primo tentativo era stato rimosso, e'
in `docs/registro-progetto.md` § 13.
