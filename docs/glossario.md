# Glossario — le parole di questo mestiere

Turni Smart parla la lingua di chi guida al deposito Gerbido. Molte parole
sembrano sinonimi e non lo sono: chiamare una cosa con il nome di un'altra ha
gia' prodotto piu' di un difetto, e nessuno di quei difetti era visibile dal
codice.

Chi tocca parser, ricerche o testi dell'interfaccia legge prima questa pagina.

---

## Posto cambio

Il punto della linea dove **i conducenti si danno il cambio**. Ha un numero di
palina, uno per senso di marcia, e l'Accordo TPL stabilisce che per ogni
linea/deposito stia **in un'unica localita' sia per l'andata sia per il
ritorno**.

Non e' un posto dove la vettura sosta. La vettura non si ferma li' piu' del
necessario: prende il conducente nuovo e riparte.

## Capolinea

Il punto dove la **vettura inverte**. E' li' che sta ferma, ed e' li' che si fa
il **recupero** — il tempo di respiro fra una corsa e la successiva, che
l'Accordo fissa in 14 minuti per le linee con percorrenza superiore ai 60
minuti.

> **Non esiste la "sosta al posto cambio".** La sosta si fa a capolinea. La
> costante che misura quell'intervallo si chiama `MAX_RECOVERY_MINUTES`, non
> `MAX_LAYOVER_MINUTES`: il nome vecchio raccontava una cosa falsa.

Un posto puo' essere entrambe le cose — Cattaneo e' capolinea della 5 e posto
cambio della 5 — ma i due ruoli restano distinti. La legenda del PDF lo dice
esplicitamente: `CATT = P.ZA CATTANEO - Posto cambio`.

## Corsa

Un singolo viaggio della vettura fra due punti della linea. Da Cattaneo al
deposito Gerbido e' **una corsa di nove minuti**.

## Ripresa

Il **periodo di guida continuato di un conducente**: attacca, guida, stacca.
Dura ore, non minuti. Un turno a ripresa unica ne ha una; un turno a due
riprese ne ha due, separate da una pausa.

> **Una riga della pagina TURNI DEL PERSONALE e' una ripresa, non una corsa.**
> `16.33 CATT R 21.58 GERB` non vuol dire "da Cattaneo al deposito in cinque
> ore e mezza": vuol dire che quel conducente prende la vettura a Cattaneo alle
> 16:33, fa su e giu' sulla linea tutto il pomeriggio, e alla fine la mette
> dentro. Confondere le due cose e' stato il difetto piu' grave del progetto
> (→ `decisioni/0001-rientri-dal-grafico-di-servizio.md`).

## Nastro

L'arco fra l'inizio della prima ripresa e la fine dell'ultima, pause comprese.
Per un turno a ripresa unica coincide con la durata guidata; per uno a due
riprese e' piu' lungo. L'Accordo lo limita a 11 ore per meta' dei turni a due
riprese e a 10 per l'altra meta'.

## Spezzone

Termine d'uso comune per una ripresa parziale. Nel codice non compare: si usano
**ripresa** e **tratto**.

## Tratto

Una riga dello sviluppo turno. A seconda della pagina del PDF puo' essere una
ripresa intera (pagina turni) o una singola corsa (grafico di servizio). Il
codice lo chiama `segment`.

## Uscita / Rientro

- **Uscita**: la vettura lascia il deposito per andare in linea.
- **Rientro**: la vettura torna in deposito a fine servizio.

I tempi di percorrenza fra deposito e capolinea stanno nella tabella **TEMPI DI
USCITA / RIENTRO** del grafico di servizio, e possono essere diversi nei due
sensi (sulla 5: Orbassano 25 minuti in uscita, 20 in rientro).

Le une e gli altri li da' **solo** il grafico di servizio. Una riga della pagina
turni comincia in deposito allo stesso modo, ma finisce dove il conducente
stacca: e' la ripresa, e vale come uscita quanto vale come rientro, cioe' niente
(→ `decisioni/0001` e `0010`).

## U.L. e I.L.

Sul grafico di servizio, per ogni vettura:

- **I.L.** — *inizio linea*: dove e quando la vettura entra in servizio dopo
  essere uscita dal deposito.
- **U.L.** — *ultima linea*: l'ultima corsa di linea prima di rientrare.

`U.L. 21.51 OSET` seguito da `Entra 21.58` significa: ultima corsa da
Settembrini alle 21:51, in deposito alle 21:58. **Sono i due dati su cui si
regge tutta la funzione Rientri.**

`Esce 04.13` seguito da `I.L. 04.22 CATT` e' la stessa cosa al contrario: lascia
il deposito alle 04:13, in linea a Cattaneo alle 04:22. **Sono i due dati su cui
si regge tutta la funzione Uscite** (→ `decisioni/0010`).

## Preconoscenza

Il PDF mensile con i turni assegnati al singolo conducente. Va emesso entro il
27 del mese. Non e' valida a Pasqua, nelle settimane di agosto, a
Natale/Capodanno e nelle festivita' infrasettimanali.

## Ballottaggio

Il sorteggio del turno per una giornata non assegnata. I codici (B00, B01, B03,
B04, B05) dicono quali tipologie di turno possono uscire, e stanno in
`src/constants/shiftClassification.js`.

## Tipologie di turno

Dall'Accordo TPL Urbano del 16/07/2025, tabella *Tipologie e caratteristiche
turni*:

| Ripresa unica | Codifica | Inizio min. | Termine max. |
|---|---|---|---|
| Mattutino | 100 | 04:00 | 13:45 |
| Intermedio | 200 | 07:16 | 17:59 |
| Pomeridiano | 300 | 11:30 | 22:00 |
| Serale | 400 | 17:15 | 02:30 |

| Due riprese | Codifica | Inizio min. | Termine max. |
|---|---|---|---|
| T2R | 001-049 | 04:00 | 16:00 |
| T2R | 050-089 | dopo 8:30 | 21:00 |
| T2RP | 090-099 | 11:30 | 21:00 |

L'Accordo **elimina la tipologia "W"** con la sua banca ore, ed esclude i turni
**900** dalla programmazione ordinaria di linea. Se compaiono, l'app li
riconosce e lo dice, invece di trattarli come categoria ignota.

## Codici di posto

I PDF GTT usano codici di **quattro lettere** — `CATT`, `OSET`, `GORX`, `NEGR`,
`GERB`. Non sono ne' fermate ne' nomi: sono identificatori interni al documento.

**La legenda della stessa pagina li traduce**, e quella traduzione va usata
sempre nell'interfaccia: chi guida non ha motivo di riconoscere `GORX`, ma
riconosce «V. Gorini».

## Palina

Il numero della singola fermata GTT, uno per senso di marcia. E' una **chiave
esatta**: la palina 307 e' una sola fermata in tutta la rete. E' il modo — e per
ora l'unico affidabile — per collegare un posto dei PDF a una posizione reale
(→ `dati.md`).
