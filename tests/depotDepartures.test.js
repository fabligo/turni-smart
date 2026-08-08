import test from 'node:test';
import assert from 'node:assert/strict';
import { searchDepartures } from '../src/utils/depotDepartures.js';

/* Un lunedi', cosi' il servizio dedotto e' "feriali". */
const LUNEDI = new Date('2026-04-06T05:00:00');

const SVILUPPI = {
  '05 101': [
    { start: '05:10', loc_s: 'GERB', end: '05:32', loc_e: 'CATT', vett: '1', gt: 'LUN - VEN', run_id: 1 },
    { start: '05:32', loc_s: 'CATT', end: '10:15', loc_e: 'GERB', vett: '1', gt: 'LUN - VEN', run_id: 1 },
  ],
  '17 8': [{ start: '06:41', loc_s: 'GERB', end: '07:05', loc_e: 'ORSA', vett: '8', gt: 'LUN - VEN', run_id: 1 }],
  '05 203': [{ start: '05:48', loc_s: 'GERB', end: '06:10', loc_e: 'CATT', vett: '3', gt: 'LUN - VEN', run_id: 1 }],
  '34 302': [{ start: '13:20', loc_s: 'GERB', end: '13:44', loc_e: 'BABE', vett: '9', gt: 'SAB', run_id: 1 }],
};

test('elenca le uscite dall orario in avanti, non quelle prima', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:30' });
  assert.deepEqual(
    r.matches.map((m) => m.departure),
    ['05:48', '06:41'],
    'la 05:10 e passata e non deve comparire',
  );
  assert.equal(r.total, 2);
});

test('ordina per quanto manca, non per numero di linea', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:00' });
  assert.deepEqual(
    r.matches.map((m) => `${m.departure} ${m.line}`),
    ['05:10 05', '05:48 05', '06:41 17'],
  );
  assert.equal(r.matches[0].waitMinutes, 10);
});

test('dice dove arriva il primo tratto, senza interpretarlo', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '06:00' });
  assert.equal(r.matches[0].toPlace, 'ORSA');
  assert.equal(r.matches[0].line, '17');
  assert.equal(r.matches[0].shift, '8');
  assert.equal(r.matches[0].legMinutes, 24);
});

test('conta quante uscite ci sono e di quali linee', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:00' });
  assert.equal(r.total, 3);
  assert.deepEqual(r.byLine, [
    { count: 2, line: '05' },
    { count: 1, line: '17' },
  ]);
});

test('i rientri non sono uscite', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '00:00' });
  assert.ok(
    r.matches.every((m) => m.departure !== '05:32'),
    'il tratto CATT -> GERB parte dal posto cambio, non dal deposito',
  );
});

test('un altro tipo di servizio resta fuori, ma viene contato', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '13:00' });
  assert.equal(r.total, 0, 'la corsa del sabato non esce di feriale');
  assert.equal(r.otherServiceCount, 1, 'e il pannello puo dire perche');
  assert.equal(r.countByService.sabato, 1);
});

test('chiedendo il sabato la corsa del sabato compare', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '13:00', service: 'sabato' });
  assert.equal(r.total, 1);
  assert.equal(r.matches[0].line, '34');
  assert.equal(r.matches[0].toPlace, 'BABE');
});

test('oltre l orizzonte le uscite si contano ma non si elencano', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:00', horizonMinutes: 60 });
  assert.deepEqual(r.matches.map((m) => m.departure), ['05:10', '05:48']);
  assert.equal(r.outsideHorizon, 1, 'la 06:41 e fuori dai 60 minuti');
  assert.equal(r.otherServiceCount, 1, 'la corsa del sabato conta a parte, non fra le piu avanti');
});

test('senza orario si parte da adesso', () => {
  const r = searchDepartures(SVILUPPI, { now: new Date('2026-04-06T06:00:00') });
  assert.deepEqual(r.matches.map((m) => m.departure), ['06:41']);
});

test('sviluppi vuoti o malformati non fanno saltare la ricerca', () => {
  assert.equal(searchDepartures({}, { now: LUNEDI }).total, 0);
  assert.equal(searchDepartures({ '05 1': null }, { now: LUNEDI }).total, 0);
  assert.equal(searchDepartures(undefined, { now: LUNEDI }).total, 0);
});

test('la stessa uscita non si conta due volte', () => {
  const doppio = {
    '05 101': [
      { start: '05:10', loc_s: 'GERB', end: '05:32', loc_e: 'CATT', vett: '1', gt: 'LUN - VEN', run_id: 1 },
      { start: '05:10', loc_s: 'GERB', end: '05:32', loc_e: 'CATT', vett: '1', gt: 'LUN - VEN', run_id: 2 },
    ],
  };
  assert.equal(searchDepartures(doppio, { now: LUNEDI, time: '05:00' }).total, 1);
});
