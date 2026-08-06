import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReturnMatches,
  parseClockMinutes,
  RETURN_WINDOW_MINUTES,
  searchReturns,
} from '../src/utils/depotReturns.js';

// Lunedi 4 maggio 2026, ore 14:00: giorno feriale.
const NOW = new Date(2026, 4, 4, 14, 0, 0);

function segment(overrides = {}) {
  return {
    gt: 'LUN-VEN',
    run_id: 1,
    ver: '',
    ...overrides,
  };
}

test('trova il rientro diretto che termina in deposito', () => {
  const developments = {
    '071 12': [
      segment({ ln: '71', vett: '5', start: '14:10', loc_s: 'PITA', end: '14:35', loc_e: 'GERB' }),
    ],
  };

  const [match] = buildReturnMatches(developments, 'PITA', { now: NOW });
  assert.equal(match.departure, '14:10');
  assert.equal(match.arrival, '14:35');
  assert.equal(match.waitMinutes, 10);
  assert.equal(match.rideMinutes, 25);
  assert.equal(match.direct, true);
});

test('trova il mezzo che passa dal posto cambio e raggiunge il deposito dopo piu tratti', () => {
  const developments = {
    '071 12': [
      segment({ ln: '71', vett: '5', start: '14:05', loc_s: 'PITA', end: '14:25', loc_e: 'CATT' }),
      segment({ ln: '71', vett: '5', start: '14:27', loc_s: 'CATT', end: '14:50', loc_e: 'GERB' }),
    ],
  };

  const [match] = buildReturnMatches(developments, 'PITA', { now: NOW });
  assert.equal(match.departure, '14:05');
  assert.equal(match.arrival, '14:50');
  assert.equal(match.direct, false);
  assert.equal(match.route, 'PITA → CATT → GERB');
  assert.equal(match.legs.length, 2);
});

test('scarta il mezzo che non arriva mai in deposito', () => {
  const developments = {
    '071 12': [
      segment({ ln: '71', vett: '5', start: '14:05', loc_s: 'PITA', end: '14:25', loc_e: 'CATT' }),
      segment({ ln: '71', vett: '5', start: '14:30', loc_s: 'CATT', end: '14:55', loc_e: 'ORSN' }),
    ],
  };

  assert.deepEqual(buildReturnMatches(developments, 'PITA', { now: NOW }), []);
});

test('esclude le corse fuori dalla finestra di 30 minuti', () => {
  const developments = {
    '071 12': [
      segment({ ln: '71', vett: '5', start: '13:50', loc_s: 'PITA', end: '14:20', loc_e: 'GERB' }),
      segment({ ln: '071', vett: '6', start: '14:45', loc_s: 'PITA', end: '15:10', loc_e: 'GERB' }),
    ],
  };

  assert.equal(RETURN_WINDOW_MINUTES, 30);
  assert.deepEqual(buildReturnMatches(developments, 'PITA', { now: NOW }), []);
});

test('interrompe la catena quando l attesa tra due tratti e troppo lunga', () => {
  const developments = {
    '071 12': [
      segment({ ln: '71', vett: '5', start: '14:05', loc_s: 'PITA', end: '14:25', loc_e: 'CATT' }),
      segment({ ln: '71', vett: '5', start: '15:10', loc_s: 'CATT', end: '15:35', loc_e: 'GERB' }),
    ],
  };

  assert.deepEqual(buildReturnMatches(developments, 'PITA', { now: NOW }), []);
});

test('non concatena tratti di riprese diverse dello stesso turno', () => {
  const developments = {
    '071 12': [
      segment({ ln: '71', vett: '5', start: '14:05', loc_s: 'PITA', end: '14:25', loc_e: 'CATT', run_id: 1 }),
      segment({ ln: '71', vett: '9', start: '14:30', loc_s: 'CATT', end: '14:55', loc_e: 'GERB', run_id: 2 }),
    ],
  };

  assert.deepEqual(buildReturnMatches(developments, 'PITA', { now: NOW }), []);
});

test('tiene solo le corse del tipo di servizio del giorno', () => {
  const developments = {
    '071 12': [
      segment({ ln: '71', vett: '5', start: '14:10', loc_s: 'PITA', end: '14:35', loc_e: 'GERB', gt: 'FEST' }),
    ],
  };

  assert.deepEqual(buildReturnMatches(developments, 'PITA', { now: NOW }), []);
});

test('ordina i rientri dal piu imminente', () => {
  const developments = {
    '071 12': [segment({ ln: '71', vett: '5', start: '14:25', loc_s: 'PITA', end: '14:50', loc_e: 'GERB' })],
    '063 04': [segment({ ln: '63', vett: '2', start: '14:05', loc_s: 'PITA', end: '14:40', loc_e: 'GERB' })],
  };

  const matches = buildReturnMatches(developments, 'PITA', { now: NOW });
  assert.deepEqual(matches.map((item) => item.departure), ['14:05', '14:25']);
});

test('sposta la finestra in avanti con l offset richiesto', () => {
  const developments = {
    '071 12': [segment({ ln: '71', vett: '5', start: '14:50', loc_s: 'PITA', end: '15:15', loc_e: 'GERB' })],
  };

  assert.deepEqual(buildReturnMatches(developments, 'PITA', { now: NOW }), []);
  const [match] = buildReturnMatches(developments, 'PITA', { now: NOW, offsetMinutes: 30 });
  assert.equal(match.departure, '14:50');
  assert.equal(match.waitMinutes, 20);
});

test('gestisce le corse a cavallo della mezzanotte', () => {
  const lateNight = new Date(2026, 4, 4, 23, 50, 0);
  const developments = {
    '071 12': [segment({ ln: '71', vett: '5', start: '00:05', loc_s: 'PITA', end: '00:30', loc_e: 'GERB' })],
  };

  const [match] = buildReturnMatches(developments, 'PITA', { now: lateNight });
  assert.equal(match.waitMinutes, 15);
  assert.equal(match.rideMinutes, 25);
});

test('cerca i rientri a un orario di passaggio impostato a mano', () => {
  const developments = {
    '071 12': [
      segment({ ln: '71', vett: '5', start: '18:40', loc_s: 'PITA', end: '19:05', loc_e: 'GERB' }),
      segment({ ln: '063', vett: '2', start: '14:10', loc_s: 'PITA', end: '14:35', loc_e: 'GERB' }),
    ],
  };

  const matches = buildReturnMatches(developments, 'PITA', { now: NOW, time: '18:30' });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].departure, '18:40');
  assert.equal(matches[0].waitMinutes, 10);
});

test('l orario impostato ha la precedenza sull offset', () => {
  const developments = {
    '071 12': [segment({ ln: '71', vett: '5', start: '09:10', loc_s: 'PITA', end: '09:35', loc_e: 'GERB' })],
  };

  const [match] = buildReturnMatches(developments, 'PITA', { now: NOW, offsetMinutes: 30, time: '09:00' });
  assert.equal(match.departure, '09:10');
  assert.equal(match.waitMinutes, 10);
});

test('un orario non valido non blocca la ricerca e torna al comportamento a offset', () => {
  assert.equal(parseClockMinutes('7:45'), 465);
  assert.equal(parseClockMinutes('24:00'), null);
  assert.equal(parseClockMinutes('12:60'), null);
  assert.equal(parseClockMinutes('mezzogiorno'), null);

  const developments = {
    '071 12': [segment({ ln: '71', vett: '5', start: '14:10', loc_s: 'PITA', end: '14:35', loc_e: 'GERB' })],
  };

  const [match] = buildReturnMatches(developments, 'PITA', { now: NOW, time: 'boh' });
  assert.equal(match.departure, '14:10');
});

test('non propone rientri se il posto cambio e gia il deposito', () => {
  const developments = {
    '071 12': [segment({ ln: '71', vett: '5', start: '14:10', loc_s: 'GERB', end: '14:35', loc_e: 'GERB' })],
  };

  assert.deepEqual(buildReturnMatches(developments, 'GERB', { now: NOW }), []);
  assert.equal(searchReturns(developments, 'GERB', { now: NOW }).isDepot, true);
});

test('allarga la finestra di ricerca su richiesta', () => {
  const developments = {
    '071 12': [segment({ ln: '71', vett: '5', start: '15:20', loc_s: 'PITA', end: '15:45', loc_e: 'GERB' })],
  };

  assert.deepEqual(buildReturnMatches(developments, 'PITA', { now: NOW }), []);
  const [match] = buildReturnMatches(developments, 'PITA', { now: NOW, windowMinutes: 120 });
  assert.equal(match.departure, '15:20');
  assert.equal(match.waitMinutes, 80);
});

test('segnala il primo rientro utile oltre la finestra scelta', () => {
  const developments = {
    '071 12': [segment({ ln: '71', vett: '5', start: '15:20', loc_s: 'PITA', end: '15:45', loc_e: 'GERB' })],
  };

  const result = searchReturns(developments, 'PITA', { now: NOW });
  assert.deepEqual(result.matches, []);
  assert.equal(result.upcoming.length, 1);
  assert.equal(result.upcoming[0].departure, '15:20');
  assert.equal(result.placeKnown, true);
});

test('distingue un posto cambio assente dagli orari da uno senza rientri', () => {
  const developments = {
    '071 12': [segment({ ln: '71', vett: '5', start: '14:10', loc_s: 'PITA', end: '14:35', loc_e: 'CATT' })],
  };

  const unknown = searchReturns(developments, 'LING', { now: NOW });
  assert.equal(unknown.placeKnown, false);
  assert.equal(unknown.passages, 0);

  const known = searchReturns(developments, 'PITA', { now: NOW });
  assert.equal(known.placeKnown, true);
  assert.equal(known.passages, 1);
  assert.deepEqual(known.matches, []);
});

test('riconosce quando gli orari coprono solo un altro tipo di servizio', () => {
  const developments = {
    '071 12': [
      segment({ ln: '71', vett: '5', start: '14:10', loc_s: 'PITA', end: '14:35', loc_e: 'GERB', gt: 'SABATO' }),
    ],
  };

  const result = searchReturns(developments, 'PITA', { now: NOW });
  assert.equal(result.service, 'feriali');
  assert.equal(result.passages, 0);
  assert.equal(result.passagesByService.sabato, 1);

  const forced = searchReturns(developments, 'PITA', { now: NOW, service: 'sabato' });
  assert.equal(forced.matches.length, 1);
  assert.equal(forced.matches[0].departure, '14:10');
});

test('distingue chi non vede il deposito da chi ci arriva dopo un giro lungo', () => {
  const developments = {
    // Passa dal posto cambio e finisce altrove: il deposito non lo vede.
    '071 12': [segment({ ln: '71', vett: '5', start: '14:10', loc_s: 'PITA', end: '14:35', loc_e: 'CATT' })],
    // Passa dal posto cambio e in deposito ci arriva, ma dopo tre ore di giro.
    '071 13': [segment({ ln: '71', vett: '6', start: '14:15', loc_s: 'PITA', end: '17:20', loc_e: 'GERB' })],
  };

  const result = searchReturns(developments, 'PITA', { now: NOW });
  assert.deepEqual(result.matches, []);
  assert.equal(result.passages, 2);
  assert.equal(result.noDepotChain, 1);
  assert.equal(result.longRides, 1);
  assert.equal(result.shortestLongRide, 185);
});
