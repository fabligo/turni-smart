# 0003 — Nessun dato inventato: meglio un vuoto che un valore sbagliato

*agosto 2026 · principio fondativo*

## Contesto

In una fase iniziale i posti cambio avevano coordinate scritte a occhio, e
comparivano nomi come «piazza Tasso» e «Cairoli», che per quelle linee non
esistono. L'utente le ha smontate:

> «Piazza Tasso non esiste e Cairoli nemmeno, bisogna rivedere tutto il sistema
> di coordinate dei posti cambio.»

Il punto non e' l'imbarazzo. Un posto cambio sbagliato manda un conducente alla
fermata sbagliata alle quattro del mattino, e nessuno se ne accorge finche' non
e' tardi.

## Decisione

Ogni valore deve poter rispondere a **da dove viene**. Se la risposta e'
«sembrava giusto», il valore non entra.

Quando un dato non si puo' verificare, si lascia **vuoto**. L'interfaccia deve
saper funzionare senza: un rientro senza posizione compare lo stesso, solo senza
distanza.

## Conseguenze

- Un test verifica che nella tabella dei posti cambio non ci siano coordinate
  scritte a mano.
- Dichiarare che un dato **non esiste** e' esso stesso un'affermazione da
  verificare: il posto cambio di corso Siracusa risultava assente dal GTFS, ma
  c'era da sempre e si chiama `MONFALCONE`.
- Vale anche per le parole: un'etichetta come «si inserisce a Cattaneo» su un
  tratto di cinque ore era una promessa che il dato non sostiene.
