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

/* Le 04:00 sono l'attacco piu' presto che l'Accordo prevede - e' l'inizio
   minimo dei T2R e dei 100 - quindi questo e' il caso limite vero, non un
   caso di comodo. */
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

/* Difesa, non un caso reale: nessun turno comincia di notte. L'Accordo mette
   l'attacco piu' presto alle 04:00, e i serali finiscono alle 02:30 ma non
   cominciano li'. Un 00:30 puo' arrivare solo da un turno battuto a mano con
   un errore, e allora l'ora tolta deve restare un'ora del quadrante invece di
   diventare un numero negativo o un 24:xx. */
test('un orario impossibile non produce un orario impossibile', () => {
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
