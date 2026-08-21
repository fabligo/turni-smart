# 0002 — Le coordinate vengono dal numero di palina, mai dal nome

*21 agosto 2026 · PR #56, #58*

## Contesto

Per ordinare i rientri per vicinanza servono le coordinate dei posti da cui
partono. I PDF danno codici di quattro lettere e, nella legenda, un nome.

Il confronto per nome sull'intera rete non regge. Provato sulla linea 5:
`ORBASSANO - STRADA TORINO` produceva cinque candidati fra le 97 fermate della
linea, fra cui una `ORBASSANO` a due chilometri. `L.GO ORBASSANO` produceva gli
stessi cinque, indistinguibili.

Il numero di palina invece e' una **chiave esatta**: la palina 307 e' una sola
fermata in tutta la rete.

## Decisione

Le coordinate si ricavano cercando il **numero di palina** nel GTFS di GTT. Mai
per somiglianza di nome.

Per i capolinea del grafico, che un numero non ce l'hanno, si usa il nome della
legenda **ristretto ai capolinea di quella linea** — due o quattro candidati,
non settemila fermate — e si valida contro i tempi della tabella TEMPI DI
USCITA / RIENTRO. Un accostamento che richiedesse piu' di 60 km/h viene
scartato.

Un pareggio non si scioglie tirando a sorte: `findTerminus` torna `null`.

## Conseguenze

- Ogni palina in `gttPaline.js` porta il nome GTT accanto, come prova che la
  ricerca e' andata a segno.
- Un posto senza palina e senza nome risolvibile resta **senza posizione**, e il
  rientro compare comunque, solo senza distanza.
- Aggiungere un posto nuovo vuol dire procurarsi il numero di palina, non
  cercare un nome somigliante.
