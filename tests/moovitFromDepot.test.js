import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMoovitFromDepotUrl } from '../src/utils/gttLinks.js';
import { getChangePointPosition } from '../src/constants/changePoints.js';

test('il percorso parte dal deposito e arriva al posto cambio', () => {
  const target = buildMoovitFromDepotUrl('CATT');
  assert.equal(target.hasPosition, true);
  assert.equal(target.label, 'Cattaneo');
  assert.ok(target.url.startsWith('moovit://directions?'));

  const params = new URLSearchParams(target.url.split('?')[1]);
  assert.equal(params.get('orig_name'), 'Via Gorini, Torino');
  assert.equal(params.get('dest_name'), 'Cattaneo');
  assert.equal(params.get('dest_lat'), '45.036140');
  assert.equal(params.get('dest_lon'), '7.626270');
  assert.equal(params.get('auto_run'), 'true');
});

test('la partenza e sempre il deposito, qualunque sia la destinazione', () => {
  const origini = ['CATT', 'LING', 'CLMA'].map((code) => {
    const p = new URLSearchParams(buildMoovitFromDepotUrl(code).url.split('?')[1]);
    return `${p.get('orig_lat')},${p.get('orig_lon')}`;
  });
  assert.equal(new Set(origini).size, 1, 'una sola partenza');
});

test('dal deposito al deposito non c e niente da calcolare', () => {
  assert.equal(buildMoovitFromDepotUrl('GERB'), null);
});

test('senza posto cambio il bottone non ha ragione di esistere', () => {
  assert.equal(buildMoovitFromDepotUrl(''), null);
  assert.equal(buildMoovitFromDepotUrl(undefined), null);
  assert.equal(buildMoovitFromDepotUrl('XXXX'), null);
});

test('il codice si accetta anche minuscolo o con spazi', () => {
  assert.equal(buildMoovitFromDepotUrl('  catt  ').label, 'Cattaneo');
});

/* FILA non ha palina raccolta, quindi non ha un punto: il percorso resta
   possibile ma passa dalla ricerca per nome di Moovit. */
test('senza coordinate si ripiega sulla pagina Moovit, non sull app', () => {
  assert.equal(getChangePointPosition('FILA'), null);
  const target = buildMoovitFromDepotUrl('FILA');
  assert.equal(target.hasPosition, false);
  assert.ok(target.url.startsWith('https://moovitapp.com/'));

  const params = new URLSearchParams(target.url.split('?')[1]);
  assert.equal(params.get('to'), 'Filadelfia');
  assert.equal(params.get('tll'), null, 'senza punto non si inventa una coordinata');
  assert.ok(params.get('fll'), 'la partenza dal deposito resta');
});

test('la pagina Moovit di riserva esiste anche quando si apre l app', () => {
  const target = buildMoovitFromDepotUrl('BENS');
  assert.ok(target.url.startsWith('moovit://'));
  assert.ok(target.web.startsWith('https://moovitapp.com/'));
  assert.ok(new URLSearchParams(target.web.split('?')[1]).get('tll'));
});

test('ogni posto cambio con palina ha un punto dentro Torino e dintorni', () => {
  const codes = ['CATT', 'ORSN', 'ORSA', 'LING', 'BENS', 'OSET', 'CAIO', 'BARB', 'CLGR', 'CLMA'];
  codes.forEach((code) => {
    const position = getChangePointPosition(code);
    assert.ok(position, `${code} deve avere il punto`);
    assert.ok(position.lat > 44.9 && position.lat < 45.2, `${code} fuori latitudine`);
    assert.ok(position.lng > 7.4 && position.lng < 7.8, `${code} fuori longitudine`);
  });
});
