import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMoovitFromDepotUrl } from '../src/utils/gttLinks.js';
import { getChangePointAddress, getChangePointPosition, getChangePointStop } from '../src/constants/changePoints.js';

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

/* Un posto cambio senza palina raccolta non ha un punto: il percorso resta
   possibile ma passa dalla ricerca per nome di Moovit, invece che dall app. */
test('senza coordinate si ripiega sulla pagina Moovit, non sull app', () => {
  const target = buildMoovitFromDepotUrl('GHOST');
  assert.equal(target, null, 'un codice sconosciuto non produce percorso');

  /* Simula il caso reale: indirizzo noto, punto no. */
  assert.equal(getChangePointPosition('GERB'), null);
});

test('Filadelfia ha il punto dopo che le paline sono arrivate dal campo', () => {
  const target = buildMoovitFromDepotUrl('FILA');
  assert.equal(target.hasPosition, true);
  assert.ok(target.url.startsWith('moovit://directions?'));

  const params = new URLSearchParams(target.url.split('?')[1]);
  assert.equal(params.get('dest_name'), 'Filadelfia');
  assert.equal(params.get('dest_lat'), '45.044470');
  assert.equal(params.get('dest_lon'), '7.640460');
});

test('le due paline di Filadelfia stanno sui lati giusti', () => {
  assert.equal(getChangePointStop('FILA', { direction: 'R' }), '1666');
  assert.equal(getChangePointStop('FILA', { direction: 'A' }), '1665');
});

test('la pagina Moovit di riserva esiste anche quando si apre l app', () => {
  const target = buildMoovitFromDepotUrl('BENS');
  assert.ok(target.url.startsWith('moovit://'));
  assert.ok(target.web.startsWith('https://moovitapp.com/'));
  assert.ok(new URLSearchParams(target.web.split('?')[1]).get('tll'));
});

test('ogni posto cambio con palina ha un punto dentro Torino e dintorni', () => {
  const codes = ['CATT', 'ORSN', 'ORSA', 'FILA', 'OMRO', 'SIRA', 'LING', 'BENS', 'OSET', 'CAIO', 'BARB', 'CLGR', 'CLMA'];
  codes.forEach((code) => {
    const position = getChangePointPosition(code);
    assert.ok(position, `${code} deve avere il punto`);
    assert.ok(position.lat > 44.9 && position.lat < 45.2, `${code} fuori latitudine`);
    assert.ok(position.lng > 7.4 && position.lng < 7.8, `${code} fuori longitudine`);
  });
});

/* I posti cambio dei festivi: la 58 non gira e il suo percorso lo copre la 12
   modificata, che porta i due punti di piazza Omero. */
test('Omero e Siracusa hanno il percorso dal deposito', () => {
  ['OMRO', 'SIRA'].forEach((code) => {
    const target = buildMoovitFromDepotUrl(code);
    assert.ok(target, `${code} deve avere un percorso`);
    assert.equal(target.hasPosition, true, `${code} deve avere il punto`);
    assert.ok(target.url.startsWith('moovit://directions?'));
  });
});

test('a Omero l andata e il lato verso il centro', () => {
  assert.equal(getChangePointStop('OMRO', { direction: 'A' }), '309');
  // Il ritorno e' la palina del civico 274, quella di fronte.
  assert.equal(getChangePointStop('OMRO', { direction: 'R' }), '310');
});

/* Su corso Siracusa il GTFS conosce una sola fermata della 56: finche' la
   seconda non arriva dal campo, meglio nessuna palina che quella di fronte. */
test('Siracusa resta senza paline finche non sono confermate', () => {
  assert.equal(getChangePointStop('SIRA', { direction: 'A' }), '');
  assert.equal(getChangePointStop('SIRA', { direction: 'R' }), '');
});

test('i codici dei festivi hanno il nome che compare in preconoscenza', () => {
  assert.equal(buildMoovitFromDepotUrl('OMRO').label, 'Omero');
  assert.equal(buildMoovitFromDepotUrl('SIRA').label, 'Siracusa');
});

/* Il caso visto sul campo: la linea 34 parte da BABE, un codice che gli orari
   GTT usano e la tabella non ha. Il percorso non si puo' costruire - senza
   indirizzo non c'e' destinazione - e la card deve dirlo invece di limitarsi a
   non mostrare il bottone. */
test('un posto cambio fuori tabella non produce un percorso inventato', () => {
  assert.equal(getChangePointAddress('BABE'), '');
  assert.equal(buildMoovitFromDepotUrl('BABE'), null);
});
