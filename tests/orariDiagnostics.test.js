import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrari } from '../src/parserOrari.js';
import { buildOrariReport, countExits, summarizeByGt, summarizePages } from '../src/utils/orariDiagnostics.js';

/* Tre pagine: la prima dichiara il festivo, le due dopo non dichiarano niente
   e se lo prendono da lei. E' il meccanismo che va reso visibile. */
const PAGINE = [
  'Gruppo 05 - FESTIVO - Versione 2\n05 / 1 05:10 GERB A 05:32 CATT',
  '05 / 2 06:10 GERB A 06:32 CATT',
  '05 / 3 07:10 GERB A 07:32 CATT',
];

test('la diagnostica non cambia quello che il parser produce', () => {
  const senza = parseOrari(PAGINE);
  const diagnostics = [];
  const con = parseOrari(PAGINE, { diagnostics });
  assert.deepEqual(con, senza, 'gli sviluppi devono essere identici');
  assert.equal(diagnostics.length, 3, 'e il referto si riempie a parte');
});

test('si vede quale pagina ha dichiarato il servizio e quale lo ha ereditato', () => {
  const diagnostics = [];
  parseOrari(PAGINE, { diagnostics });

  assert.equal(diagnostics[0].own, 'FESTIVO', 'la prima lo dichiara');
  assert.equal(diagnostics[1].own, '', 'la seconda no');
  assert.equal(diagnostics[2].own, '', 'la terza nemmeno');
  assert.equal(diagnostics[1].gt, 'FESTIVO', 'ma il tipo assegnato e quello ereditato');
});

test('le pagine si leggono come tratte, con quante si sono dichiarate', () => {
  const diagnostics = [];
  parseOrari(PAGINE, { diagnostics });
  const summary = summarizePages(diagnostics);

  assert.equal(summary.total, 3);
  assert.equal(summary.recognized, 1);
  assert.equal(summary.inherited, 2);
  assert.deepEqual(
    summary.runs.map((run) => `${run.from}-${run.to} ${run.gt} ${run.recognized}/${run.pages}`),
    ['1-3 FESTIVO 1/3'],
    'una tratta sola con una pagina riconosciuta su tre',
  );
});

test('una tratta nuova comincia quando il tipo cambia', () => {
  const summary = summarizePages([
    { gt: 'LUN - VEN', own: 'LUN - VEN', page: 1 },
    { gt: 'LUN - VEN', own: '', page: 2 },
    { gt: 'SABATO', own: 'SABATO', page: 3 },
  ]);
  assert.deepEqual(
    summary.runs.map((run) => `${run.from}-${run.to} ${run.service}`),
    ['1-2 feriali', '3-3 sabato'],
  );
});

/* Righe lette contro mezzi distinti: la distanza fra i due numeri e' quanto
   il parser sta duplicando, e senza vederla non si sa se un totale alto sia
   il deposito o l'archiviazione. */
test('le uscite si contano sia per riga sia per mezzo', () => {
  const segments = [
    { start: '05:10', loc_s: 'GERB', end: '05:32', loc_e: 'CATT', ln: '05', gt: 'LUN - VEN' },
    { start: '05:10', loc_s: 'GERB', end: '05:32', loc_e: 'CATT', ln: '05', gt: 'LUN - VEN' },
    { start: '05:20', loc_s: 'GERB', end: '05:42', loc_e: 'CATT', ln: '05', gt: 'LUN - VEN' },
  ];
  assert.deepEqual(countExits(segments), { rows: 3, unique: 2 });
});

test('i rientri e i giri interni al deposito non sono uscite', () => {
  const segments = [
    { start: '05:32', loc_s: 'CATT', end: '06:15', loc_e: 'GERB', ln: '05', gt: 'LUN - VEN' },
    { start: '04:00', loc_s: 'GERB', end: '10:15', loc_e: 'GERB', ln: '05', gt: 'LUN - VEN' },
  ];
  assert.deepEqual(countExits(segments), { rows: 0, unique: 0 });
});

test('il riepilogo raggruppa per intestazione e dice a che servizio finisce', () => {
  const developments = {
    '05 101': [
      { start: '05:10', loc_s: 'GERB', end: '05:32', loc_e: 'CATT', ln: '05', gt: 'LUN - VEN' },
      { start: '05:10', loc_s: 'GERB', end: '05:32', loc_e: 'CATT', ln: '05', gt: 'FESTIVO' },
    ],
  };
  const summary = summarizeByGt(developments);
  assert.deepEqual(
    summary.map((item) => `${item.gt}=${item.service}`),
    ['LUN - VEN=feriali', 'FESTIVO=festivi'],
  );
});

test('il referto sta in piedi anche senza le pagine', () => {
  const report = buildOrariReport({ developments: {}, pages: null });
  assert.match(report, /pagine: non disponibili/);
  assert.match(report, /nessuno sviluppo caricato/);
});

test('il referto dice le tratte e i conti per intestazione', () => {
  const diagnostics = [];
  const developments = parseOrari(PAGINE, { diagnostics });
  const report = buildOrariReport({ developments, pages: diagnostics });

  assert.match(report, /pagine 3 · riconosciute 1 · ereditate 2/);
  assert.match(report, /p1-3 "FESTIVO" \[festivi\] ric 1\/3/);
  assert.match(report, /"FESTIVO" \[festivi\] segm \d+ · usc \d+ → \d+/);
});
