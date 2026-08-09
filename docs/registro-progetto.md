# Turni Smart — registro del progetto

Documento di consegna. Serve a chi riprende il lavoro su questa app: una
persona, o un altro agente (Codex, o chi per esso). Racconta **cosa esiste,
perché è fatto così, e cosa è rimasto aperto**, con abbastanza dettaglio da
non dover ricostruire il ragionamento da capo.

Copre **tutta la storia del progetto**: dal primo commit del 26 maggio 2026
alla PR #40 dell'8 agosto 2026. Il lavoro è stato svolto in sessioni diverse,
con strumenti diversi; qui è messo insieme.

Non sostituisce `AGENTS.md`, che resta la fonte dei vincoli operativi. Qui c'è
il contesto che i vincoli non dicono.

---

## 1. Il contesto, in breve

L'app serve a **un autista GTT di Torino, in servizio al deposito Gerbido**.
Non è un prodotto per molti utenti: è uno strumento di lavoro per una persona
che conosce le linee meglio di chiunque scriva il codice.

Ne discendono tre conseguenze che hanno guidato ogni scelta:

1. **Il committente è la fonte autorevole sul dominio.** Le paline, i posti
   cambio, quali linee girano nei festivi: queste cose le sa lui, non si
   deducono e non si cercano su internet. Quando un dato manca, va chiesto o
   lasciato mancante — mai indovinato.
2. **Un dato sbagliato manda un autista alla fermata sbagliata alle quattro
   del mattino**, e nessuno se ne accorge finché non è tardi. Il costo di un
   errore non è un bug report: è un turno perso.
3. **La verifica vera avviene sul telefono di chi la usa.** Più volte un
   difetto ha superato tutti i test ed è stato trovato solo perché l'utente
   stava usando la app. Ne parla la sezione 9.

### I dati

L'app non ha backend. Legge due PDF, nel browser:

- **Preconoscenza** — i turni mensili della persona. Contiene nome e
  matricola: è un dato personale.
- **Orari Linee / Orari Deposito** — gli sviluppi turno del deposito. Nessun
  dato personale, solo tabelle di corse. Il file reale è di ~13 MB, 154 pagine.

Tutto resta in `localStorage`. Niente rete, niente chiavi, niente API esterne
(vincolo di `AGENTS.md`).

### Lo stack

React 18 + Vite 6, applicazione statica mobile-first, pubblicata su GitHub
Pages con base `/turni-smart/`. `pdfjs-dist` per la lettura dei PDF, nel
browser. Nessuna dipendenza di runtime oltre a React e pdf.js.

---

## 2. Da dove viene questo repository

**La storia git non parte dall'inizio dell'app.** Il primo commit,
`7f8a70d` del 26 maggio 2026 — *"Apply GTT tourism visual style"* — importa in
un colpo solo **44 file e 12.231 righe**: `App.jsx` già a 1.459 righe,
`parserOrari.js` a 809, `parserPreconoscenza.js` a 606, `styles.css` a 3.766.

Vuol dire che l'app funzionava già, ed era stata sviluppata altrove. **Chi
riprende non troverà in git il ragionamento dietro i due parser**: sono
arrivati fatti. È la parte del codice di cui si sa meno, ed è la ragione del
vincolo in `AGENTS.md` — *non modificare il comportamento dei parser senza
test mirati*.

Al primo commit **non c'era un solo test**. La cartella `tests/` è nata dopo,
con il modulo dei rientri.

---

## 3. Le fasi del progetto

### Fase 1 — Aspetto e calendario (26-31 maggio 2026)

Restyle visivo in stile GTT, vista mese del calendario, icone delle linee.

Compare il legame con i dati GTT reali: link ai passaggi GTT dalle card
(`b5742e8`), risoluzione delle fermate per linea e direzione (`74af64c`), e la
prima mappatura dei **posti cambio verso i codici fermata GTT** (`476fd92`) —
il seme di `src/constants/changePoints.js`, che allora era di 10 righe e oggi
è il file più delicato del repository (§ 6).

Nella stessa fase: numero vettura per singolo tratto, e gli strumenti di
sicurezza della memoria locale (backup, ripristino, pulizia) in
`AdvancedTools`.

Il calendario impara i codici di riposo: giorni TA inclusi, riposi in verde,
giorno corrente evidenziato.

### Fase 2 — Condivisione e turni sospesi (8-11 giugno 2026)

Promemoria calendario per i turni (esportazione ICS, `src/calendarExport.js`).

Voce di **turno sospeso** in preconoscenza: il caso di chi ha il turno
comunicato ma non ancora a ruolino, con la voce che sparisce quando la
preconoscenza è completa.

Condivisione della preconoscenza in forma leggibile, poi come **immagine
infografica**, ballottaggi inclusi.

### Fase 3 — Vetture e archivio (29 giugno - 1 luglio 2026)

Più numeri vettura per tratto, orari di inserimento della vettura, correzione
della navigazione nell'archivio mensile e del riconoscimento linea.

Primo deploy Pages con chiave SSH (`282d44f`).

### Fase 4 — Rientri in deposito e passaggio al cloud (12-13 luglio 2026)

`bb5508c` introduce la **ricerca dei rientri**: dato un posto cambio, quali
mezzi passano di lì e riportano al Gerbido.

`4399833` sostituisce il deploy con chiave SSH con un **flusso interamente
cloud**: PR verificata da GitHub Actions, merge su `main` che avvia il deploy
Pages. Da qui il Mac non serve più, ed è il flusso ancora in uso (§ 5).

### Fase 5 — I rientri diventano una funzione vera (5-6 agosto 2026, PR #6-#13)

La correzione più significativa è `3482e91`:

> *La ricerca rientri considerava solo i tratti che terminano a GERB, cioè il
> rientro di fine turno. Un mezzo che transita dal posto cambio e raggiunge il
> deposito dopo uno o più tratti non veniva mai proposto, proprio il caso di
> chi smonta in linea e vuole rientrare subito.*

Nasce `src/utils/depotReturns.js`, che dal tratto in transito segue la catena
dei tratti successivi dello stesso mezzo (`buildChain`, massimo 4 tratti,
soste fino a 20 minuti, viaggio fino a 90). È il modulo che, mesi dopo,
conterrà la risposta giusta a un difetto delle uscite senza che nessuno se ne
accorgesse (§ 9).

Nella stessa fase: dock a una riga scorrevole come una tab bar iOS, nuovo set
di icone, bottone "Trova" con barra di ricerca, e — decisione ricorrente in
questo progetto — **i motivi del "nessun rientro"**, perché un elenco vuoto
senza spiegazione è indistinguibile da una funzione rotta.

Poi la geolocalizzazione entra (#10), esce (#9), rientra in forma diversa: il
link si prepara prima e si apre con un tocco a parte, perché aprire una scheda
in attesa del GPS la lascia bianca su iOS (#11).

#13 toglie la scelta del posto cambio dai rientri: a fine turno il punto di
partenza è **dove sei adesso**, non un codice scelto da un elenco.

### Fase 6 — Moovit e nomi veri (6 agosto 2026, PR #14-#18)

#14 e #15 portano il percorso verso il deposito **dentro l'app Moovit**: lo
schema `moovit://` consegna all'app installata, mentre un indirizzo `https`
resta una pagina web (§ 6).

#16 sostituisce i nomi indovinati dei posti cambio con **quelli che GTT stampa
sulla fermata**, presi dalle pagine arrivi di `gtt.to.it`.

#17 registra un fatto di dominio: **la linea 2 non è più del Gerbido**, e con
lei sparisce il posto cambio Pitagora.

#18 riscrive la classificazione dei turni secondo l'**Accordo "Esercizio TPL
Urbano" del 16/07/2025** (§ 7).

### Fase 7 — Revisione interfaccia, uscite dal deposito, caccia ai conti (7-8 agosto 2026, PR #19-#40)

L'ultima sessione, la più densa: 22 PR in due giorni. Ha una sezione sua (§ 4).

---

## 4. La sessione del 7-8 agosto in dettaglio (PR #19-#40)

Partita da una richiesta di revisione GUI/UX, poi implementata per blocchi.

### Blocco 1 — Interfaccia e correzioni strutturali (#19-#23)

| PR | Intervento |
|----|-----------|
| #19 | **Riepilogo**: tutto il periodo caricato in una schermata, una riga per giorno raggruppata per settimana, con la barra della giornata dalle 04:00 alle 04:00 (la giornata di un turnista non comincia a mezzanotte). Nuovi `src/utils/preconoscenzaOverview.js` e `src/components/PreconoscenzaOverview.jsx`. |
| #20 | Il Riepilogo era la settima voce del dock e su telefono restava fuori schermo. Spostato sotto la casella di ricerca. |
| #21 | Dock riorganizzato in cinque sezioni (`oggi`, `calendario`, `periodo`, `linee`, `altro`) con alias per le preferenze salvate; il calendario dice a che ora si attacca; nuova icona. |
| #22 | Conto alla rovescia animato davvero, con `src/utils/clock.js`. |
| #23 | Favicon aggiornata anche per chi aveva già visitato il sito. |

**Difetti corretti in questo blocco:**

- **Chiave React duplicata** nella riga dei giorni della settimana del
  calendario (`['L','M','M',…]`) → `key={index}`.
- **Testo bianco su bianco**: il token `--muted` (#d8e6f5) usato sulla pagina
  chiara dava 1.25:1. Introdotta una **seconda famiglia di token**,
  `--on-page-*`, per le superfici chiare, distinta da `--text`/`--muted` che
  restano per le card blu. È un'architettura a due superfici: chi tocca i
  colori deve sapere quale famiglia sta usando.
- **Dock che galleggiava a metà contenuto**: era `position: sticky; bottom:
  10px` → `position: fixed` più safe-area insets.
- **`public/sw.js` non era mai stato registrato**, e `main.jsx` de-registra i
  service worker. Erano stati dati all'utente due consigli sbagliati basati su
  quella falsa premessa ("il service worker è a v6, butta la cache"). Il file
  è stato cancellato, la de-registrazione conservata con un commento che
  spiega perché resta.
- **`%BASE_URL%` raddoppiato in sviluppo** (`/turni-smart/turni-smart/...`,
  che restituiva il fallback SPA con `200 text/html`) → usare solo `/`
  iniziale. La build di produzione era già corretta.

### Blocco 2 — Icona dell'app e favicon

L'utente ha fornito un'immagine. Generazione degli asset con
`scripts/build-app-icons.py`: `apple-touch-icon.png`, `bus-icon-maskable.png`
(rispetta il cerchio di sicurezza all'80% per la maschera Android),
`favicon-64.png`, `bus-front-icon.webp`, `bus-front-mark.webp` (il bus bianco
in linea nelle card, #28).

Due artefatti risolti: sfondo ricostruito a griglia (→ fit polinomiale di
terzo grado) e alone blu rettangolare rimpicciolendo il bus (→ soglia alpha a
0.08 con riscalatura).

### Blocco 3 — Posti cambio e Moovit (#24-#30)

| PR | Intervento |
|----|-----------|
| #24 | Il bottone "Qui vicino" diventa un percorso **dal deposito al posto cambio dentro l'app Moovit**. |
| #25 | Filadelfia riceve le sue paline; la posizione del deposito è confermata dal campo. |
| #26 | L'app dice quale versione stai guardando (`__BUILD_STAMP__` in `vite.config.js`). |
| #27 | I posti cambio dei festivi: Omero e Siracusa. |
| #28 | Il bus bianco nelle card, e le paline di Omero. |
| #29 | **"Vai al cambio" era invisibile**: era stato sepolto in un `<details>` chiuso da una modifica precedente della stessa sessione. Promosso accanto a "Aggiungi al calendario", con la destinazione nell'etichetta. |
| #30 | Un posto cambio fuori tabella ora **lo dice** (`.action-note--missing`) invece di far sparire il bottone in silenzio. |

### Blocco 4 — Uscite dal deposito (#31-#35)

Funzione nuova, richiesta dall'utente: lo specchio dei rientri.
`src/utils/depotDepartures.js` + `src/components/DepotDeparturesPanel.jsx`.

La funzione è stata **ridefinita tre volte dall'utente**, ed è istruttivo:

1. #31 — prima versione: uscite da un orario in avanti.
2. #32 — «mi interessa l'uscita **in prossimità** dell'orario, anche pochi
   minuti **prima**, e **la direzione** che quella linea prende, perché a
   seconda della direzione cambia la mia destinazione». La finestra diventa
   simmetrica con scarto **firmato** (negativo = parte prima), e ogni uscita
   porta la direzione.
3. #33 — «voglio sapere **l'intera giornata** di uscite per potermi
   pianificare». Aggiunta l'opzione "tutta la giornata" e il raggruppamento
   per fascia oraria.
4. #35 — «la select che dice andata o ritorno **non ha molto senso**: se
   voglio andare in un posto cambio specifico è meglio che io possa
   selezionarlo». Il filtro per direzione è stato **sostituito** da un
   selettore di posto cambio ("Vado a"), popolato solo con le destinazioni
   che negli orari caricati hanno davvero un'uscita. La direzione resta
   scritta su ogni riga, perché serve a leggerla, non a filtrare.

**La direzione dell'uscita** non è sul tratto che esce dal deposito: negli
sviluppi quel tratto è segnato `-`, perché è il trasferimento. Si prende dal
primo tratto orientato della stessa corsa (`findRunDirection`), ed è lo stesso
mezzo che prosegue. Quando arriva da lì, la card lo dichiara.

### Blocco 5 — I conti sbagliati delle uscite (#36-#39)

Il capitolo più importante per chi riprende: **§ 9**.

### Blocco 6 — Documentazione (#40)

Questo documento.

---

## 5. Come si lavora qui

Metodo seguito nella sessione di agosto, senza eccezioni:

1. **Implementare**, con test mirati sui moduli puri (`node --test`).
2. **Verificare in un browser vero** con Playwright, profilo iPhone 13:
   contrasto, target da 44px, assenza di scorrimento orizzontale, e il testo
   che appare davvero a schermo.
3. `npm run check` — lint, test, controllo anti-segreti, build. Deve passare.
4. **PR → CI → merge** (squash) → il deploy Pages parte da solo sul push a
   `main`, e va atteso e verificato.
5. **Riferire il risultato** all'utente, compreso ciò che non è stato fatto.

### Note pratiche

- **Playwright**: Chromium è già installato in
  `/opt/pw-browsers/chromium` (è un symlink all'eseguibile). Non lanciare
  `playwright install`. Serve `executablePath: '/opt/pw-browsers/chromium'`.
- **Attenzione a `page.clock.install()`**: sostituisce `setInterval`, quindi
  non si può usare per contare i timer attivi. Quella garanzia sta in un test
  Node con un DOM finto (`tests/clock.test.js`).
- **Anteprima di un componente isolato**: creare un `.html` + `.jsx`
  temporanei nella radice (Vite li serve), poi **cancellarli**. Non committarli.
- **Il PDF degli Orari non va mai committato.** Il repository è pubblico e
  serve Pages: metterci dentro gli orari GTT li pubblicherebbe. `.gitignore`
  non copre i PDF, quindi va fatta attenzione a mano.
- **Branch**: `AGENTS.md` prescrive `codex/<descrizione>`. Il lavoro di agosto
  è stato fatto su `claude/webapp-ui-ux-improvements-vdbyz7` per istruzione
  esterna. Chi riprende segua la convenzione del repository.

### Stile dei commit e dei commenti

Dalla fase 5 in poi i messaggi di commit e i commenti nel codice sono in
italiano, discorsivi, e spiegano **perché** una cosa è così, non cosa fa.
Esempio dal codice:

```js
/* Un tratto che dal deposito torna al deposito non porta a nessun
   posto cambio: negli orari sono le righe che riassumono lo sviluppo
   intero, non un'uscita da prendere. */
```

Non è vezzo: molte scelte qui dipendono da fatti di dominio che il codice da
solo non racconta, e che si perdono in fretta. I commit anteriori sono in
inglese e telegrafici — si vede il cambio di passo a `3482e91`.

---

## 6. La tabella dei posti cambio

`src/constants/changePoints.js` — **15 codici**. È il dato più delicato del
repository.

### Da dove viene ogni campo

- `label` e `address`: dalle pagine arrivi di `gtt.to.it`, una per palina.
  Sono i nomi che GTT stampa sulla fermata, **non espansioni indovinate del
  codice**.
- `stops`: numeri di palina **raccolti sul campo** da chi guida quelle linee.
- `position`: coordinate della palina di andata, prese **per numero** dal
  GTFS statico GTT (dataset dell'altro repository dell'utente,
  `trailpress/BusRadar`, `frontend/public/assets/gtfs-network.json`, 7035
  fermate, generato 2026-07-12). Il numero è già verificato sul campo, quindi
  il punto non è indovinato: è quello che GTT pubblica per quella fermata.

### Stato

| Codice | Nome | Paline A/R | Note |
|--------|------|-----------|------|
| GERB | Deposito Gerbido | — | Posizione in `gttLinks.js`, non qui |
| CATT | Cattaneo | 307 / 308 | |
| ORSN | Santa Rita | 317 / 318 | |
| ORSA | Orbassano | 728 / 729 | **Sulla linea 62 le direzioni sono invertite** (`stopsByLine`) |
| FILA | Filadelfia | 1665 / 1666 | R confermata dal campo; A dedotta (stesso nome, 42 m, sono le due fermate della 58) |
| LING | Stazione Lingotto | 2604 / 2603 | |
| BENS | Bengasi Ovest | 3628 / 1023 | |
| OSET | Settembrini | 299 / 300 | |
| CAIO | Caio Mario | 1119 / 1119 | Palina unica |
| BABE | Barbera | 1169 / 1170 | Stesso posto di BARB |
| BARB | Portofino | 1169 / 1170 | Stesso posto di BABE, altro codice GTT |
| CLGR | Gramsci Nord | 969 / 968 | |
| OMRO | Omero | 309 / 310 | Festivi |
| SIRA | Siracusa | 711 / 128 | La R si chiama MONFALCONE, non SIRACUSA |
| CLMA | Macedonia | 853 / 852 | |

### Tre cose da non "correggere"

1. **BABE e BARB sono lo stesso posto** — via Gaspero Barbera — con due
   codici diversi negli orari GTT e due civici diversi nell'anagrafica (34 e
   18). L'utente ha confermato che **a valere sono le paline, non il civico**.
   I civici restano com'erano perché sono etichette.
2. **A Siracusa la palina di ritorno si chiama MONFALCONE.** Le due paline
   (711 andata, 128 ritorno) stanno all'incrocio fra corso Siracusa e via
   Monfalcone, a una sessantina di metri, e GTT le ha chiamate con le due vie
   diverse. Per mesi la coppia è rimasta incompleta perché la ricerca nel
   GTFS era stata fatta **per nome** invece che per linea e prossimità: la
   seconda fermata c'era sempre stata. Vedi § 6.1.
3. **Nei festivi la linea 58 non gira**: il suo percorso lo copre la **linea
   12 modificata**, ed è lì che compaiono i due posti cambio di piazza Omero.
   La palina davanti al civico 274 di corso Orbassano è il **ritorno**, quella
   di fronte l'**andata** verso il centro (lo dice chi guida la linea; i
   tracciati lo confermano con 15 m di scarto).

### 6.1 Come si verifica una palina contro il GTFS

Procedura usata per Omero e per Siracusa, e da riusare quando arriva un
numero nuovo. Il dataset è `frontend/public/assets/gtfs-network.json` e
`gtfs-stop-times.json` nel repository `trailpress/BusRadar` (pubblico, si
clona senza credenziali).

**Attenzione a due trappole**, entrambe già costate un errore:

1. **`code` e `id` sono spazi diversi.** Il numero di palina che l'autista
   legge sulla fermata è il campo `code` di `gtfs-network.json`. Le corse in
   `gtfs-stop-times.json` invece elencano le fermate per `id`. Confrontarli
   direttamente non dà errore: dà risultati sbagliati in silenzio, perché
   entrambi gli spazi contengono gli stessi numeri riferiti a fermate diverse.
   Passare sempre per `stops.find(s => s.code === n).id`.
2. **Non cercare per nome.** Due paline che si fronteggiano possono avere
   nomi diversi, perché GTT le intitola alle vie che si incrociano lì. È
   esattamente il caso di Siracusa (711 SIRACUSA / 128 MONFALCONE). Cercare
   per linea e per prossimità, non per etichetta.

**Come si conferma il verso**: si contano le corse della linea che toccano
ciascuna palina e si guarda il loro capolinea. Per la 56 la palina 711 sta su
340 corse dirette a TABACCHI CAP — verso il centro, cioè l'andata — e la 128
su 346 dirette a TIRRENO CAP e Parco Ruffini, cioè il ritorno. Coincide con
quello che dice chi guida la linea, e le due conferme indipendenti valgono
più di ciascuna da sola.

### Il deposito

`DEPOT_POSITION = { lat: 45.03941, lng: 7.59166 }` in
`src/utils/gttLinks.js`. È la **palina 693, GORINI CAP, capolinea 74**,
confermata dall'utente: «il deposito Gerbido si trova a pochi metri dalla
palina 693».

### Il deep link Moovit

Lo schema `moovit://directions?...` consegna all'app installata; un indirizzo
`https` resta una pagina web che il telefono apre come tale. Servono
`orig_lat/orig_lon/orig_name/dest_lat/dest_lon/dest_name/auto_run`, cioè
**coordinate, non indirizzi** — è la ragione per cui `position` conta più di
`address`. Il ripiego web è `https://moovitapp.com/`. L'utente ha confermato
dal telefono che il bottone apre davvero l'app.

### Un dato che è stato rifiutato

Il campo `directionId` del GTFS **non è** andata/ritorno. Verificato incrociando
le coppie A/R già confermate: coincide in **8 casi su 16**, cioè quanto il
caso. Non è stato usato. La direzione va chiesta a chi guida.

---

## 7. Le altre costanti di dominio

### Linee del Gerbido — `src/constants/depotGerbido.js`

29 linee: `5 5B 10 12 14 17 17B 33 34 35 36 36_MERC 38 39 43 44 55 58 58B 62
63 63B 71 74 76 132 CP1 M1N M1S`.

L'elenco **cambia nel tempo**: la PR #17 ha tolto la linea 2 quando è passata
a un altro deposito. Non è una costante fisica, è una fotografia da aggiornare
quando l'utente lo segnala.

### Classificazione dei turni — `src/constants/shiftClassification.js`

Dall'**Accordo "Esercizio TPL Urbano" del 16/07/2025**, tabella "Tipologie e
caratteristiche turni" (allegato pag. 2/2) per codifica e finestre orarie, e
legenda della pellicola "Gigante" (pag. 1/2) per nomi delle fasce e
ballottaggi.

| Codifica | Numeri | Fascia | Inizio min. | Fine max. |
|----------|--------|--------|-------------|-----------|
| T2R | 001-049 | 2 riprese dispari | 04:00 | 16:00 |
| T2R | 050-089 | 2 riprese cambio | 08:30 | 21:00 |
| T2RP | 090-099 | 2 riprese pomeridiano | 11:30 | 21:00 |
| 100 | 100-199 | Ripresa unica mattino | 04:00 | 13:45 |
| 200 | 200-299 | Ripresa unica intermedia | 07:16 | 17:59 |
| 300 | 300-399 | Ripresa unica pomeridiana | 11:30 | 22:00 |
| 400 | 400-499 | Ripresa unica serale | 17:15 | 02:30 |
| W | — | **Tipologia soppressa** dall'accordo | | |
| 900 | 900-999 | Fuori programmazione ordinaria di linea | | |

`earliestStart`/`latestEnd` servono a **riconoscere un turno che non torna**,
non a riscriverne l'orario. I turni 900, se compaiono, la scheda lo dice
invece di trattarli come normali.

**Nessun turno comincia di notte.** L'attacco più presto previsto è alle
**04:00** (T2R e 100). I serali *finiscono* alle 02:30 ma non cominciano lì:
un turno che scavalca la mezzanotte è normale, uno che parte a mezzanotte non
esiste. Vale la pena saperlo prima di costruire un caso di prova su un orario
notturno — è già successo, e l'ha corretto chi guida.

I **ballottaggi** (`BALLOTTAGGI`, da B00 in poi) descrivono quali tipologie
un ballottaggio comprende.

### Codici di riposo — `src/constants/restCodes2026.js`

Riposi ufficiali dell'anno, usati dal calendario.

---

## 8. Mappa dei moduli

### Il nucleo, arrivato già fatto (§ 2)

| File | Cosa fa |
|------|---------|
| `src/parserPreconoscenza.js` | Legge il PDF dei turni mensili. |
| `src/parserOrari.js` | Legge gli sviluppi turno del deposito. Contiene `parseOrari`, `detectGt` (§ 10), `getDevSegments` e la ricostruzione dello sviluppo di un turno. |
| `src/analytics.js` | Statistiche del periodo. |
| `src/calendarExport.js` | Esportazione ICS. |
| `src/storage.js` | `localStorage`: preconoscenza, orari, preferenze, backup. |

### Aggiunti nel tempo

| File | Cosa fa |
|------|---------|
| `src/utils/depotReturns.js` | Rientri in deposito. Segue la catena dei tratti dello stesso mezzo fino al Gerbido. Esporta le primitive condivise: `DEPOT_CODE`, `normalizePlace`, `getServiceType`, **`getServiceTypes`**, `parseClockMinutes`, `minutesFromNow`. |
| `src/utils/depotDepartures.js` | Uscite dal deposito. `searchDepartures(developments, options)` con `time`, `windowMinutes`, `place`, `service`. |
| `src/utils/gttLinks.js` | URL GTT, Google Maps e Moovit. `buildMoovitFromDepotUrl(code)`. |
| `src/utils/nearbyStops.js` | Fermate intorno alla posizione, percorsi dalla posizione attuale. |
| `src/utils/clock.js` | Un solo orologio per l'app. Un intervallo condiviso con insieme di iscritti, fermo con `document.hidden`, che scatta subito al ritorno in primo piano. Prima ogni card accendeva il suo timer. |
| `src/utils/shiftTiming.js` | Conto alla rovescia fino all'attacco, orizzonte 48 ore, e suggerimento sveglia per i turni che attaccano presto (75 minuti di anticipo tipico). |
| `src/utils/preconoscenzaOverview.js` | Trasforma i giorni già analizzati in righe da disegnare, **senza toccare il parser**. Puro, quindi verificabile con `node --test`. Barra oraria 04:00 → 04:00. |
| `src/utils/orariDiagnostics.js` | Il referto diagnostico. Vedi § 11. |
| `src/constants/changePoints.js` | La tabella dei posti cambio. Vedi § 6. |
| `scripts/build-app-icons.py` | Generazione degli asset icona. |

Test: **138**, tutti verdi. `tests/depotDepartures.test.js` è il più denso
(30 casi) ed è il posto giusto dove aggiungere quando si tocca quel modulo.

---

## 9. I conti sbagliati delle uscite — cronaca di quattro correzioni

Questa sezione è la più utile a chi riprende, perché mostra **come i difetti
sono stati trovati**: tutti e quattro sono passati indenni attraverso i test,
e sono emersi solo perché l'utente stava usando la app e ha detto «è
impossibile».

### Il sintomo

Il pannello mostrava **«Ci sono 334 uscite a quest'ora»** in una fascia di
mezz'ora. L'utente: *«È impossibile che ci siano 334 uscite in quell'orario
selezionato. Stai filtrando qualcosa di errato.»*

### Difetto 1 — l'identità conteneva la casella, non il mezzo (#36)

```js
// prima
const identity = [line, shift, segment.start, toPlace, vehicleShift].join('|');
//                       ^^^^^ la chiave da cui l'ho letta
```

Il parser archivia lo stesso sviluppo sotto **più chiavi** (il turno e la
vettura), e il PDF ripete la stessa corsa in ogni versione dell'orario.
Tenendo la chiave nell'identità, ogni copia diventava un'uscita.

`searchReturns` contava già per mezzo, e infatti lì i numeri tornavano.
**La risposta giusta era già scritta in un altro file, da luglio.**

Ora: `[line, start, end, toPlace]`. Fra due copie vince quella che porta
l'informazione (se una ha la vettura e l'altra no, si tiene il numero).

### Difetto 2 — i tratti Gerbido → Gerbido non sono uscite (#36)

Sono le righe che riassumono lo sviluppo intero. Non portano a nessun posto
cambio. **Erano circa 190 righe su 473**, cioè il grosso del gonfiore.

### Difetto 3 — il contatore guardava tutta la giornata (#37)

Il **334 non erano le uscite trovate**: era il messaggio "ci sono N uscite a
quest'ora, ma di un altro servizio". Quel contatore cresceva su ogni riga
letta, **prima** della finestra oraria, **prima** del posto scelto e **prima**
della deduplica. Diceva "a quest'ora" e sommava il file intero: 144 + 190 =
334, e con il sabato 473, cioè tutte le righe.

Ora conta ciò che il messaggio promette: dentro la fascia, verso il posto
scelto, una volta per mezzo.

### Difetto 4 — `LUN - SAB` classificato solo come sabato (#39)

Trovato solo grazie al referto diagnostico sul PDF vero:

```
"LUN - SAB" [sabato] segm 35 · usc 10 → 10
```

`LUN - SAB` vuol dire **dal lunedì al sabato**. `getServiceType` testava
`SAB` per primo e restituiva **un valore solo**, quindi quelle corse finivano
tutte nel sabato e **in settimana sparivano, pur girando**.

Di nuovo, la app conteneva già la risposta: `matchesServiceDay` in
`src/parserOrari.js` quella stringa la trattava bene. **Due classificatori che
non dicevano la stessa cosa.**

Introdotta `getServiceTypes(gt)`, che torna **i giorni in cui l'orario gira
davvero**, che possono essere più di uno. Ne segue una regola scritta male in
#37 e corretta in #39: due righe uguali sotto servizi diversi non sono due
uscite, sono **una uscita che gira in entrambi i giorni**.

### Due ipotesi smontate dai dati

Vale la pena scriverle perché sembravano solidissime:

- **«L'eredità del tipo di servizio fra pagine si propaga e falsa tutto.»**
  Falso: 141 pagine su 154 dichiarano il proprio servizio, 13 ereditano, mai
  in catene lunghe.
- **«Il parser duplica parecchio.»** Falso: `usc 77 → 77`, `95 → 91`,
  `97 → 95`.

Era stata anche segnalata all'utente un'anomalia — «i festivi sono più dei
feriali, 190 contro 144» — leggendo numeri **già sbagliati per il difetto 2**.
Ritirata: i festivi sono 77, il valore più basso, come dev'essere.

**Morale operativa:** su questo codice, prima di teorizzare, misurare.

---

## 10. La classificazione del servizio, e i suoi limiti noti

`detectGt` in `src/parserOrari.js` decide il tipo di una pagina:

```js
const versionMatch = text.match(/gruppo\s+\S+\s*-\s*(.+?)\s*-\s*Versione\s+(\w+)/i);
if (versionMatch) return { gt: versionMatch[1].trim(), ver: versionMatch[2].trim() };

const header = text.slice(0, 1000).toUpperCase();
if (header.includes('FESTIVO')) gt = 'FESTIVO';
else if (header.includes('SABATO')) gt = 'SABATO';
else if (header.includes('LUN') && header.includes('VEN')) gt = 'LUN - VEN';

return { gt: gt || previousGt, ver: '' };
```

Fragilità individuate, **misurate e risultate non dannose sul PDF attuale**,
ma da tenere presenti se il formato cambia:

1. **L'eredità non ha limiti.** Una pagina non riconosciuta prende il tipo
   della precedente, e `lastGt` si porta avanti per tutto il documento. Oggi:
   13 pagine su 154, mai in catena lunga.
2. **La parola chiave si cerca solo nei primi 1000 caratteri**, e nel testo
   estratto da un PDF l'ordine è quello di disegno, non quello visivo.
3. **La regex della versione legge tutta la pagina**, non l'intestazione:
   vince la prima riga corrispondente ovunque si trovi, e vale per tutti i
   segmenti della pagina.
4. **`FESTIVO` ha la precedenza**, e il test è per sottostringa.
5. **Chi non è classificato diventa feriale** (`'TUTTI'` → `feriali`).

**`parseOrari`, `detectGt` e `getServiceType` non avevano un solo test prima
di agosto 2026.** Ora ce ne sono su `getServiceTypes` e sulla diagnostica;
`detectGt` resta scoperto.

---

## 11. La botola di diagnostica

`src/utils/orariDiagnostics.js` + un blocco in `src/App.jsx`.

**Non fa parte dell'interfaccia.** Si apre solo con un parametro
nell'indirizzo:

```
https://trailpress.github.io/turni-smart/?diag=orari
```

Senza `?diag=orari` il riquadro non viene nemmeno costruito. È stato chiesto
esplicitamente così dall'utente: «senza che mostri a me le info sull'app, non
mi servono; fallo solo se serve a te internamente».

**Come si usa:** aprire quell'indirizzo e **ricaricare il PDF degli Orari**.
Il referto per pagina esiste solo durante la lettura, perché le pagine non
vengono salvate (in `localStorage` restano solo i segmenti). Il resto si legge
da ciò che è già in memoria. C'è un bottone "Copia il referto".

`parseOrari(pages, { diagnostics })` accetta un raccoglitore facoltativo e per
il resto **fa esattamente quello che faceva**: c'è un test che confronta gli
sviluppi prodotti con e senza. Una diagnostica che cambia ciò che osserva non
serve a niente.

### Il referto reale, 8 agosto 2026

Da conservare: è la sola fotografia che abbiamo del PDF vero, che nel
repository non può stare.

```
ORARI · diagnostica
pagine 154 · riconosciute 141 · ereditate 13
p1-3 "SABATO" [sabato] ric 1/3
p4-15 "LUN - VEN" [feriali] ric 11/12
p16-17 "LUN - SAB" [sabato] ric 1/2
p18 "MERCOLEDI'" [feriali] ric 1/1
p19-22 "LUN - VEN" [feriali] ric 4/4
p23-25 "FESTIVO" [festivi] ric 2/3
p26 "LUN - SAB" [sabato] ric 1/1
p27-44 "LUN - VEN" [feriali] ric 17/18
p45-46 "SABATO" [sabato] ric 2/2
p47-52 "LUN - VEN" [feriali] ric 6/6
p53 "LUN - SAB" [sabato] ric 1/1
p54-64 "SABATO" [sabato] ric 10/11
p65 "LUN - VEN" [feriali] ric 1/1
p66 "LUN - SAB" [sabato] ric 1/1
p67-70 "SABATO" [sabato] ric 4/4
p71-73 "FESTIVO" [festivi] ric 2/3
p74 "LUN - SAB" [sabato] ric 1/1
p75-98 "SABATO" [sabato] ric 22/24
p99 "LUN - VEN" [feriali] ric 1/1
p100 "LUN - SAB" [sabato] ric 1/1
p101-154 "FESTIVO" [festivi] ric 51/54
--
"FESTIVO" [festivi] segm 405 · usc 77 → 77
"SABATO" [sabato] segm 366 · usc 95 → 91
"LUN - VEN" [feriali] segm 355 · usc 97 → 95
"LUN - SAB" [sabato] segm 35 · usc 10 → 10
"MERCOLEDI'" [feriali] segm 17 · usc 5 → 5
chiavi 557
```

Nota: le etichette `[sabato]` accanto a `LUN - SAB` sono **precedenti** alla
correzione #39; oggi il referto scriverebbe `[feriali+sabato]`.

**Le cinque intestazioni reali** — `LUN - VEN`, `SABATO`, `FESTIVO`,
`MERCOLEDI'`, `LUN - SAB` — sono ora casi di test in
`tests/depotReturns.test.js`. Non sono esempi inventati: sono ciò che il PDF
contiene davvero.

---

## 12. Decisioni di interfaccia da conoscere

- **Due famiglie di token colore.** `--text`/`--muted` per le card blu,
  `--on-page-*` per la pagina chiara. Confonderle produce testo invisibile,
  ed è già successo.
- **Tema scuro** via `prefers-color-scheme`, e rispetto di
  `prefers-reduced-motion`.
- **Safe-area insets** e `viewport-fit=cover`; target minimo 44px; contrasto
  WCAG AA.
- **La giornata comincia alle 04:00**, non a mezzanotte: vale per la barra del
  Riepilogo e per il ragionamento sui turni serali che sforano.
- **Nelle uscite non si scrive "turno".** La chiave da cui un tratto è stato
  letto a volte è il turno e a volte la vettura, e non c'è modo di
  distinguerle: si mostra la vettura, e quando manca lo si dice invece di
  inventarla.
- **Un elenco vuoto deve dire perché.** Senza un motivo, "nessun risultato" è
  indistinguibile da una funzione rotta. Ma i motivi vanno tenuti pochi e
  azionabili: tre righe impilate seppelliscono le due che servono.
- **Il GPS non apre schede.** Il link si prepara prima e si apre con un tocco
  a parte: aprire una scheda in attesa della posizione la lascia bianca su
  iOS.

---

## 13. Cosa resta aperto

1. **`MERCOLEDI'`** — 17 segmenti su una pagina sola (p18). Oggi vale come
   feriale generico, il che è corretto ma grossolano. Se è una linea
   scolastica o un servizio di mercato, meriterebbe un trattamento a parte.
   Domanda posta all'utente, senza risposta al momento della scrittura.
2. **Uscite che toccano un posto cambio più avanti nella corsa.** Il filtro
   "Vado a" guarda dove **arriva il tratto che esce dal deposito**. Se un
   mezzo esce verso un posto cambio e più tardi ne tocca un altro, quella
   seconda tappa oggi non compare. Segnalato all'utente; nessun caso reale
   riportato finora.
3. **`detectGt` senza test.** Vedi § 10.
4. **I due parser sono la zona meno coperta.** `parserPreconoscenza.js` e la
   parte di `parserOrari.js` che ricostruisce lo sviluppo di un turno
   (`getDevSegments`, `findExactShiftPath`, `pickBestWindowChain`) sono
   arrivati già fatti e non hanno test propri. Il vincolo di `AGENTS.md` è
   prudenza, non pigrizia.
5. **Il bundle è grosso** (~725 kB js, ~2.3 MB il worker pdf.js). Vite
   avverte a ogni build. Mai affrontato perché mai lamentato.

---

## 14. Principi che conviene mantenere

Sono impliciti in tutto il codice, e spiegano scelte che altrimenti sembrano
scomode.

- **Non inventare dati di dominio.** Sono stati rifiutati: l'assegnazione A/R
  dal `directionId` GTFS, la seconda palina di Siracusa finché non è arrivata
  dal campo, e la posizione di BABE prima che l'utente la fornisse. Quando un
  dato manca, **si rende visibile che manca** — vedi `.action-note--missing`.
- **Ma non confondere "non lo so" con "non c'è".** La seconda palina di
  Siracusa esisteva da sempre nel GTFS: era stata cercata per nome, e si
  chiama MONFALCONE. Aspettare il dato è stato giusto; dichiarare che il
  GTFS non lo conteneva, no. Prima di scrivere che un dato non esiste,
  controllare di averlo cercato nel modo giusto (§ 6.1).
- **Dire in interfaccia quello che il dato dice, non di più.** Un'etichetta
  come «si inserisce a Cattaneo» su un tratto `GERB→CATT` di cinque ore era
  una promessa che il dato non sostiene: è diventata «verso Cattaneo».
  (Ridenominati anche `entryPlace`→`toPlace`, `rideMinutes`→`legMinutes`.)
- **Un contatore deve contare quello che la frase promette.** È l'origine del
  difetto 3 (§ 9).
- **Quando due parti dell'app classificano la stessa cosa, devono
  concordare.** È l'origine dei difetti 1 e 4 (§ 9).
- **I test non bastano.** Diversi difetti erano verdi su tutta la suite.
  Verificare in un browser vero, e chiedere all'utente di guardare.

---

*Ultimo aggiornamento: 8 agosto 2026, dopo la PR #40. Copre dal commit
`7f8a70d` (26 maggio 2026) in poi.*
