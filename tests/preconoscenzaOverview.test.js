import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIMELINE_MINUTES,
  buildOverviewRows,
  buildTimelineBlocks,
  filterRows,
  getWorkIntervals,
  groupRowsByWeek,
  summarizeRows,
} from '../src/utils/preconoscenzaOverview.js';

function shift(iso, overrides = {}) {
  return {
    iso,
    date: new Date(`${iso}T00:00:00`),
    t: 'turno',
    l: '55',
    n: '132',
    i: '0512',
    e: '1340',
    li: 'GERB',
    le: 'PITA',
    ...overrides,
  };
}

function rest(iso, code = 'RP') {
  return { iso, date: new Date(`${iso}T00:00:00`), t: code };
}

// Lunedi 4 maggio 2026: la settimana va da lunedi 4 a domenica 10.
const TODAY = new Date(2026, 4, 4);

test('costruisce una riga per ogni giorno, in ordine di data', () => {
  const days = {
    '2026-05-05': rest('2026-05-05'),
    '2026-05-04': shift('2026-05-04'),
    '2026-05-06': { iso: '2026-05-06', date: new Date('2026-05-06T00:00:00'), t: 'RIS', ball: 'B03' },
  };

  const rows = buildOverviewRows(days, {}, { today: TODAY });
  assert.deepEqual(
    rows.map((row) => row.iso),
    ['2026-05-04', '2026-05-05', '2026-05-06'],
  );
  assert.deepEqual(
    rows.map((row) => row.kind),
    ['turno', 'riposo', 'ballottaggio'],
  );
  assert.equal(rows[0].title, 'Linea 55');
  assert.equal(rows[0].start, '05:12');
  assert.equal(rows[0].end, '13:40');
  assert.equal(rows[0].isToday, true);
  assert.equal(rows[1].isPast, false);
  assert.match(rows[2].subtitle, /^B03 · /);
});

test('usa gli sviluppi turno quando ci sono, con i due tratti dello spezzato', () => {
  const days = { '2026-05-04': shift('2026-05-04', { n: '012', i: '0600', e: '1930' }) };
  const enriched = {
    '2026-05-04': {
      isSplit: true,
      segments: [
        { start: '06:00', end: '10:15', loc_s: 'GERB', loc_e: 'PITA' },
        { start: '16:00', end: '19:30', loc_s: 'PITA', loc_e: 'GERB' },
      ],
    },
  };

  const [row] = buildOverviewRows(days, enriched, { today: TODAY });
  assert.equal(row.start, '06:00');
  assert.equal(row.end, '19:30');
  assert.equal(row.blocks.length, 2);
  assert.equal(row.isSplit, true);
  assert.equal(row.hasDevelopment, true);
});

test('il turno serale che scavalca la mezzanotte resta un intervallo unico', () => {
  const intervals = getWorkIntervals({ i: '1830', e: '0145' });
  assert.equal(intervals.length, 1);
  assert.equal(intervals[0].start, 18 * 60 + 30);
  assert.equal(intervals[0].end, 24 * 60 + 60 + 45);
});

test('le barre partono dalle 04:00 e restano dentro la finestra di 24 ore', () => {
  const [morning] = buildTimelineBlocks([{ start: 4 * 60, end: 8 * 60 }]);
  assert.equal(morning.left, 0);
  assert.equal(Math.round(morning.width), Math.round((240 / TIMELINE_MINUTES) * 100));

  const [night] = buildTimelineBlocks([{ start: 18 * 60 + 30, end: 24 * 60 + 105 }]);
  assert.ok(night.left > 50 && night.left < 70);
  assert.ok(night.left + night.width <= 100.001);
  assert.equal(night.startLabel, '18:30');
  assert.equal(night.endLabel, '01:45');
});

test('raggruppa per settimana da lunedi a domenica', () => {
  const days = {
    '2026-05-04': shift('2026-05-04'),
    '2026-05-10': rest('2026-05-10'),
    '2026-05-11': shift('2026-05-11'),
  };

  const weeks = groupRowsByWeek(buildOverviewRows(days, {}, { today: TODAY }));
  assert.equal(weeks.length, 2);
  assert.equal(weeks[0].rows.length, 2);
  assert.equal(weeks[0].shifts, 1);
  assert.equal(weeks[0].rests, 1);
  assert.equal(weeks[0].label, '4 - 10 maggio');
  assert.equal(weeks[1].rows.length, 1);
});

test('filtra e riepiloga per tipo di giornata', () => {
  const days = {
    '2026-05-04': shift('2026-05-04'),
    '2026-05-05': shift('2026-05-05', { l: '71', n: '420' }),
    '2026-05-06': rest('2026-05-06'),
    '2026-05-07': { iso: '2026-05-07', date: new Date('2026-05-07T00:00:00'), t: 'RIS' },
  };

  const rows = buildOverviewRows(days, {}, { today: TODAY });
  assert.equal(filterRows(rows, 'turni').length, 2);
  assert.equal(filterRows(rows, 'riposi').length, 1);
  assert.equal(filterRows(rows, 'ballottaggi').length, 1);
  assert.equal(filterRows(rows, 'tutto').length, 4);

  const summary = summarizeRows(rows);
  assert.equal(summary.days, 4);
  assert.equal(summary.shifts, 2);
  assert.equal(summary.rests, 1);
  assert.equal(summary.ballots, 1);
  assert.equal(summary.evening, 1);
  assert.deepEqual(summary.lines, ['55', '71']);
});
