/* Service worker di Turni Smart.

   Serve a una cosa sola: aprire l'app senza rete. I turni e i PDF stanno gia'
   nel telefono (localStorage), ma finora mancava il programma per leggerli —
   in deposito, in galleria o nel sottopasso l'app non partiva.

   Una versione del 2026 aveva gia' provato ad averne uno e si era rotta: era
   rimasto a servire file vecchi anche dopo una pubblicazione nuova, e l'unico
   modo di uscirne era `public/reset-cache.html`. Qui quel difetto e' affrontato
   in modo esplicito, in quattro punti:

   1. Le cache portano nel nome la versione della build: quando cambia, la
      vecchia non viene aggiornata, viene buttata.
   2. Questo file cambia a ogni pubblicazione, quindi il browser si accorge da
      solo che c'e' qualcosa di nuovo (`updateViaCache: 'none'` lato client).
   3. Il ricambio non avviene sotto i piedi di chi sta usando la app: il
      service worker nuovo aspetta, e la app lo mette in uso da sola quando non
      da' fastidio - all'apertura, o quando finisce in secondo piano. Non lo
      chiede piu': l'avviso «Versione nuova pronta» c'era a ogni apertura ed era
      diventato una cosa da scacciare. Vedi `src/serviceWorkerClient.js`.
   4. `reset-cache.html` non viene mai intercettata, cosi' la via di fuga
      manuale funziona anche quando il problema e' il service worker stesso.

   La marca di build in fondo alla schermata resta la verifica dall'esterno:
   se dice la data giusta, stai guardando l'ultima versione. */

/* Iniettati da vite.config.js al momento della build. */
const VERSION = __SW_VERSION__;
const BASE = __SW_BASE__;
const CORE_ASSETS = __SW_CORE_ASSETS__;
const IMMUTABLE_ASSETS = __SW_IMMUTABLE_ASSETS__;
const OPTIONAL_ASSETS = __SW_OPTIONAL_ASSETS__;

/* Due cache con due vite diverse.

   `core` tiene i file dal nome fisso — index.html, il manifest, le icone —
   il cui contenuto puo' cambiare senza che cambi il nome: e' legata alla
   versione e viene rifatta a ogni pubblicazione.

   `immutable` tiene i file che Vite firma con l'impronta del contenuto
   (`index-ByG9_Nsq.js`): a parita' di nome sono identici per sempre. Non e'
   legata alla versione apposta, cosi' il worker di pdf.js da 2 MB non viene
   riscaricato a ogni pubblicazione se non e' cambiato. Le voci che non
   servono piu' vengono tolte all'attivazione. */
const CORE_CACHE = `turni-smart-core-${VERSION}`;
const IMMUTABLE_CACHE = 'turni-smart-immutable';
const OWN_CACHES = new Set([CORE_CACHE, IMMUTABLE_CACHE]);

const SHELL_URL = `${BASE}index.html`;
const ESCAPE_HATCH_URL = `${BASE}reset-cache.html`;
const IMMUTABLE_PREFIX = `${BASE}assets/`;

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(takeOver());
});

self.addEventListener('message', (event) => {
  /* L'unico comando accettato: lo manda la app quando decide che e' il
     momento di passare alla versione nuova. */
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* Le richieste non-GET non hanno una risposta riutilizzabile, e una
     richiesta parziale (Range) servita da cache intera e' un file corrotto. */
  if (request.method !== 'GET' || request.headers.has('range')) return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  /* Fuori dal nostro dominio non ci mettiamo in mezzo: i link GTT, WhatsApp e
     Maps escono comunque dall'app e non vanno conservati. */
  if (url.origin !== self.location.origin) return;

  /* La via di fuga deve restare raggiungibile anche quando il colpevole e'
     questo file. Non si tocca. */
  if (url.pathname === ESCAPE_HATCH_URL) return;

  if (request.mode === 'navigate') {
    event.respondWith(serveShell(request));
    return;
  }

  if (url.pathname.startsWith(IMMUTABLE_PREFIX)) {
    event.respondWith(serveImmutable(request));
    return;
  }

  event.respondWith(serveStatic(event, url));
});

async function precache() {
  const [core, immutable] = await Promise.all([caches.open(CORE_CACHE), caches.open(IMMUTABLE_CACHE)]);

  /* La shell o c'e' tutta o non serve a niente: se una sola richiesta fallisce
     l'installazione si annulla e resta attiva la versione precedente, che
     funziona. Meglio nessun aggiornamento che un aggiornamento a meta'. */
  await Promise.all([
    core.addAll(CORE_ASSETS.map(freshRequest)),
    immutable.addAll(IMMUTABLE_ASSETS.map(freshRequest)),
  ]);

  /* Il worker di pdf.js pesa 2,3 MB. Se la rete cade a meta' download non deve
     trascinarsi dietro tutta l'installazione: al massimo viene preso al primo
     PDF caricato, che di norma avviene con la connessione accesa. */
  await Promise.allSettled(OPTIONAL_ASSETS.map((url) => immutable.add(freshRequest(url))));
}

async function takeOver() {
  const keys = await caches.keys();

  /* Via le cache delle versioni precedenti, comprese quelle del service worker
     rotto del 2026: portano tutte il prefisso `turni-smart`. */
  await Promise.all(
    keys.filter((key) => key.startsWith('turni-smart') && !OWN_CACHES.has(key)).map((key) => caches.delete(key)),
  );

  await pruneImmutable();

  /* Prende il controllo delle schede gia' aperte: al primo avvio l'app
     funziona offline subito, senza aspettare la visita successiva. */
  await self.clients.claim();
}

async function pruneImmutable() {
  const cache = await caches.open(IMMUTABLE_CACHE);
  const known = new Set([...IMMUTABLE_ASSETS, ...OPTIONAL_ASSETS]);
  const requests = await cache.keys();

  await Promise.all(
    requests.filter((request) => !known.has(new URL(request.url).pathname)).map((request) => cache.delete(request)),
  );
}

/* `reload` scavalca la cache HTTP del browser: durante l'installazione si
   prende la versione appena pubblicata, non quella che il browser ha in mano. */
function freshRequest(url) {
  return new Request(url, { cache: 'reload' });
}

/* L'app e' una pagina sola: qualsiasi navigazione dentro il perimetro riceve
   la stessa shell, presa dalla cache. E' istantanea e funziona senza rete; la
   versione nuova non arriva di soppiatto qui, ma dal ricambio del service
   worker, che la app fa avvenire all'apertura o a schermo spento. */
async function serveShell(request) {
  const cache = await caches.open(CORE_CACHE);
  const cached = await cache.match(SHELL_URL);
  if (cached) return cached;

  try {
    return await fetch(request);
  } catch {
    return offlineResponse();
  }
}

/* Nome con l'impronta del contenuto: se ce l'abbiamo e' quello giusto, senza
   nemmeno chiedere alla rete. */
async function serveImmutable(request) {
  const cache = await caches.open(IMMUTABLE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheable(response)) await cache.put(request, response.clone());
  return response;
}

/* Icone e manifest: si risponde subito con la copia locale e si controlla in
   sottofondo se e' cambiata, cosi' al riavvio successivo e' gia' aggiornata.
   La chiave e' il solo percorso, perche' `exportUtils.js` chiede l'icona del
   bus con `?v=2` e non deve finire in cache due volte. */
async function serveStatic(event, url) {
  const cache = await caches.open(CORE_CACHE);
  const key = url.pathname;
  const cached = await cache.match(key);

  const fromNetwork = fetch(url.href)
    .then(async (response) => {
      if (isCacheable(response)) await cache.put(key, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(fromNetwork);
    return cached;
  }

  return (await fromNetwork) || offlineResponse();
}

/* Solo risposte complete e nostre: una risposta opaca o un 404 messo in cache
   diventa un guasto permanente. */
function isCacheable(response) {
  return Boolean(response) && response.ok && response.type === 'basic';
}

function offlineResponse() {
  return new Response('Turni Smart non e\' disponibile offline per questa risorsa.', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
