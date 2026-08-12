import test from 'node:test';
import assert from 'node:assert/strict';

// storage.js parla con localStorage: qui basta una memoria finta, perche' cio'
// che si controlla e' la forma di cio' che viene scritto e riletto.
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  },
};

const { loadOrariByKey, loadOrariParserVersion, orariKey, saveOrari } = await import('../src/storage.js');
const { RIENTRI_PARSER_VERSION } = await import('../src/parserRientri.js');

const INFO = { fileName: 'Orari.pdf', dIn: new Date(2026, 7, 1) };
const DEVELOPMENTS = {
  '05 302': [{ ln: '5', start: '16:33', loc_s: 'CATT', end: '21:58', loc_e: 'GERB' }],
  'RIENTRI 5 LUN - VEN': [{ ln: '5', start: '21:51', loc_s: 'OSET', end: '21:58', loc_e: 'GERB' }],
};

test('una lettura salvata porta con se la versione del parser', () => {
  store.clear();
  assert.equal(saveOrari(DEVELOPMENTS, INFO), true);
  const key = orariKey(2026, 8);
  assert.deepEqual(loadOrariByKey(key), DEVELOPMENTS);
  assert.equal(loadOrariParserVersion(key), RIENTRI_PARSER_VERSION);
});

test('le letture salvate prima restano leggibili e si dichiarano vecchie', () => {
  store.clear();
  const key = orariKey(2026, 8);
  // Il formato di prima: la mappa nuda, senza busta.
  store.set(key, JSON.stringify({ '05 302': DEVELOPMENTS['05 302'] }));

  assert.deepEqual(loadOrariByKey(key), { '05 302': DEVELOPMENTS['05 302'] });
  // Versione zero: e' cosi' che l'app sa di dover chiedere di ricaricare il PDF
  // invece di dire che il PDF non ha il grafico di servizio.
  assert.equal(loadOrariParserVersion(key), 0);
  assert.ok(loadOrariParserVersion(key) < RIENTRI_PARSER_VERSION);
});

test('una chiave che non esiste non finge una lettura', () => {
  store.clear();
  assert.deepEqual(loadOrariByKey(orariKey(2026, 8)), {});
  assert.equal(loadOrariParserVersion(orariKey(2026, 8)), 0);
});
