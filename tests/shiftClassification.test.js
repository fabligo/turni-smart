import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BALLOTTAGGI,
  SHIFT_CATEGORIES,
  getShiftCategory,
  getShiftCategoryName,
  isEveningShift,
  isSplitCategory,
} from '../src/constants/shiftClassification.js';

test('le fasce a ripresa unica seguono la codifica dell accordo', () => {
  assert.equal(getShiftCategory('101').type, 'morning');
  assert.equal(getShiftCategory('203').type, 'intermediate');
  assert.equal(getShiftCategory('300').type, 'afternoon');
  assert.equal(getShiftCategory('412').type, 'evening');
});

test('i turni a due riprese si dividono in dispari, cambio e T2RP', () => {
  assert.equal(getShiftCategory('31').type, 'split_odd');
  assert.equal(getShiftCategory('49').type, 'split_odd');
  assert.equal(getShiftCategory('50').type, 'split_change');
  assert.equal(getShiftCategory('89').type, 'split_change');
  // 090-099 e' il T2RP della tabella tipologie, non piu' il generico "cambio".
  assert.equal(getShiftCategory('90').type, 'split_afternoon');
  assert.equal(getShiftCategory('99').type, 'split_afternoon');
  assert.equal(SHIFT_CATEGORIES.SPLIT_AFTERNOON.code, 'T2RP');
  // Resta comunque un turno spezzato a tutti gli effetti.
  assert.ok(isSplitCategory('95'));
});

test('la tipologia W e soppressa e i 900 sono fuori programmazione ordinaria', () => {
  assert.equal(getShiftCategory('W').type, 'withdrawn');
  assert.equal(getShiftCategory('w12').type, 'withdrawn');
  assert.equal(getShiftCategory('901').type, 'out_of_line');
  // Quello che l accordo non prevede resta non riconosciuto.
  assert.equal(getShiftCategory('600').type, 'unknown');
  assert.equal(getShiftCategory('').type, 'unknown');
});

test('le finestre orarie sono quelle della tabella tipologie turni', () => {
  assert.equal(SHIFT_CATEGORIES.MORNING.earliestStart, '04:00');
  assert.equal(SHIFT_CATEGORIES.MORNING.latestEnd, '13:45');
  assert.equal(SHIFT_CATEGORIES.INTERMEDIATE.earliestStart, '07:16');
  assert.equal(SHIFT_CATEGORIES.INTERMEDIATE.latestEnd, '17:59');
  assert.equal(SHIFT_CATEGORIES.AFTERNOON.latestEnd, '22:00');
  assert.equal(SHIFT_CATEGORIES.EVENING.earliestStart, '17:15');
  assert.equal(SHIFT_CATEGORIES.EVENING.latestEnd, '02:30');
  assert.equal(SHIFT_CATEGORIES.SPLIT_AFTERNOON.earliestStart, '11:30');
});

test('il nome esteso porta con se la codifica', () => {
  assert.equal(getShiftCategoryName('31'), '2 riprese dispari (T2R 001-049)');
  assert.equal(getShiftCategoryName('95'), '2 riprese pomeridiano (T2RP 090-099)');
  assert.equal(getShiftCategoryName('101'), 'Ripresa unica mattino (100)');
  assert.equal(getShiftCategoryName('901'), 'Fuori programmazione ordinaria (900)');
  assert.equal(getShiftCategoryName('W'), 'Tipologia W soppressa (W)');
  assert.equal(getShiftCategoryName('zz'), 'Categoria non riconosciuta');
});

test('solo il serale e serale, e senza numero vale il ripiego', () => {
  assert.ok(isEveningShift('401'));
  assert.equal(isEveningShift('101'), false);
  assert.equal(isEveningShift('', true), true);
});

test('i ballottaggi sono i cinque della pellicola Gigante', () => {
  assert.deepEqual(Object.keys(BALLOTTAGGI).sort(), ['B00', 'B01', 'B03', 'B04', 'B05']);
  assert.match(BALLOTTAGGI.B05.description, /100$/);
  assert.match(BALLOTTAGGI.B01.description, /300 \/ 400/);
});
