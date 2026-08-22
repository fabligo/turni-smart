import test from 'node:test';
import assert from 'node:assert/strict';
import { findTerminus, TERMINI } from '../src/constants/gttTermini.js';

test('il nome del grafico trova il capolinea di quella linea', () => {
  assert.equal(findTerminus('74', 'V. Gorini').code, '693');
  assert.equal(findTerminus('63', 'Negarville').code, '1158');
  assert.equal(findTerminus('132', 'Fermi').code, '5001');
  // Le abbreviazioni di strada cambiano fra i due documenti e non contano.
  assert.equal(findTerminus('5', 'P.za Cattaneo').code, '308');
  assert.equal(findTerminus('74', 'GORINI CAP').code, '693');
});

test('la 58 barrata ha i suoi capolinea, non quelli della 58', () => {
  /* La 58/ - che l'app scrive 58B - va da via Grosso a via Bertola, e Bertola
     lo divide con la 58: il GTFS elenca la palina 1683 su tutte e due. Senza la
     voce 58B un grafico della barrata non trovava nessun capolinea. */
  assert.equal(findTerminus('58B', 'V. Bertola').code, '1683');
  assert.equal(findTerminus('58', 'V. Bertola').code, '1683');
  assert.equal(findTerminus('58B', 'Grosso').code, '3542');
  // Allason e' capolinea della 58, non della barrata.
  assert.equal(findTerminus('58', 'Allason').code, '1649');
  assert.equal(findTerminus('58B', 'Allason'), null);
});

test('un pareggio non si scioglie a caso', () => {
  // La linea 5 ha due capolinea Settembrini, uno per senso: senza sapere quale
  // sia, nessuno dei due e' la risposta.
  assert.equal(findTerminus('5', 'C. Orbassano / C. Settembrini'), null);
});

test('cerca solo fra i capolinea della linea, non in tutta la rete', () => {
  // Cattaneo e' capolinea della 5 e della 71, non della 63.
  assert.equal(findTerminus('71', 'Cattaneo').code, '308');
  assert.equal(findTerminus('63', 'Cattaneo'), null);
  // Una linea che non e' del Gerbido non ha capolinea in tabella.
  assert.equal(findTerminus('999', 'Cattaneo'), null);
  assert.equal(findTerminus('', 'Cattaneo'), null);
  assert.equal(findTerminus('5', ''), null);
});

test('ogni capolinea porta palina, nome e posizione dentro Torino', () => {
  const tutti = Object.values(TERMINI).flat();
  assert.ok(tutti.length > 60, `solo ${tutti.length} capolinea in tabella`);
  tutti.forEach((stop) => {
    assert.match(stop.code, /^\d+$/, `capolinea senza palina: ${stop.name}`);
    assert.ok(stop.name.length > 2, `capolinea senza nome: ${stop.code}`);
    assert.ok(stop.lat > 44.9 && stop.lat < 45.3, `${stop.name} fuori Torino`);
    assert.ok(stop.lng > 7.3 && stop.lng < 7.9, `${stop.name} fuori Torino`);
  });
});
