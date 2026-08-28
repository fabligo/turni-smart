# 0012 — Lo sviluppo turno viene dalla pagina turni, e quando manca si dice

*28 agosto 2026 · segnalazione dell'utente: «i turni non presentano piu' lo
sviluppo nelle schede giornaliere»*

## Contesto

Le decisioni [0001](0001-rientri-dal-grafico-di-servizio.md) e
[0010](0010-uscite-dal-grafico-di-servizio.md) hanno portato rientri e uscite
dentro `developments`, sotto chiavi che nessun turno puo' avere. Il filtro pero'
era stato messo **solo dove si leggono i rientri e le uscite**. Nella direzione
opposta — chi cerca lo sviluppo di un turno — nessuno guardava le chiavi:

- `findExactShiftPath`, `completeShiftFromWindow` e il ripiego a punteggio
  facevano `Object.values(developments).flat()`, cioe' pescavano in tutto,
  trasferimenti da e per il deposito compresi;
- la pagina del grafico veniva passata **anche** al parser dei turni, che nelle
  sue righe `5 / 4 06.00 CATT A 06.35 OSET` legge un turno 4 della linea 5 —
  mentre quel 4 e' la **vettura**. Nascevano turni inventati (`05 4`), e le
  righe senza codice davanti proseguivano l'ultimo turno della pagina prima,
  perche' lo stato della tabella attraversa le pagine dello stesso servizio.

Finche' il grafico si leggeva male il danno era piccolo. Man mano che lo si e'
letto meglio (#68, #76, #79 e soprattutto #81, che ha moltiplicato per cinque i
rientri trovati) e' cresciuto con lui: sono tratti veri, della linea giusta, che
cadono dentro la finestra del turno.

## Decisione

**Lo sviluppo di un turno si costruisce solo con i tratti della pagina turni.**

1. Una pagina che produce rientri o uscite, o che porta la tabella `TEMPI DI
   USCITA / RIENTRO`, e' del grafico di servizio: la legge il parser del
   grafico, non quello dei turni, e azzera lo stato della tabella cosi' che le
   sue righe non si attacchino al turno della pagina precedente.
2. Le tre ricerche che guardavano tutta la mappa saltano le chiavi del grafico,
   con `isGraphicKey` — lo stesso filtro che gia' usavano Rientri e Uscite dalla
   loro parte.
3. Il ripiego a punteggio, che serve quando la linea e' scritta in due modi
   diversi sulle due fonti (`58` e `58/`, `05` e `5`), adesso pretende
   un'identita': **o il numero di turno combacia, o combaciano tutte e due le
   estremita' della finestra**. Prima bastavano la linea e l'ora di fine — e in
   deposito staccano tutti alla stessa ora, quindi un turno poteva prendersi lo
   sviluppo di un altro.

## E quando lo sviluppo non c'e'

E' il caso piu' frequente, ed era muto: il PDF Orari e' per linee, e una linea o
una versione che manca porta via tutti i suoi turni. La scheda diceva «Sviluppo
non disponibile. Carica il PDF Orari Deposito», cioe' chiedeva di caricare un
documento gia' caricato, e da fuori sembrava che lo sviluppo fosse sparito.

Adesso la card distingue tre casi:

| Cosa | Cosa dice |
|---|---|
| Lo sviluppo c'e' | i tratti, come prima |
| Gli Orari non sono caricati | «Carica il PDF Orari Deposito» |
| Gli Orari ci sono, quel turno no | «negli Orari Linee caricati il turno N della linea L non c'e'», piu' l'etichetta **Turno non negli Orari** |

Nel terzo caso restano gli orari della preconoscenza, che sono veri: la scheda
lo dice invece di lasciare un vuoto che si scambia per un guasto.

## Conseguenze

- `summarizeDevelopments` gia' escludeva le chiavi del grafico; adesso lo fa
  anche il conto «N turni Orari» del pannello Documenti, che le contava.
- Un turno che il PDF Orari non ha resta senza sviluppo, e va bene cosi':
  → [`0003`](0003-nessun-dato-inventato.md). Quali siano lo dice l'elenco «turni
  senza sviluppo» in **Altro › Documenti**.
- `tests/parserOrari.test.js` copre queste regole. E' anche il primo test del
  parser dei turni, che finora non ne aveva
  ([#64](https://github.com/trailpress/turni-smart/issues/64)).
