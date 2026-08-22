# 0011 — L'aggiornamento non si chiede: si sceglie il momento

*22 agosto 2026 · sostituisce la [0007](0007-il-ricambio-lo-comanda-lutente.md)*

## Contesto

La 0007 diceva una cosa giusta — non ricaricare la pagina sotto i piedi di chi
la sta usando — e la risolveva chiedendo: un avviso «Versione nuova pronta» con
il tasto **Aggiorna**, e una × per rimandare.

Rimandare pero' non risolveva niente: il service worker nuovo restava in attesa,
e all'apertura dopo l'avviso tornava. Con una pubblicazione al giorno l'avviso
c'era **sempre**. Segnalato dall'utente il 22 agosto:

> «rimuovi la dicitura che dice ogni volta che apro l'app sempre "aggiorna la
> versione corrente…"»

Un avviso che compare tutte le volte non e' un avviso: e' una cosa da scacciare.
E la domanda era mal posta in partenza — chi guida non deve decidere quale
versione dell'app usare. Deve avere l'ultima.

## Decisione

L'app **mette in uso la versione nuova da sola**, scegliendo un momento in cui
non da' fastidio:

- **all'apertura**, finche' nessuno ha ancora toccato niente — un tocco, un
  tasto o uno scorrimento chiudono questa finestra, e comunque non dura piu' di
  un minuto dall'avvio;
- **quando l'app finisce in secondo piano** in tutti gli altri casi: riparte a
  schermo spento, e alla riapertura c'e' gia' quella nuova.

Mai mentre qualcuno la sta guardando. I dati stanno in `localStorage` e la
ricarica non ne perde nessuno, ma la sezione aperta si': chi sta leggendo il
turno di domani se lo ritroverebbe chiuso in mano.

Il controllo della versione **va chiesto esplicitamente** a ogni apertura
(`registration.update()`). Registrare un service worker gia' registrato non
basta a far riscaricare `sw.js`: provato con Chromium, aprendo l'app subito dopo
una pubblicazione il browser non se ne accorgeva, e la versione nuova arrivava
solo al giro dopo.

## Conseguenze

- `src/components/UpdateBanner.jsx` non esiste piu', e con lui il suo blocco in
  `styles.css`.
- `applyUpdate()` non e' piu' esportata: nessuno da fuori decide il momento.
- Il `SKIP_WAITING` verso `sw.js` resta identico: cambia solo chi lo manda e
  quando.
- La marca di build in fondo alla schermata resta la verifica dall'esterno, e
  `public/reset-cache.html` resta la via di fuga.

## Come si e' verificato

Un server statico che tiene i file delle versioni vecchie, come Pages — `vite
preview` no: a ogni build cancella `dist/` e la pagina gia' aperta muore prima
che il service worker possa dire la sua, il che ha mandato fuori strada tre
tentativi di prova.

Due scenari, tutti e due su Chromium:

1. **Versione nuova pronta all'apertura, senza tocchi** → l'app si ricarica da
   sola sulla v2 (tre navigazioni: apertura, riapertura, ricarica automatica).
2. **Versione nuova che arriva mentre la si usa** (un tocco, poi il controllo in
   primo piano la trova) → resta sulla v1 finche' lo schermo e' acceso, e passa
   alla v2 appena la pagina va in secondo piano.
