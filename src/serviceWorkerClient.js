/* Il lato app del service worker: lo installa, si accorge quando ne arriva una
   versione nuova e la mette in uso da solo, nel momento in cui non da' fastidio.

   Per un po' l'ha chiesto: compariva un avviso «Versione nuova pronta» con il
   tasto Aggiorna. Chiuderlo senza toccare il tasto lasciava la versione in
   attesa, e l'avviso tornava all'apertura dopo. Con una pubblicazione al giorno
   quell'avviso c'era sempre, ed e' diventato una cosa da scacciare invece che
   una cosa da leggere. L'utente non deve decidere che versione dell'app usa:
   deve avere l'ultima.

   Quello che resta vero e' il motivo per cui l'avviso era nato: il ricambio non
   si fa sotto i piedi di chi sta usando la app. Quindi si sceglie il momento:

   - **all'apertura**, finche' nessuno ha ancora toccato niente: li' la ricarica
     non si distingue dall'avvio;
   - **quando la app va in secondo piano**, in tutti gli altri casi: si riparte
     da soli a schermo spento, e alla riapertura c'e' gia' quella nuova.

   Mai mentre uno la sta guardando o usando. I dati stanno in localStorage e la
   ricarica non ne perde nessuno, ma la sezione aperta si': chi sta leggendo il
   turno di domani se lo ritroverebbe chiuso in mano. */

const SW_URL = `${import.meta.env.BASE_URL}sw.js`;
const SCOPE = import.meta.env.BASE_URL;

/* Un'app aggiunta alla Home non viene quasi mai chiusa davvero: senza un
   controllo al rientro in primo piano, una versione nuova potrebbe restare
   inosservata per giorni. Un quarto d'ora e' abbastanza raro da non pesare. */
const UPDATE_CHECK_INTERVAL = 15 * 60 * 1000;

/* Oltre questo tempo dall'avvio la app non si sta piu' "aprendo": anche senza
   un tocco, qualcuno la sta leggendo, e non gli si ricarica lo schermo sotto
   gli occhi. Un minuto perche' la prima installazione scarica anche il worker
   di pdf.js, e cinque secondi non le bastano quasi mai. */
const STARTUP_WINDOW = 60 * 1000;

let waitingWorker = null;
let updateRequested = false;
let lastUpdateCheck = 0;
let touched = false;

function applyUpdate() {
  if (!waitingWorker || updateRequested) return;
  updateRequested = true;
  waitingWorker.postMessage('SKIP_WAITING');
}

export function startServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  /* In sviluppo non deve esistere: servirebbe file dalla cache e nasconderebbe
     le modifiche appena fatte. Se ne e' rimasto uno da una prova di `preview`
     sulla stessa origine, viene tolto. */
  if (!import.meta.env.PROD) {
    unregisterAll();
    return;
  }

  watchTouches();

  window.addEventListener('load', () => {
    register();
  });
}

/* Il primo tocco - o il primo dito che fa scorrere - dice che la app non si
   sta piu' aprendo: da li' in poi la si sta usando, e la versione nuova
   aspetta lo schermo spento. */
function watchTouches() {
  const mark = () => {
    touched = true;
  };
  ['pointerdown', 'keydown', 'scroll'].forEach((type) => {
    window.addEventListener(type, mark, { once: true, passive: true });
  });
}

async function register() {
  try {
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: SCOPE,
      /* Il browser non deve servire questo file dalla propria cache HTTP: e'
         il file che dice "c'e' una versione nuova", e va sempre riletto. */
      updateViaCache: 'none',
    });

    await removeForeignRegistrations();
    watch(registration);
    watchForeground(registration);

    /* Il controllo va chiesto. Registrare un service worker gia' registrato
       non basta a far riscaricare `sw.js`: provato con Chromium, aprendo la
       app subito dopo una pubblicazione il browser non se ne accorgeva, e la
       versione nuova arrivava solo al giro dopo. Con questa riga ogni
       apertura guarda se c'e' qualcosa di nuovo. */
    lastUpdateCheck = Date.now();
    registration.update().catch(() => {});
  } catch {
    /* Senza service worker l'app funziona come prima, solo con la rete
       accesa. Non e' un motivo per disturbare chi la sta usando. */
  }
}

function watch(registration) {
  if (registration.waiting) announce(registration.waiting);
  /* Puo' essere gia' in installazione qui: `register()` fa lui il controllo
     della versione, e fra quello e questa riga c'e' un `await`. Senza questa
     riga quel giro si perdeva e l'aggiornamento restava fermo fino
     all'apertura dopo. */
  follow(registration.installing);

  registration.addEventListener('updatefound', () => follow(registration.installing));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    /* `controllerchange` scatta anche al primo `clients.claim()`, quando di
       versioni ce n'e' una sola: ricaricare li' sarebbe un riavvio a sorpresa
       per niente. Si ricarica solo dopo aver chiesto il ricambio. */
    if (!updateRequested) return;
    updateRequested = false;
    window.location.reload();
  });
}

/* Un worker in arrivo: si aspetta che finisca di installarsi. Senza
   `controller` questa e' la prima installazione, e la app sta gia' girando su
   quei file: non c'e' niente da sostituire. */
function follow(worker) {
  if (!worker) return;

  const check = () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) announce(worker);
  };

  check();
  worker.addEventListener('statechange', check);
}

/* Il momento buono: adesso se la app si sta ancora aprendo, altrimenti alla
   prima volta che finisce in secondo piano. */
function announce(worker) {
  if (waitingWorker === worker) return;
  waitingWorker = worker;

  if (isStartingUp() || document.visibilityState !== 'visible') {
    applyUpdate();
    return;
  }

  document.addEventListener('visibilitychange', applyWhenHidden);
}

function applyWhenHidden() {
  if (document.visibilityState === 'visible') return;
  document.removeEventListener('visibilitychange', applyWhenHidden);
  applyUpdate();
}

/* Si sta ancora aprendo se nessuno l'ha toccata e non e' passato troppo tempo.
   `timeOrigin` e' l'istante in cui la pagina ha cominciato a caricare. */
function isStartingUp() {
  if (touched) return false;
  const started = performance?.timeOrigin;
  if (!Number.isFinite(started)) return false;
  return Date.now() - started < STARTUP_WINDOW;
}

function watchForeground(registration) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;

    const now = Date.now();
    if (now - lastUpdateCheck < UPDATE_CHECK_INTERVAL) return;
    lastUpdateCheck = now;
    registration.update().catch(() => {});
  });
}

/* Una versione passata dell'app registrava un service worker con un altro
   nome. Quello nuovo non lo sostituisce: resterebbe li' a servire file vecchi,
   ed e' esattamente il guasto che aveva reso necessaria
   `public/reset-cache.html`. Va tolto a mano. */
async function removeForeignRegistrations() {
  const expected = new URL(SW_URL, window.location.href).href;
  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.all(
    registrations
      .filter((registration) => scriptUrlOf(registration) !== expected)
      .map((registration) => registration.unregister()),
  );
}

function scriptUrlOf(registration) {
  const worker = registration.active || registration.waiting || registration.installing;
  return worker ? worker.scriptURL : null;
}

async function unregisterAll() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}
