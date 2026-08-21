# 0010 — Anche le uscite vengono dal grafico di servizio

*21 agosto 2026 · issue #62*

## Contesto

Le Uscite sono state scritte l'8 agosto, prima che si scoprisse cosa sia
davvero una riga della pagina TURNI DEL PERSONALE (→ `decisioni/0001`).
Leggevano l'intera mappa `developments`, senza guardare da quale pagina un
tratto venisse: bastava che partisse dal Gerbido.

Il sospetto della issue era fondato, ed e' stato verificato prima di toccare
qualsiasi cosa. Su una giornata della 5, la riga di turno

```
05 101  5 / 1  04.48 GERB - 10.15 CATT
```

compariva come **«esce alle 04:48, a Cattaneo alle 10:15»**: un'uscita da cinque
ore e ventisette. Da Gerbido a Cattaneo sono nove minuti. Quella riga non e'
un'uscita: e' la ripresa intera del conducente della 101, che prende la vettura
in deposito e la lascia a Cattaneo a fine mattina.

E' lo stesso difetto dei rientri, sulla stessa pagina, per la stessa ragione.

## Decisione

Le uscite le danno **solo** le righe del grafico di servizio, dove ogni vettura
ha il suo `Esce` e il suo `I.L.`:

```
8   Esce 04.13   I.L. 04.22 CATT
```

`Esce` e' l'ora in cui la vettura lascia il Gerbido, `I.L.` dove e quando entra
in linea. Fra i due c'e' il trasferimento, e dura quello che la tabella **TEMPI
DI USCITA / RIENTRO** dichiara per quel posto — nove minuti per Cattaneo, sette
per Settembrini. I due dati si accoppiano come `U.L.` ed `Entra`: quando la
differenza e' quella dichiarata, la coppia e' provata.

Nella mappa `developments` stanno sotto chiavi `USCITE <linea> <servizio>`, che
nessun turno puo' avere. `searchDepartures` salta ogni altra chiave.

**Il filtro e' sulla provenienza del dato, non sulla sua misura**, come per i
rientri: una ripresa corta e un trasferimento lungo hanno la stessa faccia, e
nessuna soglia sulla durata le separa.

## Conseguenze

- Un PDF senza il grafico di servizio non permette di calcolare le uscite, e
  l'app lo dice invece di arrangiarsi con le riprese. `graphicLoaded` distingue
  «il PDF non ha quella pagina» da «non esce niente a quest'ora».
- `RIENTRI_PARSER_VERSION` sale a 2: gli Orari salvati da una versione
  precedente non hanno le uscite, e il pannello dice di ricaricare il PDF invece
  di dare la colpa al documento.
- **La direzione non c'e' piu'.** Il grafico dice dove la vettura entra in linea,
  non da che parte prosegue: prima arrivava dal tratto successivo della ripresa,
  che era il dato sbagliato. Il campo resta, vuoto, e la palina del posto cambio
  si mostra solo se una direzione c'e' — e' una per senso di marcia, e indovinare
  quale manda qualcuno dal lato sbagliato della strada.
- **Nemmeno la vettura c'e'.** Nel testo estratto il numero prima di `Esce` e' la
  vettura in una forma e la coda della tabella dei tempi in un'altra
  (`GERB - ARBA 25` seguito da `8 Esce`), e le due non si distinguono. Meglio
  nessun numero che quello di un altro mezzo: → `decisioni/0003`.
