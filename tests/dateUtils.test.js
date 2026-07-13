import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNaturalDate, toIsoDate } from '../src/utils/dateUtils.js';

test('interpreta una data italiana estesa', () => {
  const date = parseNaturalDate('30 maggio 2026', 2026);
  assert.equal(toIsoDate(date), '2026-05-30');
});

test('interpreta formati numerici comuni', () => {
  assert.equal(toIsoDate(parseNaturalDate('05/03/2027', 2026)), '2027-03-05');
  assert.equal(toIsoDate(parseNaturalDate('05-03-27', 2026)), '2027-03-05');
});

test('rifiuta date impossibili senza correggerle automaticamente', () => {
  assert.equal(parseNaturalDate('31 febbraio 2026', 2026), null);
});
