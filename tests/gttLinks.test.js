import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANGE_POINTS, getChangePointLabel, getChangePointStop } from '../src/constants/changePoints.js';
import {
  buildChangePointDirectionsUrl,
  buildDepotDirectionsUrl,
  buildGttPassagesTarget,
  buildMoovitDirectionsUrl,
  buildMoovitWebUrl,
  buildNearbyStopsUrl,
} from '../src/utils/gttLinks.js';

test('risolve la palina per direzione', () => {
  assert.equal(getChangePointStop('CATT', { direction: 'A' }), '307');
  assert.equal(getChangePointStop('CATT', { direction: 'R' }), '308');
  assert.equal(getChangePointStop('LING', { direction: 'R' }), '2603');
  assert.equal(getChangePointStop('BENS', { direction: 'A' }), '3628');
  assert.equal(getChangePointStop('CLMA', { direction: 'R' }), '852');
});

test('sulla linea 62 le direzioni di Orbassano sono invertite', () => {
  assert.equal(getChangePointStop('ORSA', { direction: 'A' }), '728');
  assert.equal(getChangePointStop('ORSA', { direction: 'R' }), '729');
  assert.equal(getChangePointStop('ORSA', { direction: 'A', line: '62' }), '729');
  assert.equal(getChangePointStop('ORSA', { direction: 'R', line: '62' }), '728');
});

test('la linea 2 non e piu del Gerbido, e con lei il posto cambio Pitagora', () => {
  assert.equal(CHANGE_POINTS.PITA, undefined);
  assert.equal(getChangePointStop('PITA', { direction: 'A' }), '');
  assert.equal(getChangePointLabel('PITA'), 'PITA');
});

test('senza direzione usa l andata, e Cairoli ha la stessa palina nei due sensi', () => {
  assert.equal(getChangePointStop('BARB', { direction: '-' }), '1169');
  assert.equal(getChangePointStop('CAIO', { direction: 'A' }), '1119');
  assert.equal(getChangePointStop('CAIO', { direction: 'R' }), '1119');
});

test('un posto cambio senza paline non ne inventa una', () => {
  assert.equal(getChangePointStop('FILA', { direction: 'A' }), '');
  assert.equal(getChangePointStop('GERB', { direction: 'A' }), '');
  assert.equal(getChangePointStop('ZZZZ', { direction: 'A' }), '');
});

test('il link punta alla palina quando c e, altrimenti alla linea', () => {
  const withStop = buildGttPassagesTarget({ line: '71', place: 'CATT', direction: 'R' });
  assert.match(withStop.url, /view=palina/);
  assert.match(withStop.url, /palina=308/);
  assert.equal(withStop.palina, '308');

  const withoutStop = buildGttPassagesTarget({ line: '71', place: 'FILA', direction: 'R' });
  assert.match(withoutStop.url, /view=percorsi/);
  assert.equal(withoutStop.palina, '');
});

test('l etichetta usa il codice del posto cambio', () => {
  const target = buildGttPassagesTarget({ line: '71', place: 'CATT', direction: 'A' });
  assert.match(target.label, /CATT/);
  assert.match(target.title, /palina 307/);
});

test('le fermate vicine richiedono coordinate valide', () => {
  assert.equal(buildNearbyStopsUrl({ lat: 45.07, lng: 7.68 }), 'https://www.google.com/maps/search/fermate+GTT/@45.070000,7.680000,16z');
  assert.equal(buildNearbyStopsUrl({ lat: 'boh', lng: 7.68 }), '');
  assert.equal(buildNearbyStopsUrl(), '');
});

test('nessun posto cambio porta coordinate non verificate', () => {
  Object.values(CHANGE_POINTS).forEach((meta) => {
    assert.equal(meta.coordinates, undefined);
  });
});

test('il percorso al deposito parte dalla posizione e va in mezzi pubblici', () => {
  const url = buildDepotDirectionsUrl({ lat: 45.0668, lng: 7.6513 });
  assert.match(url, /^https:\/\/www\.google\.com\/maps\/dir\/\?/);
  assert.match(url, /origin=45\.066800%2C7\.651300/);
  assert.match(url, /travelmode=transit/);
  // Il deposito e' in via Gorini: lo dice GTT sulla destinazione della 74.
  assert.match(url, /destination=Via\+Gorini%2C\+Torino/);

  assert.equal(buildDepotDirectionsUrl({ lat: 'boh', lng: 7.6 }), '');
  assert.equal(buildDepotDirectionsUrl(), '');
});

test('il percorso Moovit usa lo schema dell app, non un indirizzo web', () => {
  const url = buildMoovitDirectionsUrl({ lat: 45.0668, lng: 7.6513 });
  assert.match(url, /^moovit:\/\/directions\?/);
  assert.match(url, /orig_lat=45\.066800&orig_lon=7\.651300/);
  // Palina 693 "GORINI CAP", capolinea della 74: il punto del deposito.
  assert.match(url, /dest_lat=45\.039410&dest_lon=7\.591660/);
  assert.match(url, /dest_name=Via%20Gorini/);
  assert.match(url, /auto_run=true/);
  // Gli spazi restano spazi codificati: un piu' non verrebbe riletto come tale.
  assert.match(url, /orig_name=La%20mia%20posizione/);
  assert.ok(!url.includes('+'));

  assert.equal(buildMoovitDirectionsUrl({ lat: null, lng: 7.6 }), '');
  assert.equal(buildMoovitDirectionsUrl(), '');
});

test('resta l indirizzo web di Moovit per chi non ha l app', () => {
  const url = buildMoovitWebUrl({ lat: 45.0668, lng: 7.6513 });
  assert.match(url, /^https:\/\/moovitapp\.com\/\?/);
  assert.match(url, /fll=45\.066800_7\.651300/);
  assert.match(url, /tll=45\.039410_7\.591660/);
  assert.equal(buildMoovitWebUrl(), '');
});

test('i nomi dei posti cambio sono quelli delle paline GTT', () => {
  assert.equal(getChangePointLabel('OSET'), 'Settembrini');
  assert.equal(getChangePointLabel('CAIO'), 'Caio Mario');
  assert.equal(getChangePointLabel('BARB'), 'Portofino');
  assert.equal(getChangePointLabel('CLGR'), 'Gramsci Nord');
  assert.equal(getChangePointLabel('CLMA'), 'Macedonia');
  // Un codice che gli orari hanno ma la tabella no resta il codice.
  assert.equal(getChangePointLabel('BABE'), 'BABE');
});

test('il percorso fino al posto cambio usa il suo indirizzo', () => {
  const url = buildChangePointDirectionsUrl({ lat: 45.0668, lng: 7.6513 }, 'CAIO');
  assert.match(url, /origin=45\.066800%2C7\.651300/);
  assert.match(url, /destination=Piazzale\+Caio\+Mario%2C\+Torino/);
  assert.match(url, /travelmode=transit/);

  // Senza indirizzo non si inventa una destinazione.
  assert.equal(buildChangePointDirectionsUrl({ lat: 45.06, lng: 7.65 }, 'BABE'), '');
  assert.equal(buildChangePointDirectionsUrl({}, 'CAIO'), '');
});
