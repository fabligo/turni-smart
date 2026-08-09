/* Costruisce l'elenco dei file che il service worker deve conservare e lo
   scrive dentro `src/sw.js`. Sta qui, fuori da `vite.config.js`, perche' la
   parte che decide "questo file e' immutabile, quest'altro no" e' l'unica che
   puo' sbagliare in silenzio, ed e' coperta da `tests/serviceWorker.test.js`. */

import { createHash } from 'node:crypto';

/* La via di fuga manuale non va mai messa in cache: se ci finisse, servirebbe
   una via di fuga per la via di fuga. */
const NEVER_PRECACHE = new Set(['reset-cache.html', 'sw.js']);

/* Pesante e non indispensabile all'avvio: si scarica per conto suo senza poter
   far fallire l'installazione. Vedi il commento in `src/sw.js`. */
const OPTIONAL_PATTERN = /(^|\/)pdf\.worker[.-]/;

const PLACEHOLDER_PATTERN = /__SW_[A-Z0-9_]*__/g;

/* `bundleFileNames` sono i file prodotti da Vite (nomi con l'impronta del
   contenuto), `publicFileNames` quelli copiati da `public/` cosi' come sono. */
export function classifyPrecache({ base, bundleFileNames, publicFileNames, assetsDir = 'assets' }) {
  const prefix = `${assetsDir}/`;
  const core = [];
  const immutable = [];
  const optional = [];

  for (const fileName of [...bundleFileNames, ...publicFileNames]) {
    if (NEVER_PRECACHE.has(fileName)) continue;

    const url = `${base}${fileName}`;
    if (!fileName.startsWith(prefix)) {
      core.push(url);
    } else if (OPTIONAL_PATTERN.test(fileName)) {
      optional.push(url);
    } else {
      immutable.push(url);
    }
  }

  return { core: dedupeSorted(core), immutable: dedupeSorted(immutable), optional: dedupeSorted(optional) };
}

/* La versione decide quando la cache viene buttata, quindi deve cambiare
   quando cambia il contenuto e mai per conto suo: due build identiche devono
   dare la stessa versione, altrimenti l'app annuncia aggiornamenti che non
   esistono. I file firmati dall'impronta bastano per nome; per gli altri —
   icone, manifest, index.html — serve leggere il contenuto. */
export function computeVersion({ core, immutable, optional, readFileSource }) {
  const hash = createHash('sha256');

  for (const url of core) {
    hash.update(url, 'utf8');
    hash.update(readFileSource(url));
  }
  for (const url of [...immutable, ...optional]) {
    hash.update(url, 'utf8');
  }

  return hash.digest('hex').slice(0, 12);
}

export function renderServiceWorker({ template, base, version, core, immutable, optional }) {
  const values = {
    __SW_VERSION__: JSON.stringify(version),
    __SW_BASE__: JSON.stringify(base),
    __SW_CORE_ASSETS__: JSON.stringify(core),
    __SW_IMMUTABLE_ASSETS__: JSON.stringify(immutable),
    __SW_OPTIONAL_ASSETS__: JSON.stringify(optional),
  };

  let source = template;
  for (const [placeholder, value] of Object.entries(values)) {
    source = source.split(placeholder).join(value);
  }

  /* Un segnaposto dimenticato non e' un errore di stile: produce un service
     worker che va in errore all'avvio e lascia l'app senza offline, in
     silenzio. Il controllo cerca qualsiasi `__SW_..._`, cosi' prende anche un
     segnaposto nuovo aggiunto a `sw.js` e non gestito qui. */
  const leftover = source.match(PLACEHOLDER_PATTERN);
  if (leftover) {
    throw new Error(`Service worker: segnaposto non sostituiti (${[...new Set(leftover)].join(', ')}).`);
  }

  return source;
}

function dedupeSorted(urls) {
  return [...new Set(urls)].sort();
}
