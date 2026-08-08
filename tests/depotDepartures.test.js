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

/* Il filtro utile e' la destinazione, non la direzione: chi deve andare a
   Orsini vuole i mezzi che vanno a Orsini, e "andata" da solo non lo dice. */
test('si puo chiedere un posto cambio solo', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 10, place: 'ORSA' });
  assert.deepEqual(r.matches.map((m) => m.line), ['17']);
  assert.equal(r.otherPlace, 2, 'le due verso Cattaneo restano fuori, ma contate');
});

test('senza posto cambio scelto si vedono tutte le uscite', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 10 });
  assert.equal(r.total, 3);
  assert.equal(r.otherPlace, 0, 'senza filtro non resta fuori niente da contare');
});

test('un posto cambio senza uscite in quella fascia non ne inventa', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 10, place: 'BABE' });
  assert.equal(r.total, 0, 'BABE e del sabato, non del feriale');
});

test('il codice del posto cambio si accetta anche minuscolo', () => {
  const r = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 10, place: '  orsa ' });
  assert.deepEqual(r.matches.map((m) => m.line), ['17']);
});

/* L'elenco del selettore deve reggere mentre si sposta l'orario: se si
   svuotasse a ogni finestra stretta non sarebbe un elenco di destinazioni ma
   un secondo risultato di ricerca. */
test('le destinazioni offerte sono quelle di tutta la giornata', () => {
  const stretta = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 0 });
  assert.deepEqual(
    stretta.places.map((p) => p.place).sort(),
    ['CATT', 'ORSA'],
    'anche la 09:40, fuori finestra, porta la sua destinazione',
  );
  const cattaneo = stretta.places.find((p) => p.place === 'CATT');
  assert.equal(cattaneo.count, 3, 'tre uscite verso Cattaneo nella giornata feriale');
  assert.equal(cattaneo.inWindow, 1, 'ma una sola in questa fascia');
});

test('le destinazioni seguono il servizio scelto', () => {
  const sabato = searchDepartures(SVILUPPI, { now: LUNEDI, service: 'sabato', time: '05:08', windowMinutes: 2 });
  assert.deepEqual(sabato.places.map((p) => p.place), ['BABE']);
});

test('scegliere un posto cambio non cambia l elenco delle destinazioni', () => {
  const tutte = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 10 });
  const sola = searchDepartures(SVILUPPI, { now: LUNEDI, time: '05:10', windowMinutes: 10, place: 'ORSA' });
  assert.deepEqual(sola.places, tutte.places, 'il selettore resta popolato uguale');
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

/* Il parser archivia lo stesso sviluppo sotto piu' chiavi - il turno e la
   vettura - e il PDF ripete la stessa corsa in piu' versioni dell'orario. Un
   mezzo pero' dal deposito esce una volta sola: se l'identita' include la
   chiave, il pannello moltiplica le uscite per il numero di copie. */
test('la stessa uscita sotto due chiavi diverse resta una', () => {
  const corsa = { start: '05:10', loc_s: 'GERB', dir: 'A', end: '05:32', loc_e: 'CATT', vett: '1', gt: 'LUN - VEN', run_id: 1 };
  const duplicato = {
    '05 101': [{ ...corsa }],
    '05 1': [{ ...corsa }],
  };
  assert.equal(searchDepartures(duplicato, { now: LUNEDI, time: '05:10', windowMinutes: 5 }).total, 1);
});

test('la stessa uscita in due versioni dello stesso servizio resta una', () => {
  const corsa = { start: '05:10', loc_s: 'GERB', dir: 'A', end: '05:32', loc_e: 'CATT', vett: '1', run_id: 1 };
  const dueVersioni = {
    '05 101': [
      { ...corsa, gt: 'LUN - VEN', ver: 'A' },
      { ...corsa, gt: 'FERIALE INVERNALE', ver: 'B' },
    ],
  };
  const r = searchDepartures(dueVersioni, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.equal(r.total, 1, 'due righe dello stesso feriale, un mezzo solo');
  assert.equal(r.places.find((p) => p.place === 'CATT').count, 1);
});

/* Quando la vettura non e' leggibile il parser ci mette la chiave dello
   sviluppo: due copie della stessa uscita finivano con due vetture diverse e
   sopravvivevano entrambe. */
test('la vettura di ripiego non crea una seconda uscita', () => {
  const conRipiego = {
    '05 101': [
      { start: '05:10', loc_s: 'GERB', dir: 'A', end: '05:32', loc_e: 'CATT', vett: '', turnoVettura: '05 101', gt: 'LUN - VEN', run_id: 1 },
    ],
    '05 1': [
      { start: '05:10', loc_s: 'GERB', dir: 'A', end: '05:32', loc_e: 'CATT', vett: '', turnoVettura: '05 1', gt: 'LUN - VEN', run_id: 1 },
    ],
  };
  const r = searchDepartures(conRipiego, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.equal(r.total, 1);
  assert.equal(r.matches[0].vehicleShift, '', 'e la vettura resta vuota invece di fingere un numero');
});

test('fra due copie della stessa uscita vince quella che ha la vettura', () => {
  const senzaESenza = {
    '05 1': [{ start: '05:10', loc_s: 'GERB', dir: 'A', end: '05:32', loc_e: 'CATT', ln: '05', vett: '', turnoVettura: '05 1', gt: 'LUN - VEN' }],
    '05 101': [{ start: '05:10', loc_s: 'GERB', dir: 'A', end: '05:32', loc_e: 'CATT', ln: '05', vett: '7', gt: 'LUN - VEN' }],
  };
  const r = searchDepartures(senzaESenza, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.equal(r.total, 1);
  assert.equal(r.matches[0].vehicleShift, '7');
});

/* La copia senza direzione non deve cancellare quella che ce l'ha. */
test('fra due copie della stessa uscita vince quella che ha la direzione', () => {
  const mista = {
    '05 1': [{ start: '05:10', loc_s: 'GERB', dir: '-', end: '05:32', loc_e: 'CATT', ln: '05', vett: '7', gt: 'LUN - VEN' }],
    '05 101': [{ start: '05:10', loc_s: 'GERB', dir: 'A', end: '05:32', loc_e: 'CATT', ln: '05', vett: '7', gt: 'LUN - VEN' }],
  };
  const r = searchDepartures(mista, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.equal(r.total, 1);
  assert.equal(r.matches[0].direction, 'A');
});

/* Le righe che riassumono lo sviluppo intero partono e finiscono in deposito:
   non portano a nessun posto cambio e non sono un mezzo da prendere. */
test('un tratto che dal deposito torna al deposito non e un uscita', () => {
  const interoSviluppo = {
    '05 101': [{ start: '04:00', loc_s: 'GERB', dir: '-', end: '10:15', loc_e: 'GERB', vett: '1', gt: 'LUN - VEN', run_id: 1 }],
  };
  const r = searchDepartures(interoSviluppo, { now: LUNEDI, time: '04:00', windowMinutes: 5 });
  assert.equal(r.total, 0);
  assert.deepEqual(r.places, [], 'e nemmeno una destinazione da offrire');
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
