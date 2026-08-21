# 0004 — Nessuna demo: l'app lavora solo su dati veri

*21 agosto 2026 · PR #50*

## Contesto

L'app aveva un bottone «Prova l'app con dati demo» che caricava un mese di
esempio. I numeri erano inventati, e alcuni erano inverosimili: un tratto
Cattaneo → Gerbido da 48 minuti, quando sono nove.

Il risultato non era un dettaglio estetico. A chi conosce il percorso, quelle
schede facevano sembrare **rotto il calcolo**, e hanno consumato piu' di uno
scambio a inseguire un difetto che non c'era.

> «A me la demo non mi interessa, anzi non ci deve essere. A me interessano le
> cose reali, dati veri.»

## Decisione

Nessun dato finto nell'applicazione. Rimossi `demoData.js`, il bottone,
`constants.js` (che conteneva `MOCK_SHIFT`, `MOCK_STATS`, `PERIOD_LABEL`) e i
relativi stili. L'unica strada per entrare e' la propria preconoscenza.

## Conseguenze

- Per verificare in un browser serve seminare `localStorage` con dati veri.
- Un dato di prova dentro un test e' un'altra cosa e va bene: sta in un file di
  test, non nell'app, e serve a fissare un comportamento.
