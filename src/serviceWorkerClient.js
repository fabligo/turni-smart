/* Il lato app del service worker: lo installa, si accorge quando ne arriva una
   versione nuova e lo sostituisce solo quando lo decide l'utente.

   Il ricambio automatico e' proprio quello che non si vuole: mentre uno sta
   guardando il turno di domani, l'app cambierebbe i file sotto i piedi e il
   primo tocco andrebbe in errore. Qui il service worker nuovo resta in attesa,
   la app mostra un avviso, e la ricarica avviene su richiesta. */

const SW_URL = `${import.meta.env.BASE_URL}sw.js`;
const SCOPE = import.meta.env.BASE_URL;

/* Un'app aggiunta alla Home non viene quasi mai chiusa davvero: senza un
   controllo al rientro in primo piano, una versione nuova potrebbe restare
   inosservata per giorni. Un quarto d'ora e' abbastanza raro da non pesare. */
const UPDATE_CHECK_INTERVAL = 15 * 60 * 1000;

const listeners = new Set();
let waitingWorker = null;
let updateRequested = false;
let lastUpdateCheck = 0;

export function subscribeToUpdate(listener) {
  listeners.add(listener);
  /* Chi si iscrive a mount avvenuto puo' arrivare dopo l'avviso: se c'e' gia'
     una versione in attesa, la riceve subito. */
  if (waitingWorker) listener(true);
  return () => listeners.delete(listener);
}

export function applyUpdate() {
  if (!waitingWorker) return;
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

  window.addEventListener('load', () => {
    register();
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
  } catch {
    /* Senza service worker l'app funziona come prima, solo con la rete
       accesa. Non e' un motivo per disturbare chi la sta usando. */
  }
}

function watch(registration) {
  if (registration.waiting) announce(registration.waiting);

  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;

    installing.addEventListener('statechange', () => {
      /* Senza `controller` questa e' la prima installazione: non c'e' niente
         da aggiornare e non va annunciato niente. */
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        announce(installing);
      }
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    /* `controllerchange` scatta anche al primo `clients.claim()`: ricaricare
       li' vorrebbe dire un riavvio a sorpresa all'apertura. Si ricarica solo
       se il cambio l'ha chiesto l'utente. */
    if (!updateRequested) return;
    updateRequested = false;
    window.location.reload();
  });
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

function announce(worker) {
  waitingWorker = worker;
  listeners.forEach((listener) => listener(true));
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
