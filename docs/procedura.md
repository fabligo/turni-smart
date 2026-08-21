# Procedura — come si lavora qui

---

## Da dove arriva il lavoro

Le richieste arrivano come **issue su GitHub**, con i modelli in
`.github/ISSUE_TEMPLATE/`. Non e' burocrazia: e' la voce di costo piu' grossa
del progetto.

Misura reale. La richiesta «la funzione Rientro non sembra funzionare» ha
richiesto **una quindicina di scambi** prima di arrivare alla causa — che era:
il parser leggeva la pagina sbagliata del PDF. Con i tre campi del modello
(*cosa vedi*, *cosa dovrebbe dire e come lo sai*, *con quali dati*) la stessa
causa si trova al primo giro, perche' «da Cattaneo al Gerbido sono nove minuti,
non un'ora e venti» dice gia' dove guardare.

### Quando si apre una sessione nuova

Non a ogni issue: sarebbe burocrazia, e butterebbe via un contesto che spesso
serve ancora.

**Si resta nella stessa** quando il lavoro nuovo tocca gli stessi file, quando
e' una correzione di cio' che si e' appena fatto, o quando sono due o tre cose
piccole della stessa area. Li' il contesto gia' caricato e' un vantaggio.

**Se ne apre una nuova** quando si cambia area, quando la sessione e' gia' stata
riassunta una volta, quando sono passati giorni, o quando il lavoro precedente
e' chiuso e pubblicato.

**Il segnale**: quando si ricomincia a rileggere file gia' letti, o a chiedere
all'utente cose che ha gia' detto. Da quel punto si sta pagando ricostruzione
invece di lavoro, e conviene chiudere.

Ogni sessione resta comunque **un ramo e una PR**: quello non cambia.

### Il costo, dove sta davvero

In ordine, dal piu' caro:

1. **Una richiesta vaga.** Costa esplorazione: leggere codice a tentoni,
   provare ipotesi, chiedere chiarimenti.
2. **Una sessione che si riassume.** Costa la ricostruzione del contesto.
3. **Lavoro rifatto.** Un difetto corretto due volte, un merge in conflitto,
   una decisione ripresa da capo.
4. **Leggere la documentazione.** La voce piu' piccola — se si legge solo cio'
   che serve. Ogni pagina dichiara il suo costo in `AGENTS.md`.

Il risparmio non si fa scrivendo meno documenti: si fa **arrivando preparati**.

---

## Il ciclo di una modifica

1. **Ramo** `claude/<descrizione>` o `codex/<descrizione>` da `main` aggiornato.
2. **Implementare**, con test mirati sui moduli puri (`node --test`).
3. **Verificare in un browser vero** con Playwright, profilo telefono. I test
   verdi non bastano: piu' di un difetto e' passato con tutta la suite verde.
4. `npm run check` — lint, test, controllo anti-segreti, build. **Deve passare
   prima di ogni commit.**
5. **PR → CI → merge in squash.** Il deploy Pages parte da solo sul push a
   `main`.
6. **Riferire il risultato**, compreso cio' che non e' stato fatto e perche'.
7. **Aggiornare `stato.md`**, e scrivere una decisione se ne e' stata presa una.

```bash
npm ci
npm run dev
npm run check
```

### Quando e' finita

Una modifica e' finita quando: `npm run check` passa, e' stata guardata in un
browser vero, la PR e' unita, `stato.md` e' aggiornato, e all'utente e' stato
detto anche cio' che resta fuori. Mancando uno di questi, non e' finita.

---

## Verificare nel browser

Chromium e' gia' installato. **Non lanciare `playwright install`.**

```js
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 430, height: 1200 },
  permissions: ['geolocation'],
  geolocation: { latitude: 45.0355, longitude: 7.6255 },
});
```

Cosa guardare: contrasto, bersagli da 44 px, nessuno scorrimento orizzontale, e
**il testo che appare davvero a schermo** — non quello che dovrebbe apparire.

Senza demo nel repository, per provare serve seminare `localStorage` con dati
veri. Vedi `docs/registro-progetto.md` § 11 per il referto diagnostico.

`page.clock.install()` sostituisce `setInterval`: non si puo' usare per contare
i timer attivi.

---

## Il merge, e i conflitti

Il merge in squash su `main` crea un commit nuovo: il ramo locale resta indietro
e al giro dopo si scontra. La sequenza che funziona:

```bash
git fetch origin main
git checkout -B <ramo> origin/main    # riparti da main, non dal ramo vecchio
```

Se un merge produce conflitti:

```bash
git diff --diff-filter=U --name-only   # TUTTI i file in conflitto
git checkout --ours <file...>          # o --theirs, o a mano
# e prima di committare, sempre:
git grep -n "<<<<<<<\|>>>>>>>" -- . ':!docs/procedura.md'
```

> **Successo gia' visto due volte.** La prima, un merge e' stato committato
> **con i marcatori di conflitto ancora dentro**, e se ne e' accorto solo
> `npm run check`. La seconda, il controllo cercava solo in `src/` e `tests/`
> mentre il conflitto era nei `.md`: cerca in tutto il repository, non nelle
> cartelle che ti aspetti.

---

## Piu' conversazioni sullo stesso progetto

Il progetto ha un collo di bottiglia strutturale: tutto passa da `App.jsx` e da
tre o quattro moduli di utilita'. Il parallelismo rende quando le aree non si
toccano, e qui si toccano quasi sempre.

**Misura reale**, sessione del 21 agosto: 13 PR, **4 con conflitti di merge** —
una su tre. Tutti negli stessi file: `DepotReturnsPanel.jsx` (5 volte),
`depotReturns.js` (4), `parserOrari.js` (3), `styles.css` (3).

### La regola

- **Una sola conversazione per volta tocca il codice dell'app.**
- Una seconda conversazione va bene per il lavoro che **non** tocca il codice:
  leggere documenti, raccogliere paline e capolinea, esaminare PDF, ricerche.
- Se proprio servono due conversazioni sul codice, devono avere **file
  disgiunti**, dichiarati in `stato.md` prima di cominciare.

### Prima di iniziare, sempre

1. Leggere `stato.md` — cosa e' in corso e chi tiene cosa.
2. Scriverci la propria riga.
3. A fine sessione, aggiornarla.

Senza quel passaggio due chat rifanno lo stesso lavoro in modo diverso, e i
conflitti si pagano in tempo.

---

## Scrivere codice qui

**Commenti e messaggi di commit in italiano**, discorsivi, e spiegano **perche'**
una cosa e' cosi', non cosa fa:

```js
/* Un tratto che dal deposito torna al deposito non porta a nessun posto
   cambio: negli orari sono le righe che riassumono lo sviluppo intero, non
   un'uscita da prendere. */
```

Non e' vezzo. Molte scelte dipendono da fatti di dominio che il codice da solo
non racconta, e che si perdono in fretta.

**Il messaggio di commit racconta il problema, non l'elenco delle modifiche.**
Titolo che dice cosa cambia per chi usa l'app; corpo che spiega cosa non
funzionava e perche' la correzione e' quella.

---

## Quando qualcosa non torna

Se un numero sembra sbagliato, **verificarlo prima di difenderlo**. Molte volte
il calcolo era giusto e il dato era finto; qualche volta il contrario.

Ordine utile:

1. Il dato di partenza e' vero? (→ `dati.md`)
2. Sto leggendo la pagina giusta del PDF? (→ `glossario.md`, «Ripresa»)
3. Sto chiamando la cosa col suo nome? (→ `glossario.md`)
4. Solo alla fine: il calcolo e' sbagliato?

---

## Cosa non si fa mai

- Committare PDF di orari o preconoscenza: il repository e' **pubblico**.
- Committare `.env`, chiavi, token, certificati, `dist`.
- Inventare un dato che non si e' potuto verificare (→ `dati.md`).
- Modificare i parser senza test mirati.
- Cambiare classificazioni GTT, sviluppo turni o calendario per lavori
  infrastrutturali.
- Lasciare file temporanei di anteprima nella radice del repository.
