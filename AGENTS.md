# Turni Smart — istruzioni operative

App per chi guida al deposito GTT del Gerbido: legge i PDF della preconoscenza
e degli orari e risponde alle domande che ci si fa in servizio — che turno
faccio, cosa esce dal deposito, come ci rientro.

React 18 con Vite 6, statica e mobile-first. Tutto avviene nel browser: nessuna
API esterna, nessuna chiave, i dati restano sul telefono. `main` e' la
produzione.

---

## Prima di toccare qualsiasi cosa

**Leggi [`docs/stato.md`](docs/stato.md).** Dice cosa e' in corso, chi tiene
cosa e cosa resta aperto. Ci vuole un minuto e evita di rifare lavoro gia'
fatto o di scontrarsi con un'altra sessione.

Poi, **solo la pagina che riguarda il tuo compito**:

| Se devi... | Leggi |
|---|---|
| toccare i parser, i rientri, le uscite, i turni | [`docs/glossario.md`](docs/glossario.md) — le parole non sono sinonimi |
| aggiungere o verificare un dato, una palina, una coordinata | [`docs/dati.md`](docs/dati.md) |
| capire dove sta una cosa nel codice | [`docs/architettura.md`](docs/architettura.md) |
| aprire un ramo, fare un merge, pubblicare | [`docs/procedura.md`](docs/procedura.md) |
| capire perche' una cosa e' fatta cosi' | [`docs/decisioni/`](docs/decisioni/README.md) |
| ricostruire come ci siamo arrivati | [`docs/registro-progetto.md`](docs/registro-progetto.md) |

Il registro e' lungo: e' la **memoria**, non il riferimento. Si consulta per
sezione quando serve il perche' di qualcosa, non si legge tutto all'inizio.

---

## Le cinque cose che non si fanno

1. **Non inventare un dato.** Se non lo puoi verificare, lascialo vuoto e fai in
   modo che l'app funzioni senza. → `decisioni/0003`
2. **Non committare PDF, `.env`, chiavi, token, `dist`.** Il repository e'
   pubblico e serve GitHub Pages.
3. **Non modificare i parser senza test mirati**, ne' cambiare classificazioni
   GTT, sviluppo turni o calendario per lavori infrastrutturali.
4. **Non introdurre API esterne o chiavi nel frontend**, e niente `VITE_*` per
   segreti: finiscono nel sito pubblico.
5. **Non toccare** la base Vite `/turni-smart/`, il percorso di `sw.js`, il
   prefisso cache `turni-smart-`, il ricambio comandato dall'utente
   (`decisioni/0007`) e `WAKE_EVENT_PREFIX` (`decisioni/0008`).

---

## Il ciclo

```bash
npm ci
npm run dev
npm run check     # lint, test, anti-segreti, build — deve passare prima di ogni commit
```

Ramo `claude/<descrizione>` o `codex/<descrizione>` → implementa con test →
verifica in un browser vero → `npm run check` → PR → merge in squash. Il deploy
Pages parte da solo sul push a `main`.

I dettagli, compresi i conflitti di merge e il coordinamento fra piu'
conversazioni, stanno in [`docs/procedura.md`](docs/procedura.md).

---

## Alla fine della sessione

Aggiorna [`docs/stato.md`](docs/stato.md). Se hai preso una decisione che chi
viene dopo non deve ridiscutere, scrivi un file in
[`docs/decisioni/`](docs/decisioni/README.md).

Costa due minuti ed e' la ragione per cui questa pagina e' corta.
