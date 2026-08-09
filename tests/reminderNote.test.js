import test from 'node:test';
import assert from 'node:assert/strict';
import { getReminderNote } from '../src/calendarExport.js';

/* La nota sotto "Aggiungi al calendario" deve dire a che ora suona il
   telefono, non com'e' fatto il file .ics. Gli orari qui sotto devono
   corrispondere alle due sveglie che buildShiftICS mette davvero
   nell'evento: una assoluta alle 20:00 del giorno prima, una a -PT1H. */

test('dice l ora vera dell avviso, non "un ora prima"', () => {
  const nota = getReminderNote({ start: '12:26' });
  assert.match(nota, /alle 20:00 della sera prima/);
  assert.match(nota, /alle 11:26/);
});

test('un turno di primo mattino avverte che non e una sveglia', () => {
  const nota = getReminderNote({ start: '04:00' });
  assert.match(nota, /alle 03:00/);
  assert.match(nota, /non una sveglia/);
});

test('dopo le sei la precisazione sulla sveglia non serve', () => {
  const nota = getReminderNote({ start: '06:30' });
  assert.match(nota, /alle 05:30/);
  assert.doesNotMatch(nota, /Orologio/);
});

/* Un'ora prima di mezzanotte e mezza e' il giorno prima: l'ora resta giusta
   e non deve diventare un numero negativo o un 24:xx. */
test('l ora prima di un turno di notte non esce dal quadrante', () => {
  assert.match(getReminderNote({ start: '00:30' }), /alle 23:30/);
});

test('senza orario non si inventa un ora', () => {
  const nota = getReminderNote({ start: '' });
  assert.doesNotMatch(nota, /alle \d\d:\d\d,/);
  assert.match(nota, /un'ora prima dell'attacco/);
});

test('una giornata senza turno non parla di avvisi', () => {
  const nota = getReminderNote({ type: 'special', title: 'Riposo' });
  assert.match(nota, /calendario del dispositivo/);
  assert.doesNotMatch(nota, /20:00/);
});
