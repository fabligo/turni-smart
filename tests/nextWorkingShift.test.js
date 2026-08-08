import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextWorkingShift } from '../src/analytics.js';

function giorno(iso, extra) {
  return { iso, date: new Date(`${iso}T00:00:00`), ...extra };
}

/* Un turno del mattino il 6, uno il 7, riposo l'8, uno il 9. */
const GIORNI = {
  '2026-04-06': giorno('2026-04-06', { t: 'turno', l: '05', n: '101', i: '0400', e: '1015', li: 'GERB', le: 'GERB' }),
  '2026-04-07': giorno('2026-04-07', { t: 'turno', l: '17', n: '8', i: '0630', e: '1400', li: 'GERB', le: 'ORSA' }),
  '2026-04-08': giorno('2026-04-08', { t: 'RP' }),
  '2026-04-09': giorno('2026-04-09', { t: 'turno', l: '14', n: '7', i: '0930', e: '1700', li: 'GERB', le: 'LING' }),
};

test('il prossimo turno e il primo che comincia da adesso in avanti', () => {
  const alle3 = getNextWorkingShift(GIORNI, {}, new Date('2026-04-06T03:30:00'));
  assert.equal(alle3.day.iso, '2026-04-06', 'alle 3:30 il turno delle 4 deve ancora cominciare');
});

test('un turno gia cominciato non e il prossimo', () => {
  const alle6 = getNextWorkingShift(GIORNI, {}, new Date('2026-04-06T06:00:00'));
  assert.equal(alle6.day.iso, '2026-04-07');
});

/* Aprendo la app alle tre e mezza il turno delle quattro e' gia' in cima:
   ripeterlo sotto "Prossimo turno" vuol dire non rispondere alla domanda. */
test('il turno gia in evidenza non viene riproposto come prossimo', () => {
  const senzaOggi = getNextWorkingShift(GIORNI, {}, new Date('2026-04-06T03:30:00'), {
    excludeIso: '2026-04-06',
  });
  assert.equal(senzaOggi.day.iso, '2026-04-07', 'il prossimo e il giorno dopo');
});

test('escludere un giorno non salta i turni successivi', () => {
  const r = getNextWorkingShift(GIORNI, {}, new Date('2026-04-07T03:00:00'), { excludeIso: '2026-04-07' });
  assert.equal(r.day.iso, '2026-04-09', 'l 8 e riposo, quindi si arriva al 9');
});

test('senza esclusione il comportamento resta quello di prima', () => {
  const con = getNextWorkingShift(GIORNI, {}, new Date('2026-04-06T03:30:00'), { excludeIso: '' });
  const senza = getNextWorkingShift(GIORNI, {}, new Date('2026-04-06T03:30:00'));
  assert.equal(con.day.iso, senza.day.iso);
});

test('quando non resta nessun turno non se ne inventa uno', () => {
  const soloUno = { '2026-04-06': GIORNI['2026-04-06'] };
  assert.equal(getNextWorkingShift(soloUno, {}, new Date('2026-04-06T03:30:00'), { excludeIso: '2026-04-06' }), null);
  assert.equal(getNextWorkingShift({}, {}, new Date('2026-04-06T03:30:00')), null);
});

test('i riposi non sono turni', () => {
  const r = getNextWorkingShift(GIORNI, {}, new Date('2026-04-08T00:00:00'));
  assert.equal(r.day.iso, '2026-04-09');
});
