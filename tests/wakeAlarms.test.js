import test from 'node:test';
import assert from 'node:assert/strict';
import { collectWakeAlarms, summarizeWakeAlarms } from '../src/utils/wakeAlarms.js';
import { buildWakeAlarmsICS, WAKE_EVENT_PREFIX } from '../src/calendarExport.js';

/* La forma che esce da `enrichShiftDays()`: mappa iso -> voce. */
function enriched(entries) {
  return entries.reduce((acc, [iso, day, segments = []]) => {
    acc[iso] = { iso, day: { iso, ...day }, segments };
    return acc;
  }, {});
}

function turno(i, n, extra = {}) {
  return { t: 'turno', i, n, l: '5', e: '1015', ...extra };
}

test("prende i turni che attaccano fra le 04:00 e le 08:30, sveglia un'ora prima", () => {
  const alarms = collectWakeAlarms(
    enriched([
      ['2026-04-01', turno('0400', '101')],
      ['2026-04-02', turno('0530', '102')],
      ['2026-04-03', turno('0815', '201')],
    ]),
  );

  assert.deepEqual(
    alarms.map((alarm) => [alarm.iso, alarm.wakeTime, alarm.startTime]),
    [
      ['2026-04-01', '03:00', '04:00'],
      ['2026-04-02', '04:30', '05:30'],
      ['2026-04-03', '07:15', '08:15'],
    ],
  );
});

/* Gli estremi sono compresi: fra una sveglia di troppo e una mancante, la
   seconda costa un turno. */
test('gli estremi della finestra sono compresi', () => {
  const alarms = collectWakeAlarms(
    enriched([
      ['2026-04-01', turno('0400', '101')],
      ['2026-04-02', turno('0830', '202')],
    ]),
  );
  assert.deepEqual(alarms.map((alarm) => alarm.startTime), ['04:00', '08:30']);
});

test('appena fuori dalla finestra non entra', () => {
  const alarms = collectWakeAlarms(
    enriched([
      ['2026-04-01', turno('0359', '101')],
      ['2026-04-02', turno('0831', '202')],
    ]),
  );
  assert.deepEqual(alarms, []);
});

/* Guardare la categoria dell'Accordo invece dell'ora lascerebbe senza sveglia
   il T2R delle quattro, che e' il turno che ne ha piu' bisogno. */
test("un 2 riprese che attacca alle 04:20 ha la sua sveglia, non solo i 100", () => {
  const alarms = collectWakeAlarms(enriched([['2026-04-01', turno('0420', '012')]]));
  assert.equal(alarms.length, 1);
  assert.equal(alarms[0].wakeTime, '03:20');
});

test('i turni del pomeriggio e della sera restano fuori', () => {
  const alarms = collectWakeAlarms(
    enriched([
      ['2026-04-01', turno('1130', '301')],
      ['2026-04-02', turno('1715', '401')],
    ]),
  );
  assert.deepEqual(alarms, []);
});

/* Un turno delle 06:00 o delle 07:30 prima non entrava: la finestra ora
   arriva alle 08:30 e li prende. */
test('la mattina piena rientra nella finestra', () => {
  const alarms = collectWakeAlarms(
    enriched([
      ['2026-04-01', turno('0600', '103')],
      ['2026-04-02', turno('0730', '204')],
    ]),
  );
  assert.deepEqual(alarms.map((alarm) => alarm.wakeTime), ['05:00', '06:30']);
});

test('riposi, ballottaggi e giorni senza turno restano fuori', () => {
  const alarms = collectWakeAlarms(
    enriched([
      ['2026-04-01', { t: 'RIS', n: '', i: '' }],
      ['2026-04-02', { t: 'RS', n: '', i: '' }],
      ['2026-04-03', turno('0400', '101')],
    ]),
  );
  assert.deepEqual(alarms.map((alarm) => alarm.iso), ['2026-04-03']);
});

/* Gli Orari Linee sono il dato piu' fine: quando c'e' lo sviluppo, l'attacco
   e' quello del primo tratto — la stessa scelta che fa l'export calendario. */
test("lo sviluppo, quando c'e', decide l'ora d'attacco", () => {
  const alarms = collectWakeAlarms(
    enriched([['2026-04-01', turno('0400', '101'), [{ start: '04:35', end: '10:15', loc_s: 'GERB', loc_e: 'GERB' }]]]),
  );
  assert.equal(alarms[0].startTime, '04:35');
  assert.equal(alarms[0].wakeTime, '03:35');
});

/* Un'ora illeggibile vale 00:00: cade sotto il limite basso della finestra, e
   una sveglia a mezzanotte sarebbe peggio di nessuna sveglia. */
test("un turno senza ora leggibile non genera sveglie", () => {
  const alarms = collectWakeAlarms(enriched([['2026-04-01', turno('', '101')]]));
  assert.deepEqual(alarms, []);
});

test('le sveglie escono in ordine di data', () => {
  const alarms = collectWakeAlarms(
    enriched([
      ['2026-04-10', turno('0500', '104')],
      ['2026-04-02', turno('0400', '101')],
    ]),
  );
  assert.deepEqual(alarms.map((alarm) => alarm.iso), ['2026-04-02', '2026-04-10']);
});

test("l'anticipo si puo' cambiare", () => {
  const alarms = collectWakeAlarms(enriched([['2026-04-01', turno('0400', '101')]]), { leadMinutes: 90 });
  assert.equal(alarms[0].wakeTime, '02:30');
});

test('il riassunto dice quante sono e fra che ore', () => {
  const alarms = collectWakeAlarms(
    enriched([
      ['2026-04-01', turno('0400', '101')],
      ['2026-04-02', turno('0530', '102')],
    ]),
  );
  const summary = summarizeWakeAlarms(alarms);
  assert.equal(summary.count, 2);
  assert.equal(summary.earliest, '03:00');
  assert.equal(summary.latest, '04:30');
});

test('senza turni del mattino il riassunto non inventa orari', () => {
  assert.deepEqual(summarizeWakeAlarms([]), { count: 0, earliest: '', latest: '', firstIso: '', lastIso: '' });
});

test("l'ICS delle sveglie ha un evento per sveglia, all'ora giusta", () => {
  const alarms = collectWakeAlarms(enriched([['2026-04-01', turno('0400', '101')]]));
  const ics = buildWakeAlarmsICS(alarms);

  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART:20260401T030000/);
  assert.match(ics, /DTEND:20260401T031500/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
});

/* Il titolo e' il contratto con la scorciatoia che crea le sveglie vere: se
   cambia, quella smette di trovare gli eventi senza dirlo a nessuno. */
test("il titolo dell'evento resta quello che la scorciatoia cerca", () => {
  const alarms = collectWakeAlarms(enriched([['2026-04-01', turno('0400', '101')]]));
  assert.equal(WAKE_EVENT_PREFIX, 'Sveglia turno');
  assert.match(buildWakeAlarmsICS(alarms), /SUMMARY:Sveglia turno 5 101/);
});

/* Senza la scorciatoia l'evento deve almeno avvisare da solo, all'ora esatta
   e non prima. */
test("ogni evento porta il suo promemoria all'ora della sveglia", () => {
  const alarms = collectWakeAlarms(enriched([['2026-04-01', turno('0400', '101')]]));
  const ics = buildWakeAlarmsICS(alarms);
  assert.match(ics, /BEGIN:VALARM/);
  assert.match(ics, /TRIGGER:-PT0M/);
});

test('nessuna sveglia, nessun evento', () => {
  const ics = buildWakeAlarmsICS([]);
  assert.doesNotMatch(ics, /BEGIN:VEVENT/);
  assert.match(ics, /END:VCALENDAR/);
});
