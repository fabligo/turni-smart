# 0009 — Il lavoro arriva dalle issue, e una sessione ne fa una

*21 agosto 2026*

## Contesto

Le richieste arrivavano in chat, spesso vaghe. «La funzione Rientro non sembra
funzionare» ha richiesto **una quindicina di scambi** prima di arrivare alla
causa: il parser leggeva la pagina sbagliata del PDF.

Il costo di quei quindici scambi non e' stato solo tempo. Ogni giro di
esplorazione consuma contesto; quando il contesto si riempie la sessione viene
riassunta, e dopo il riassunto si ricostruisce cio' che si sapeva gia' — file
riletti, fatti ritrovati, a volte decisioni ridiscusse.

Questa sessione e' stata riassunta una volta, e dopo ho riletto file che avevo
gia' letto.

## Decisione

**Le richieste diventano issue**, con i modelli in `.github/ISSUE_TEMPLATE/`.
Il campo che conta e' «cosa dovrebbe dire, e come lo sai»: e' quello che
trasforma quindici giri in uno.

**Ogni sessione e' un ramo e una PR.** Puo' chiudere piu' di una issue se
stanno nella stessa area: la regola non e' contarle, e' accorgersi di quando il
contesto smette di aiutare e comincia a pesare. Il segnale e' rileggere file
gia' letti, o richiedere cose gia' dette.

Il backlog vive nelle issue, non nei documenti: `stato.md` le elenca ma non le
duplica. Duplicare vuol dire tenere allineate due cose, e prima o poi una delle
due mente.

## Nota, 21 agosto

La prima formulazione diceva «una sessione = una issue», e l'utente ha chiesto
se dovesse davvero aprire una chat per ogni cosa. Applicata alla lettera sarebbe
stata burocrazia: il criterio non e' contare le issue, e' riconoscere quando il
contesto ha smesso di aiutare.

## Conseguenze

- Ogni pagina in `docs/` dichiara quanto costa leggerla, e `AGENTS.md` dice
  quale aprire per quale compito. Nessuno legge tutto.
- `stato.md` resta corto di proposito: e' l'unico che ogni sessione legge.
- Il registro storico non e' piu' la porta d'ingresso: si apre su una sezione
  quando serve il perche' di qualcosa.
