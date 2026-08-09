# La sveglia dei turni del mattino

L'app calcola le sveglie di tutto il periodo e le mette in calendario in un
colpo solo. Perché suonino come **sveglie vere** — a telefono silenziato, sopra
il Full Immersion Sonno — serve una scorciatoia di iPhone, da costruire una
volta sola. Questa pagina spiega perché, e come.

## Perché non basta l'app

Su iPhone **nessuna app può creare una sveglia dell'Orologio**. Non è una
mancanza di questo progetto: il sistema non lo permette a nessuno, e fino a
iOS 26 non c'era proprio un modo (§ "Se un giorno diventa app nativa").

La differenza conta, e alle quattro del mattino conta molto:

|  | Avviso del calendario | Sveglia dell'Orologio |
|---|---|---|
| Telefono silenziato | **non suona** | suona |
| Full Immersion Sonno | può essere filtrato | passa sopra |
| Ripetizione / snooze | no | sì |

Quindi il lavoro è diviso. **L'app** decide quali turni richiedono la sveglia e
a che ora deve suonare — è la parte che richiede di sapere cos'è un turno, ed è
coperta dai test. **La scorciatoia** fa una cosa sola e stupida: legge l'evento
di domani e ne ricava una sveglia. Non sa niente di GTT, quindi non si rompe
quando cambia qualcosa nei turni.

## Passo 1 — Un calendario dedicato

In **Calendario → Calendari → Aggiungi calendario**, creane uno chiamato
`Sveglie`.

Serve perché la scorciatoia possa dire "guarda solo qui". Senza, dovrebbe
filtrare per titolo, che funziona ma è più fragile.

## Passo 2 — Impostare le sveglie dall'app

Nella app: **Periodo → Sveglie del mattino**.

Il riquadro elenca ogni turno che attacca prima delle 06:00, con l'ora della
sveglia — un'ora prima dell'attacco. **Leggi l'elenco prima di premere**: è il
controllo. Un giorno di troppo significa un telefono che suona alle tre in un
riposo; uno mancante significa un turno perso.

Premi **Imposta le sveglie**, e quando iPhone chiede in quale calendario
aggiungerle, scegli `Sveglie`.

Da rifare a ogni nuova Preconoscenza, insieme all'aggiunta dei turni al
calendario.

## Passo 3 — L'automazione (una volta sola)

In **Comandi Rapidi → Automazione → Nuova automazione → Ora del giorno**:
ogni giorno alle **21:00**, con **Esegui immediatamente** (senza chiedere
conferma, altrimenti serve un tocco ogni sera e la sveglia salta la sera che te
ne dimentichi).

I passaggi:

1. **Trova eventi del calendario** — filtri: *Calendario* è `Sveglie`, *Data di
   inizio* è *domani*
2. **Se** il risultato *ha qualche valore*:
3. → **Ottieni la data di inizio** dal primo evento
4. → **Crea sveglia** a quell'ora, etichetta `TURNO`, ripetizione **mai**

Prima del punto 4 conviene aggiungere la pulizia della sveglia del giorno
prima, altrimenti se ne accumula una per notte: le azioni dell'Orologio
permettono di cercare le sveglie e agire su quella con l'etichetta `TURNO`.

I nomi esatti delle azioni cambiano un po' fra versioni di iOS, quindi
aspettati di doverli cercare a occhio invece di trovarli scritti identici.

## Passo 4 — Provarla prima di fidarsi

Non aspettare la prima mattina vera. Esegui la scorciatoia a mano un pomeriggio
in cui il giorno dopo hai un turno del mattino, e controlla che in **Orologio**
compaia la sveglia all'ora giusta. Se non compare, il punto che sbaglia quasi
sempre è il filtro del calendario al passo 3.

## Cosa succede senza la scorciatoia

Gli eventi in calendario avvisano comunque all'ora della sveglia: ogni evento
porta il suo promemoria a `TRIGGER:-PT0M`, cioè all'istante esatto. È **meglio
di niente e peggio di una sveglia** — vale per un turno delle 07:00, non per
uno delle 04:00 a telefono silenziato. L'app lo dice anche a schermo, sotto
l'elenco: non è una cosa da scoprire sul campo.

## I limiti, detti prima

- **Prima delle 06:00.** La soglia è quella che l'app usa già per suggerire la
  sveglia nella card del turno (`EARLY_START_MINUTES` in
  `src/utils/shiftTiming.js`). Un turno che attacca alle 06:15 non entra
  nell'elenco: se serve anche quello, si alza la soglia in un punto solo.
- **Un'ora prima.** Il suggerimento mostrato nella card del turno usa invece 75
  minuti. Sono due numeri diversi perché rispondono a due domande diverse — un
  consiglio a schermo e un orario che suona — e stanno entrambi scritti nel
  codice, non dedotti.
- **La categoria non c'entra.** L'elenco guarda **l'ora d'attacco**, non il
  numero del turno. Un 100 è "Ripresa unica mattino" per l'Accordo, ma anche un
  T2R 001-049 attacca alle 04:00, e chi lo fa deve alzarsi uguale.
- **Il titolo è un contratto.** La scorciatoia trova gli eventi per calendario;
  se qualcuno li filtra per titolo, quel titolo (`Sveglia turno <linea>
  <numero>`, in `WAKE_EVENT_PREFIX`) non si tocca. Cambiarlo fa smettere di
  trovare gli eventi **in silenzio**.

## Se un giorno diventa app nativa

Da iOS 26 esiste **AlarmKit**: un'app può programmare sveglie vere da sé, senza
calendario né scorciatoie in mezzo. Richiede però un'app nativa (Capacitor più
un plugin Swift scritto a mano), l'iscrizione da 99 €/anno e iPhone su iOS 26.

È il motivo più solido per fare quel passo — molto più dell'icona sulla Home.
Ma ha senso valutarlo solo dopo aver visto se questa strada regge: se la
scorciatoia funziona per un paio di mesi, AlarmKit è un lusso.
