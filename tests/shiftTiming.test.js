import test from 'node:test';
import assert from 'node:assert/strict';
import { describeShiftTiming, formatCountdown, shiftStartDate } from '../src/utils/shiftTiming.js';

function turno(iso, compactStart) {
  return { t: 'turno', iso, date: new Date(`${iso}T00:00:00`), i: compactStart };
}

test('costruisce la data di attacco dal giorno e dall orario compatto', () => {
  const start = shiftStartDate(turno('2026-04-02', '0407'));
  assert.equal(start.getHours(), 4);
  assert.equal(start.getMinutes(), 7);
  assert.equal(start.getDate(), 2);
});

test('non calcola l attacco per riposi e giorni senza orario', () => {
  assert.equal(shiftStartDate({ t: 'RP', iso: '2026-04-04' }), null);
  assert.equal(shiftStartDate(turno('2026-04-02', '')), null);
});

test('formatta il conto alla rovescia', () => {
  assert.equal(formatCountdown(45), '45 min');
  assert.equal(formatCountdown(120), '2h');
  assert.equal(formatCountdown(560), '9h 20m');
  assert.equal(formatCountdown(-5), '');
});

test('conta quanto manca all attacco entro le 48 ore', () => {
  const day = turno('2026-04-02', '0407');
  const now = new Date('2026-04-01T18:47:00');
  assert.equal(describeShiftTiming(day, now).countdown, '9h 20m');
});

test('oltre le 48 ore il conto alla rovescia non serve', () => {
  const day = turno('2026-04-10', '0407');
  const now = new Date('2026-04-01T18:47:00');
  assert.equal(describeShiftTiming(day, now).countdown, '');
});

test('un turno gia passato non produce conto alla rovescia', () => {
  const day = turno('2026-04-02', '0407');
  const now = new Date('2026-04-02T09:00:00');
  const timing = describeShiftTiming(day, now);
  assert.equal(timing.countdown, '');
  assert.equal(timing.wakeUp, '');
});

test('suggerisce la sveglia solo per gli attacchi prima delle 6', () => {
  const now = new Date('2026-04-01T18:00:00');
  assert.equal(describeShiftTiming(turno('2026-04-02', '0407'), now, 75).wakeUp, '02:52');
  assert.equal(describeShiftTiming(turno('2026-04-02', '0835'), now, 75).wakeUp, '');
});

test('segnala i turni imminenti entro tre ore', () => {
  const day = turno('2026-04-02', '0407');
  assert.equal(describeShiftTiming(day, new Date('2026-04-02T02:30:00')).isImminent, true);
  assert.equal(describeShiftTiming(day, new Date('2026-04-01T18:00:00')).isImminent, false);
});
