import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANGE_POINTS, getChangePointLabel } from '../src/constants/changePoints.js';
import {
  clearChangePointPosition,
  listLocatedChangePoints,
  loadChangePointDirectory,
  normalizePosition,
  resolveChangePointName,
  resolveChangePointPosition,
  setChangePointName,
  setChangePointPosition,
} from '../src/utils/changePointDirectory.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

test('senza nome scelto il posto cambio resta il codice degli orari', () => {
  assert.equal(getChangePointLabel('PITA'), 'PITA');
  assert.equal(getChangePointLabel('CAIO'), 'CAIO');
  assert.equal(resolveChangePointName('PITA', {}), 'PITA');
});

test('nessun posto cambio porta con se un nome o una posizione non verificati', () => {
  const others = Object.entries(CHANGE_POINTS).filter(([code]) => code !== 'GERB');
  assert.ok(others.length > 0);
  others.forEach(([, meta]) => {
    // Le paline sono dati raccolti sul campo e restano; nomi e coordinate no.
    assert.equal(meta.label, undefined);
    assert.equal(meta.coordinates, undefined);
  });
});

test('il nome scelto vince e sopravvive alla rilettura', () => {
  const storage = fakeStorage();
  setChangePointName('pita', '  Capolinea   Tasso  ', storage);
  const directory = loadChangePointDirectory(storage);
  assert.equal(directory.PITA.name, 'Capolinea Tasso');
  assert.equal(resolveChangePointName('PITA', directory), 'Capolinea Tasso');
});

test('la posizione registrata vale piu di quella di serie e si puo cancellare', () => {
  const storage = fakeStorage();
  assert.equal(resolveChangePointPosition('GERB', {}).source, 'preset');

  const saved = setChangePointPosition('GERB', { lat: 45.05, lng: 7.58, accuracy: 9.6 }, storage);
  assert.equal(saved.GERB.position.accuracy, 10);
  assert.equal(resolveChangePointPosition('GERB', saved).source, 'saved');

  const cleared = clearChangePointPosition('GERB', storage);
  assert.equal(cleared.GERB, undefined);
  assert.equal(resolveChangePointPosition('GERB', cleared).source, 'preset');
});

test('nome e posizione convivono sullo stesso posto cambio', () => {
  const storage = fakeStorage();
  setChangePointName('CATT', 'Cattaneo', storage);
  const directory = setChangePointPosition('CATT', { lat: 45.07, lng: 7.65 }, storage);
  assert.equal(directory.CATT.name, 'Cattaneo');
  assert.equal(directory.CATT.position.lat, 45.07);

  const afterClear = clearChangePointPosition('CATT', storage);
  assert.equal(afterClear.CATT.name, 'Cattaneo');
  assert.equal(afterClear.CATT.position, undefined);
});

test('scarta coordinate e contenuti non validi', () => {
  assert.equal(normalizePosition({ lat: 'boh', lng: 7.6 }), null);
  assert.equal(normalizePosition({ lat: 91, lng: 7.6 }), null);
  assert.deepEqual(loadChangePointDirectory(fakeStorage({ ts_change_points_v1: 'non-json' })), {});
  assert.deepEqual(
    loadChangePointDirectory(fakeStorage({ ts_change_points_v1: '{"CATT":{"position":{"lat":null,"lng":7}}}' })),
    {},
  );
});

test('solo i posti cambio con una posizione utilizzabile entrano nel confronto', () => {
  const codes = listLocatedChangePoints({ CATT: { position: { lat: 45.07, lng: 7.65 } } }).map((item) => item.code);
  assert.deepEqual(codes.sort(), ['CATT', 'GERB']);
});
