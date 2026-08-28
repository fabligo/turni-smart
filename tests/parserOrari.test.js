import test from 'node:test';
import assert from 'node:assert/strict';
import { getDevSegments, parseOrari } from '../src/parserOrari.js';

/* Le due pagine del PDF Orari, nella forma che il testo estratto ha davvero
   (-> `docs/dati.md`, «I PDF di GTT»).

   La pagina dei turni da' una riga per ripresa: il 5/304 attacca in deposito
   alle 05.10 e stacca alle 19.40, con la pausa in mezzo.

   Il grafico di servizio della stessa linea ha righe che si somigliano - la
   linea, un numero, due orari e due posti - ma quel numero e' la **vettura**,
   non il turno: `5 / 4 06.00 CATT A 06.35 OSET` e' una corsa della vettura 4,
   non lo sviluppo del turno 4. */
const PAGINA_TURNI = `
TURNI DEL PERSONALE gruppo 5 - LUN - VEN - Versione Q01
05 302 5 / 2 16.33 CATT R 21.58 GERB 05.25
05 304 5 / 4 05.10 GERB A 09.30 CATT 04.20
     5 / 4 15.00 CATT R 19.40 GERB 04.40
`;

const PAGINA_GRAFICO = `
GRAFICO DI SERVIZIO LINEA 5 - LUN - VEN - Versione Q01
CATT = P.ZA CATTANEO
OSET = SETTEMBRINI
TEMPI DI USCITA / RIENTRO 5
GERB - CATT 9 9
GERB - OSET 7 7
4 Esce 04.48 ARBA GER I.L. 04.57 CATT
2 Esce 05.13 OBFR GER I.L. 05.20 OSET
5 / 4 06.00 CATT A 06.35 OSET
5 / 4 06.40 OSET R 07.15 CATT
Linea 5 U.L. 21.51 OSET Entra 21.58
`;

// Lunedi 24 agosto 2026: feriale, come le pagine.
const FERIALE = new Date(2026, 7, 24);

function preShift(overrides = {}) {
  return { l: '5', n: '304', i: '0510', e: '1940', li: 'GERB', le: 'GERB', ...overrides };
}

test('il grafico di servizio non diventa un turno', () => {
  const developments = parseOrari([PAGINA_TURNI, PAGINA_GRAFICO]);

  /* `05 4` sarebbe la vettura 4 scambiata per il turno 4 della linea 5: un
     turno che non esiste, e - se quel turno esistesse davvero - le sue corse
     mescolate a quelle di un altro. */
  assert.equal(developments['05 4'], undefined);
  assert.deepEqual(
    Object.keys(developments).filter((key) => !key.startsWith('RIENTRI') && !key.startsWith('USCITE')),
    ['05 302', '05 304'],
  );
});

test('le corse del grafico non si attaccano in coda al turno della pagina prima', () => {
  const developments = parseOrari([PAGINA_TURNI, PAGINA_GRAFICO]);

  /* Lo stato della tabella attraversa le pagine dello stesso servizio, percio'
     una riga senza codice davanti prosegue l'ultimo turno letto. Sul grafico
     quelle righe sono corse di una vettura, e proseguivano il 5/304. */
  assert.deepEqual(
    developments['05 304'].map((segment) => `${segment.start} ${segment.loc_s} ${segment.end} ${segment.loc_e}`),
    ['05:10 GERB 09:30 CATT', '15:00 CATT 19:40 GERB'],
  );
});

test('lo sviluppo del turno resta quello del turno, col grafico caricato', () => {
  const soloTurni = parseOrari([PAGINA_TURNI]);
  const conGrafico = parseOrari([PAGINA_TURNI, PAGINA_GRAFICO]);

  const atteso = getDevSegments(soloTurni, '5', '304', FERIALE, preShift());
  const ottenuto = getDevSegments(conGrafico, '5', '304', FERIALE, preShift());

  assert.equal(atteso.length, 2);
  assert.deepEqual(ottenuto, atteso);
});

test('un rientro non diventa lo sviluppo di un turno che non c e', () => {
  const developments = parseOrari([PAGINA_TURNI, PAGINA_GRAFICO]);

  /* Il turno 5/399 sulla pagina non c'e'. Prima o poi capita: una pagina che
     il parser non legge, o un turno di un'altra linea. Quando manca, la scheda
     mostra quello che dice la preconoscenza e basta - meglio niente che un
     dato inventato (-> `docs/decisioni/0003`).

     Gli orari qui sono quelli del trasferimento in deposito letto dal grafico:
     e' esattamente il tratto che veniva pescato al posto dello sviluppo. */
  const segments = getDevSegments(developments, '5', '399', FERIALE, preShift({ n: '399', i: '2151', e: '2158', li: 'OSET', le: 'GERB' }));

  assert.deepEqual(segments, []);
});

test('il ripiego trova lo stesso turno quando la linea e scritta in un altro modo', () => {
  const developments = parseOrari([PAGINA_TURNI, PAGINA_GRAFICO]);

  /* La preconoscenza e gli Orari non scrivono sempre la linea allo stesso
     modo, e quando le chiavi non combaciano il turno si cerca per somiglianza.
     Qui il numero di turno e la finestra sono quelli del 5/302: e' lui. */
  const segments = getDevSegments(developments, '5A', '302', FERIALE, preShift({ n: '302', i: '1633', e: '2158', li: 'CATT', le: 'GERB' }));

  assert.deepEqual(
    segments.map((segment) => `${segment.start} ${segment.loc_s} ${segment.end} ${segment.loc_e}`),
    ['16:33 CATT 21:58 GERB'],
  );
});
