import test from 'node:test';
import assert from 'node:assert/strict';
import { findRunDirection, getDirectionLabel, searchDepartures } from '../src/utils/depotDepartures.js';

/* Un lunedi', cosi' il servizio dedotto e' "feriali". */
const LUNEDI = new Date('2026-04-06T05:00:00');

const SVILUPPI = {
  /* Il tratto che esce dal deposito non ha direzione: la prende dal tratto
     successivo della stessa corsa, com'e' scritto negli sviluppi veri. */
  '05 101': [
    { start: '05:10', loc_s: 'GERB', dir: '-', end: '05:32', loc_e: 'CATT', vett: '1', gt: 'LUN - VEN', run_id: 1 },
    { start: '05:32', loc_s: 'CATT', dir: 'R', end: '10:15', loc_e: 'GERB', vett: '1', gt: 'LUN - VEN', run_id: 1 },
  ],
  '17 8': [{ start: '05:06', loc_s: 'GERB', dir: 'A', end: '05:30', loc_e: 'ORSA', vett: '8', gt: 'LUN - VEN', run_id: 1 }],
  '05 203': [{ start: '05:12', loc_s: 'GERB', dir: 'R', end: '05:34', loc_e: 'CATT', vett: '3', gt: 'LUN - VEN', run_id: 1 }],
  '34 302': [{ start: '05:08', loc_s: 'GERB', dir: 'A', end: '05:32', loc_e: 'BABE', vett: '9', gt: 'SAB', run_id: 1 }],
  '14 7': [{ start: '09:40', loc_s: 'GERB', dir: 'A', end: '10:04', loc_e: 'CATT', vett: '7', gt: 'LUN - VEN', run_id: 1 }],
};

test('la finestra guarda anche prima dell orario scelto', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.deepEqual(
    r.matches.map((m) => `${m.departure} ${m.offsetMinutes}`),
    ['05:06 -4', '05:10 0', '05:12 2'],
    'un mezzo partito 4 minuti prima si prende ancora',
  );
});

test('l elenco resta in ordine di orario, non di distanza', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 10 });
  const orari = r.matches.map((m) => m.departure);
  assert.deepEqual(orari, [...orari].sort(), 'ordine cronologico');
});

test('dice la direzione che la linea prende', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:06', windowMinutes: 1 });
  assert.equal(r.matches[0].line, '17');
  assert.equal(r.matches[0].direction, 'A');
  assert.equal(r.matches[0].directionLabel, 'Andata');
  assert.equal(r.matches[0].directionFromRun, false, 'qui la direzione e sul tratto stesso');
});

test('se il tratto di uscita non ha direzione la prende dalla corsa', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 0 });
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].line, '05');
  assert.equal(r.matches[0].direction, 'R', 'dal tratto CATT -> GERB della stessa corsa');
  assert.equal(r.matches[0].directionFromRun, true, 'e va segnalato che arriva da li');
});

test('si puo chiedere una direzione sola', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 10, direction: 'A' });
  assert.deepEqual(r.matches.map((m) => m.line), ['17']);
  assert.equal(r.otherDirection, 2, 'le due di ritorno restano fuori, ma contate');
});

test('conta quante uscite ci sono e di quali linee', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 10 });
  assert.equal(r.total, 3);
  assert.deepEqual(r.byLine, [
    { count: 2, line: '05' },
    { count: 1, line: '17' },
  ]);
});

test('i rientri non sono uscite', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:32', windowMinutes: 60 });
  assert.ok(
    r.matches.every((m) => m.departure !== '05:32'),
    'il tratto CATT -> GERB parte dal posto cambio, non dal deposito',
  );
});

test('fuori dalla finestra si conta, non si elenca', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.equal(r.outsideWindow, 1, 'la 09:40 e lontana');
  assert.ok(r.matches.every((m) => m.departure !== '09:40'));
});

test('un altro tipo di servizio resta fuori, ma viene contato', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:08', windowMinutes: 2 });
  assert.ok(r.matches.every((m) => m.line !== '34'), 'la corsa del sabato non esce di feriale');
  assert.equal(r.otherServiceCount, 1);
  assert.equal(r.countByService.sabato, 1);
});

test('chiedendo il sabato la corsa del sabato compare', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:08', windowMinutes: 2, service: 'sabato' });
  assert.deepEqual(r.matches.map((m) => m.line), ['34']);
  assert.equal(r.matches[0].toPlace, 'BABE');
});

test('senza orario si parte da adesso', () => {
  const r = searchDepartures(SVILUPPI, { now: new Date('2026-04-06T09:40:00'), windowMinutes: 5 });
  assert.deepEqual(r.matches.map((m) => m.departure), ['09:40']);
});

test('sviluppi vuoti o malformati non fanno saltare la ricerca', () => {
  assert.equal(searchDepartures({}, { now: LUNEDI }).total, 0);
  assert.equal(searchDepartures({ '05 1': null }, { now: LUNEDI }).total, 0);
  assert.equal(searchDepartures(undefined, { now: LUNEDI }).total, 0);
});

test('la stessa uscita non si conta due volte', () => {
  const doppio = {
    '05 101': [
      { start: '05:10', loc_s: 'GERB', dir: 'A', end: '05:32', loc_e: 'CATT', vett: '1', gt: 'LUN - VEN', run_id: 1 },
      { start: '05:10', loc_s: 'GERB', dir: 'A', end: '05:32', loc_e: 'CATT', vett: '1', gt: 'LUN - VEN', run_id: 2 },
    ],
  };
  assert.equal(searchDepartures(doppio, { now: LUNEDI, time: '05:10', windowMinutes: 5 }).total, 1);
});

test('le etichette di direzione sono quelle degli orari', () => {
  assert.equal(getDirectionLabel('A'), 'Andata');
  assert.equal(getDirectionLabel('r'), 'Ritorno');
  assert.equal(getDirectionLabel('-'), '');
  assert.equal(getDirectionLabel(''), '');
});

test('una corsa senza direzione da nessuna parte non ne inventa una', () => {
  assert.equal(findRunDirection([{ dir: '-' }, { dir: '' }]), '');
  const r = searchDepartures(
    { '99 1': [{ start: '05:10', loc_s: 'GERB', dir: '-', end: '05:30', loc_e: 'CATT', gt: 'LUN - VEN', run_id: 1 }] },
    { now: LUNEDI, time: '05:10', windowMinutes: 5 },
  );
  assert.equal(r.matches[0].direction, '');
  assert.equal(r.matches[0].directionLabel, '');
});
