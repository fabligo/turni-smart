# 0005 — I turni si chiamano come li chiama l'Accordo TPL

*12 agosto 2026 · PR #18*

## Contesto

La classificazione dei turni era approssimata: 090-099 finiva nel generico «2
riprese cambio», e le tipologie non portavano la codifica ufficiale.

L'Accordo «Esercizio TPL Urbano» del 16/07/2025 le fissa nella tabella
*Tipologie e caratteristiche turni*.

## Decisione

`src/constants/shiftClassification.js` segue l'Accordo:

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

L'Accordo elimina la tipologia **W** con la sua banca ore, ed esclude i turni
**900** dalla programmazione ordinaria: entrambi vengono riconosciuti e detti
per quello che sono, non trattati come categoria ignota.

## Nota su una discordanza interna al documento

La legenda della pellicola «Gigante» tiene 050-099 sotto «2 riprese cambio»,
mentre la tabella delle tipologie stacca 090-099 come **T2RP**. Vale la
tabella, che e' piu' fine. Se al deposito si usa l'altra convenzione, questa
decisione va rivista.
