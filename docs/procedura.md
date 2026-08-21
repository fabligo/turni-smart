# Procedura — come si lavora qui

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

```bash
npm ci
npm run dev
npm run check
```

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
grep -rn "<<<<<<<" src/ tests/         # e ricontrolla dopo aver risolto
```

> **Successo gia' visto:** un merge e' stato committato **con i marcatori di
> conflitto ancora dentro**. Se ne e' accorto solo `npm run check`. Il comando
> `grep` qui sopra costa due secondi e chiude il caso.

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
