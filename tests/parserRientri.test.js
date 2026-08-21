import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectRientriLine,
  findGraphicHints,
  isGraphicKey,
  isRientriKey,
  isUsciteKey,
  parseDepotExits,
  parseDepotReturns,
  parseDepotTransferTimes,
  parseLegend,
  rientriKey,
  usciteKey,
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

test('nemmeno la chiave delle uscite e quella di un turno', () => {
  assert.equal(usciteKey('5', 'LUN - VEN'), 'USCITE 5 LUN - VEN');
  assert.ok(isUsciteKey(usciteKey('5', 'LUN - VEN')));
  assert.equal(isUsciteKey('05 302'), false);
  // Le due chiavi non si confondono fra loro, o le uscite finirebbero fra i
  // rientri e viceversa.
  assert.equal(isUsciteKey(rientriKey('5', 'LUN - VEN')), false);
  assert.equal(isRientriKey(usciteKey('5', 'LUN - VEN')), false);
  // E insieme sono "tutto quello che non e' uno sviluppo turno".
  assert.ok(isGraphicKey(rientriKey('5', '')) && isGraphicKey(usciteKey('5', '')));
  assert.equal(isGraphicKey('05 302'), false);
});

test('ogni vettura produce anche l uscita dal deposito e il suo ingresso in linea', () => {
  const exits = parseDepotExits(BY_COLUMN, { gt: 'LUN - VEN', ver: 'Q01' });
  assert.equal(exits.length, 3);

  const first = exits[0];
  assert.equal(first.loc_s, 'GERB');
  assert.equal(first.start, '04:13');
  assert.equal(first.end, '04:22');
  assert.equal(first.loc_e, 'CATT');
  assert.equal(first.lineaNorm, '5');
  assert.equal(first.gt, 'LUN - VEN');

  // Nove minuti per Cattaneo e sette per Settembrini: sono i minuti della
  // tabella, non le ore di una ripresa.
  assert.deepEqual(
    exits.map((item) => `${item.loc_e} ${item.start}→${item.end}`),
    ['CATT 04:13→04:22', 'OSET 04:17→04:24', 'CATT 04:48→04:57'],
  );
});

/* Il grafico dice dove la vettura entra in linea, non da che parte prosegue:
   una direzione qui sarebbe inventata, e la palina che ne verrebbe fuori
   manderebbe qualcuno dal lato sbagliato della strada. */
test('l uscita non porta una direzione che il grafico non dichiara', () => {
  const [exit] = parseDepotExits(BY_COLUMN, {});
  assert.equal(exit.dir, '');
});

test('senza I.L. credibile non si inventa un uscita', () => {
  // Un I.L. lontanissimo non e' l'ingresso in linea di questa uscita.
  assert.deepEqual(parseDepotExits(`${TRANSFER_TABLE} 8 Esce 04.13 I.L. 06.40 CATT`, {}), []);
  // E il deposito non e' il posto dove una vettura entra in linea.
  assert.deepEqual(parseDepotExits(`${TRANSFER_TABLE} 8 Esce 04.13 I.L. 04.22 GERB`, {}), []);
  assert.deepEqual(parseDepotExits('pagina senza grafico', {}), []);
  // La pagina dei turni non deve produrre uscite: e' tutto il punto.
  assert.deepEqual(parseDepotExits('05 101 5 / 1 04.48 GERB - 10.15 CATT', {}), []);
});

/* Lo stesso rimedio dei rientri: quando la tabella dichiara il tempo, e' quello
   a dire quale I.L. appartiene a quale Esce. */
test('le colonne mescolate non fanno accoppiare Esce e I.L. sbagliati', () => {
  const mescolato = `${TRANSFER_TABLE}
    2 Esce 04.48 ARBA GER I.L. 04.53 OSET I.L. 04.57 CATT
  `;
  const [exit] = parseDepotExits(mescolato, {});
  // 04.53 sarebbe plausibile, ma da Settembrini la tabella dichiara sette
  // minuti e non cinque: i nove di Cattaneo combaciano, e vince quello.
  assert.equal(exit.loc_e, 'CATT');
  assert.equal(exit.end, '04:57');
});

test('l uscita dopo mezzanotte non diventa un salto all indietro', () => {
  const [exit] = parseDepotExits(`${TRANSFER_TABLE} 4 Esce 23.58 I.L. 00.07 CATT`, {});
  assert.equal(exit.start, '23:58');
  assert.equal(exit.end, '00:07');
});

test('le uscite si leggono anche quando il PDF perde separatori e spazi', () => {
  const compact = `
    TEMPI DI USCITA / RIENTRO 5
    GERB-CATT 9 9
    Esce 0448 IL 0457 CATT
  `;
  const [exit] = parseDepotExits(compact, {});
  assert.equal(`${exit.start}→${exit.end} ${exit.loc_e}`, '04:48→04:57 CATT');
});

/* Il numero prima di "Esce" e' la vettura in una forma del testo e la coda
   della tabella dei tempi in un'altra - "GERB - ARBA 25" seguito da "8 Esce" -
   e le due non si distinguono. Meglio nessun numero che quello di un altro
   mezzo: nel piazzale ci si va a colpo sicuro o non ci si va. */
test('l uscita non porta un numero di vettura indistinguibile da un tempo', () => {
  assert.equal(parseDepotExits(BY_COLUMN, {})[0].vett, '');
  const dallaTabella = parseDepotExits(`${TRANSFER_TABLE} Esce 04.48 I.L. 04.57 CATT`, {});
  assert.equal(dallaTabella[0].vett, '', 'il 25 di "GERB - ARBA 25" non e una vettura');
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
  // L'I.L. conta come marcatore solo quando ha la sua ora dietro: "il" da solo
  // e' una parola come un'altra, e un marcatore falso vale meno di niente.
  assert.deepEqual(findGraphicHints('8 ESCE 04.13 I.L. 04.22 CATT').markers, ['esce', 'il']);
  assert.deepEqual(findGraphicHints('IL DEPOSITO DEL GERBIDO').markers, []);
});

test('la legenda del PDF traduce i codici nel posto vero', () => {
  const legenda = `
    Legenda
    OBFR = ORBASSANO - STRADA TORINO - Capolinea andata 5
    BNCE = BEINASCO - CENTRO
    OSET = C. ORBASSANO / C. SETTEMBRINI
    CATT = P.ZA CATTANEO - Posto cambio
    ORBX = L.GO ORBASSANO
    ARBA = P.ZA ARBARELLO - Capolinea ritorno 5
    GERB = DEPOSITO GERBIDO
  `;
  const legend = parseLegend(legenda);

  assert.equal(legend.CATT.label, 'P.za Cattaneo');
  assert.equal(legend.OSET.label, 'C. Orbassano / C. Settembrini');
  assert.equal(legend.OBFR.label, 'Orbassano - Strada Torino');
  assert.equal(legend.ORBX.label, 'L.go Orbassano');
  // Il documento dice anche a cosa serve il posto: sono parole sue.
  assert.equal(legend.CATT.role, 'cambio');
  assert.equal(legend.OBFR.role, 'capolinea');
  assert.equal(legend.BNCE.role, '');
});

test('la legenda regge anche senza spazi intorno all uguale', () => {
  assert.equal(parseLegend('Legenda: GERB=DEPOSITO GERBIDO').GERB.label, 'Deposito Gerbido');
  assert.deepEqual(parseLegend('05 302 5 / 2 16.33 CATT R 21.58 GERB'), {});
});

test('la linea si ricava anche dai codici dell orario tipo', () => {
  // Sul grafico l'intestazione non porta la parola "linea": restano i codici.
  assert.equal(detectRientriLine('CODICI H05Q0101 A05Q0101 W05Q0101'), '5');
  assert.equal(detectRientriLine('CODICI A58BQ0101'), '58B');
});

test('il capolinea del grafico trova la sua palina passando dalla legenda', () => {
  // I tre casi visti sull'app, con i tempi che il grafico dichiara.
  const casi = [
    ['74', 'GORX', 'V. GORINI', 2, '693'],
    ['63', 'NEGR', 'NEGARVILLE', 11, '1158'],
    ['132', 'FERM', 'FERMI', 20, '5001'],
  ];

  casi.forEach(([line, code, nome, minuti, palina]) => {
    const text = `
      LINEA ${line}
      TEMPI DI USCITA / RIENTRO ${line}
      GERB - ${code} ${minuti} ${minuti}
      Legenda ${code} = ${nome} - Capolinea
      GERB = DEPOSITO GERBIDO
      Linea ${line} U.L. 12.53 ${code} Entra 12.55
    `;
    const [rientro] = parseDepotReturns(text, {});
    assert.equal(rientro.palina, palina, `${code} doveva essere la palina ${palina}`);
    assert.ok(Number.isFinite(rientro.position.lat), `${code} senza posizione`);
  });
});

test('un capolinea troppo lontano per il tempo dichiarato viene buttato', () => {
  // Fermi sta a quattro chilometri dal deposito: due minuti vorrebbero dire
  // centoventi all'ora, quindi il nome ha pescato la fermata sbagliata.
  const text = `
    LINEA 132
    TEMPI DI USCITA / RIENTRO 132
    GERB - FERM 2 2
    Legenda FERM = FERMI - Capolinea
    Linea 132 U.L. 13.25 FERM Entra 13.27
  `;
  const [rientro] = parseDepotReturns(text, {});
  assert.equal(rientro.position, null);
  assert.equal(rientro.palina, '');
  // Il rientro resta: e' l'orario a essere certo, non la posizione.
  assert.equal(rientro.start, '13:25');
});

test('senza legenda il rientro resta senza posizione, non con una sbagliata', () => {
  const [rientro] = parseDepotReturns(
    'LINEA 74 TEMPI DI USCITA / RIENTRO 74 GERB - GORX 2 2 Linea 74 U.L. 12.53 GORX Entra 12.55',
    {},
  );
  assert.equal(rientro.position, null);
  assert.equal(rientro.loc_s, 'GORX');
});
