import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectRientriLine,
  findGraphicHints,
  isRientriKey,
  parseDepotReturns,
  parseDepotTransferTimes,
  rientriKey,
} from '../src/parserRientri.js';

// I numeri sono quelli del grafico di servizio della linea 5, versione Q01 del
// 03/08/2026, e tornano con la pagina dei turni: la 102 prende la vettura 2 a
// CATT alle 04.57 dopo essere uscita alle 04.48, cioe' i nove minuti che la
// tabella dichiara.
const TRANSFER_TABLE = `
  TEMPI DI USCITA / RIENTRO 5
  GERB - OBFR 25 20
  GERB - OSET 7 7
  GERB - CATT 9 9
  GERB - ARBA 25
`;

// Come esce il testo leggendo il grafico riga per riga.
const BY_ROW = `${TRANSFER_TABLE}
  Linea U.L. 20.14 CATT 5 Entra 20.23
  Linea U.L. 21.02 CATT 5 Entra 21.11
  Linea U.L. 21.30 CATT 5 Entra 21.39
  Linea U.L. 21.51 OSET 5 Entra 21.58
  Linea U.L. 00.25 OBFR 5 Entra 00.45
  Linea U.L. 00.41 ARBA 5 Entra 01.06
  Linea U.L. 00.55 OBFR 5 Entra 01.15
  Linea U.L. 01.25 OBFR 5 Entra 01.45
`;

// Come esce leggendo per colonne, con le etichette delle vetture in mezzo: e'
// il caso che rompe gli accoppiamenti fatti a occhio.
const BY_COLUMN = `${TRANSFER_TABLE}
  8 Esce 04.13 ARBA GER I.L. 04.22 CATT
  Linea 5 U.L. 20.14 CATT Entra 20.23
  3 Esce 04.17 OBFR GER I.L. 04.24 OSET
  Linea 5 U.L. 21.02 CATT Entra 21.11
  2 Esce 04.48 ARBA GER I.L. 04.57 CATT
  Linea 5 U.L. 21.51 OSET Entra 21.58
`;

test('la tabella dice quanto ci vuole dal capolinea al deposito', () => {
  const transfers = parseDepotTransferTimes(TRANSFER_TABLE);
  assert.deepEqual(transfers.CATT, { out: 9, in: 9 });
  assert.deepEqual(transfers.OSET, { out: 7, in: 7 });
  // Sulla 5 uscire per Orbassano costa cinque minuti piu' che rientrarne.
  assert.deepEqual(transfers.OBFR, { out: 25, in: 20 });
  // Una riga con un numero solo vale per entrambi i versi.
  assert.deepEqual(transfers.ARBA, { out: 25, in: 25 });
  assert.equal(transfers.GERB, undefined);
});

test('la linea si riconosce dalle tabelle in fondo alla pagina', () => {
  assert.equal(detectRientriLine(TRANSFER_TABLE), '5');
  assert.equal(detectRientriLine('TEMPI DI PERCORRENZA ANDATA / RITORNO 17'), '17');
  assert.equal(detectRientriLine('LINEA 62 ORBASSANO'), '62');
  assert.equal(detectRientriLine('niente di utile'), '');
});

test('ogni vettura produce l ultima corsa e il suo ingresso in deposito', () => {
  const returns = parseDepotReturns(BY_ROW, { gt: 'LUN - VEN', ver: 'Q01' });
  assert.equal(returns.length, 8);

  const first = returns[0];
  assert.equal(first.loc_s, 'CATT');
  assert.equal(first.start, '20:14');
  assert.equal(first.end, '20:23');
  assert.equal(first.loc_e, 'GERB');
  assert.equal(first.lineaNorm, '5');
  assert.equal(first.gt, 'LUN - VEN');

  // Da Cattaneo al Gerbido sono nove minuti, non le cinque ore della ripresa.
  const fromCattaneo = returns.filter((item) => item.loc_s === 'CATT');
  assert.equal(fromCattaneo.length, 3);
  assert.deepEqual(
    fromCattaneo.map((item) => `${item.start}→${item.end}`),
    ['20:14→20:23', '21:02→21:11', '21:30→21:39'],
  );
});

test('il rientro dopo mezzanotte non diventa un salto all indietro', () => {
  const returns = parseDepotReturns(BY_ROW, {});
  const midnight = returns.find((item) => item.start === '00:55');
  assert.equal(midnight.end, '01:15');
  // 00:25 OBFR → 00:45 sono i venti minuti del rientro da Orbassano.
  assert.ok(returns.some((item) => item.start === '00:25' && item.end === '00:45'));
});

test('le colonne mescolate non fanno accoppiare U.L. ed Entra sbagliati', () => {
  const returns = parseDepotReturns(BY_COLUMN, {});
  assert.equal(returns.length, 3);
  assert.deepEqual(
    returns.map((item) => `${item.loc_s} ${item.start}→${item.end}`),
    ['CATT 20:14→20:23', 'CATT 21:02→21:11', 'OSET 21:51→21:58'],
  );
});

test('senza Entra credibile non si inventa un rientro', () => {
  // Un Entra lontanissimo non e' il rientro di questa corsa.
  assert.deepEqual(parseDepotReturns(`${TRANSFER_TABLE} U.L. 21.02 CATT Entra 23.40`, {}), []);
  // E il deposito non e' il capolinea di partenza di se stesso.
  assert.deepEqual(parseDepotReturns(`${TRANSFER_TABLE} U.L. 21.02 GERB Entra 21.11`, {}), []);
  assert.deepEqual(parseDepotReturns('pagina senza grafico', {}), []);
});

test('la chiave dei rientri non e quella di un turno', () => {
  assert.equal(rientriKey('5', 'LUN - VEN'), 'RIENTRI 5 LUN - VEN');
  assert.ok(isRientriKey(rientriKey('5', 'LUN - VEN')));
  assert.equal(isRientriKey('05 302'), false);
});

test('legge le forme che il PDF produce quando perde separatori e spazi', () => {
  // Ora senza separatore e capolinea attaccati: "2151" e "GERB-OSET".
  const compact = `
    TEMPI DI USCITA / RIENTRO 5
    GERB-OSET 7 7
    GERB-CATT 9 9
    Linea 5 UL 2151 OSET Entra 2158
    Linea 5 U.L 2102 CATT Entra 2111
  `;
  const returns = parseDepotReturns(compact, {});
  assert.deepEqual(
    returns.map((item) => `${item.loc_s} ${item.start}→${item.end}`),
    ['OSET 21:51→21:58', 'CATT 21:02→21:11'],
  );
  assert.deepEqual(parseDepotTransferTimes(compact).OSET, { out: 7, in: 7 });
});

test('il referto distingue la pagina assente dalla pagina non riconosciuta', () => {
  assert.deepEqual(findGraphicHints('05 302 5 / 2 16.33 CATT R 21.58 GERB'), { excerpt: '', markers: [] });
  const hints = findGraphicHints('LINEA 5 TEMPI DI USCITA / RIENTRO 5 UL 2151 OSET ENTRA 2158');
  assert.deepEqual(hints.markers, ['ul', 'entra', 'tempi']);
  assert.match(hints.excerpt, /TEMPI DI USCITA/);
});
