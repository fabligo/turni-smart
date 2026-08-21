# 0008 — Il titolo delle sveglie e' un contratto

*12 agosto 2026 · vedi registro § 14*

## Contesto

Turni Smart propone le sveglie per i turni che attaccano presto. La scorciatoia
iOS che le crea nell'app Orologio **cerca gli eventi per titolo**.

## Decisione

`WAKE_EVENT_PREFIX` non si cambia. Se cambia, la scorciatoia smette di trovare
gli eventi **in silenzio**: nessun errore, nessuna sveglia.

La finestra d'attacco (`ALARM_WINDOW_*`, 04:00-08:30) l'ha fissata l'utente: si
cambia solo se lo chiede lui.

## Conseguenze

Il dettaglio, compreso cosa succede a chi non ha costruito la scorciatoia, e' in
`docs/registro-progetto.md` § 14 e in `docs/sveglia-automatica.md`.
