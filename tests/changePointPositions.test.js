import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANGE_POINTS } from '../src/constants/changePoints.js';
import {
  clearChangePointPosition,
  getChangePointCoordinates,
  listLocatedChangePoints,
  loadSavedPositions,
  normalizePosition,
  saveChangePointPosition,
} from '../src/utils/changePointPositions.js';

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
    raw: data,
  };
}

test('registra e rilegge la posizione di un posto cambio', () => {
  const storage = fakeStorage();
  saveChangePointPosition('pita', { lat: 45.0668, lng: 7.6513, accuracy: 12.4 }, storage);

  const saved = loadSavedPositions(storage);
  assert.equal(saved.PITA.lat, 45.0668);
  assert.equal(saved.PITA.lng, 7.6513);
  assert.equal(saved.PITA.accuracy, 12);
  assert.ok(saved.PITA.savedAt);
});

test('la posizione registrata vince su quella predefinita', () => {
  const storage = fakeStorage();
  const preset = getChangePointCoordinates('GERB', loadSavedPositions(storage));
  assert.equal(preset.source, 'preset');
  assert.equal(preset.lat, CHANGE_POINTS.GERB.coordinates.lat);

  const saved = saveChangePointPosition('GERB', { lat: 45.05, lng: 7.58 }, storage);
  const resolved = getChangePointCoordinates('GERB', saved);
  assert.equal(resolved.source, 'saved');
  assert.equal(resolved.lat, 45.05);
});

test('cancellare la posizione registrata riporta a quella predefinita', () => {
  const storage = fakeStorage();
  saveChangePointPosition('LING', { lat: 45.1, lng: 7.7 }, storage);
  const cleared = clearChangePointPosition('LING', storage);
  assert.equal(cleared.LING, undefined);
  assert.equal(getChangePointCoordinates('LING', cleared).source, 'preset');
});

test('scarta le coordinate non valide', () => {
  assert.equal(normalizePosition({ lat: 'boh', lng: 7.6 }), null);
  assert.equal(normalizePosition({ lat: 91, lng: 7.6 }), null);
  assert.equal(normalizePosition(null), null);

  const storage = fakeStorage({ ts_change_point_coords_v1: '{"CATT":{"lat":null,"lng":7.6}}' });
  assert.deepEqual(loadSavedPositions(storage), {});

  const broken = fakeStorage({ ts_change_point_coords_v1: 'non-json' });
  assert.deepEqual(loadSavedPositions(broken), {});
});

test('elenca solo i posti cambio con una posizione utilizzabile', () => {
  const located = listLocatedChangePoints({ CATT: { lat: 45.07, lng: 7.65 } });
  const codes = located.map((item) => item.code);
  assert.ok(codes.includes('GERB'));
  assert.ok(codes.includes('CATT'));
  // Senza coordinate predefinite ne' registrate il posto cambio resta fuori.
  assert.ok(!codes.includes('CLMA'));
  assert.ok(located.every((item) => Number.isFinite(item.coordinates.lat)));
});
