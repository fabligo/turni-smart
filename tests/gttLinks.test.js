import test from 'node:test';
import assert from 'node:assert/strict';
import { getChangePointStop } from '../src/constants/changePoints.js';
import { buildGttPassagesTarget, buildNearbyStopsUrl } from '../src/utils/gttLinks.js';

test('risolve la palina per direzione', () => {
  assert.equal(getChangePointStop('CATT', { direction: 'A' }), '307');
  assert.equal(getChangePointStop('CATT', { direction: 'R' }), '308');
  assert.equal(getChangePointStop('PITA', { direction: 'A' }), '134');
  assert.equal(getChangePointStop('PITA', { direction: 'R' }), '135');
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

test('usa il nome scelto da chi guida nell etichetta', () => {
  const target = buildGttPassagesTarget({ line: '71', place: 'CATT', direction: 'A', placeLabel: 'Cattaneo' });
  assert.match(target.label, /Cattaneo/);
  assert.match(target.title, /palina 307/);

  const unnamed = buildGttPassagesTarget({ line: '71', place: 'CATT', direction: 'A' });
  assert.match(unnamed.label, /CATT/);
});

test('le fermate vicine richiedono coordinate valide', () => {
  assert.equal(buildNearbyStopsUrl({ lat: 45.07, lng: 7.68 }), 'https://www.google.com/maps/search/fermate+GTT/@45.070000,7.680000,16z');
  assert.equal(buildNearbyStopsUrl({ lat: 'boh', lng: 7.68 }), '');
  assert.equal(buildNearbyStopsUrl(), '');
});
