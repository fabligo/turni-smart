import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { classifyPrecache, computeVersion, renderServiceWorker } from '../scripts/service-worker-build.mjs';

const BASE = '/turni-smart/';

/* I nomi veri di una build: `npm run build` produce questi. */
const BUNDLE = ['index.html', 'assets/index-ByG9_Nsq.js', 'assets/index-RmDCPt7N.css', 'assets/pdf.worker-ByF8NTMy.mjs'];
const PUBLIC = ['manifest.json', 'reset-cache.html', 'assets-webp/icon-upload.webp', 'assets-webp/favicon-64.png'];

function classify(overrides = {}) {
  return classifyPrecache({ base: BASE, bundleFileNames: BUNDLE, publicFileNames: PUBLIC, ...overrides });
}

test('la shell e le icone stanno nella cache legata alla versione', () => {
  const { core } = classify();
  assert.ok(core.includes(`${BASE}index.html`));
  assert.ok(core.includes(`${BASE}manifest.json`));
  assert.ok(core.includes(`${BASE}assets-webp/icon-upload.webp`));
});

test('i file firmati dal contenuto stanno nella cache immutabile', () => {
  const { immutable } = classify();
  assert.deepEqual(immutable, [`${BASE}assets/index-ByG9_Nsq.js`, `${BASE}assets/index-RmDCPt7N.css`]);
});

/* Il worker di pdf.js pesa 2,3 MB: se entrasse nell'elenco bloccante, una rete
   che cade a meta' download annullerebbe tutta l'installazione. */
test('il worker di pdf.js e\' facoltativo, non blocca l\'installazione', () => {
  const { immutable, optional } = classify();
  assert.deepEqual(optional, [`${BASE}assets/pdf.worker-ByF8NTMy.mjs`]);
  assert.ok(!immutable.some((url) => url.includes('pdf.worker')));
});

/* Se finisse in cache, servirebbe una via di fuga per la via di fuga. */
test('reset-cache.html non viene mai messa in cache', () => {
  const { core, immutable, optional } = classify();
  const everything = [...core, ...immutable, ...optional];
  assert.ok(!everything.some((url) => url.includes('reset-cache')));
  assert.ok(!everything.some((url) => url.endsWith('/sw.js')));
});

test('la versione cambia con il contenuto dei file dal nome fisso', () => {
  const lists = classify();
  const version = (icon) =>
    computeVersion({ ...lists, readFileSource: (url) => Buffer.from(url.endsWith('.webp') ? icon : 'fisso') });

  assert.equal(version('prima'), version('prima'), 'due build identiche devono dare la stessa versione');
  assert.notEqual(version('prima'), version('dopo'));
});

test('la versione cambia quando cambia l\'impronta di un file firmato', () => {
  const readFileSource = () => Buffer.from('fisso');
  const primo = computeVersion({ ...classify(), readFileSource });
  const secondo = computeVersion({
    ...classify({ bundleFileNames: ['index.html', 'assets/index-ALTRO000.js'] }),
    readFileSource,
  });

  assert.notEqual(primo, secondo);
});

/* Un segnaposto rimasto produce un service worker che va in errore all'avvio e
   lascia l'app senza offline, senza dire niente a nessuno. */
test('il service worker pubblicato non contiene segnaposto', () => {
  const template = readFileSync(path.resolve(import.meta.dirname, '../src/sw.js'), 'utf8');
  const lists = classify();
  const source = renderServiceWorker({ template, base: BASE, version: 'abc123', ...lists });

  assert.ok(!/__SW_[A-Z0-9_]*__/.test(source));
  assert.ok(source.includes('"abc123"'));
  assert.ok(source.includes(`"${BASE}assets/pdf.worker-ByF8NTMy.mjs"`));
});

test('un segnaposto non gestito ferma la build', () => {
  assert.throws(
    () => renderServiceWorker({ template: 'const X = __SW_NUOVO__;', base: BASE, version: 'x', ...classify() }),
    /__SW_NUOVO__/,
  );
});
