import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBusRadarTarget,
  describeBusRadarTarget,
  normalizeVehicleShift,
} from '../src/utils/busRadar.js';
import { getChangePointPosition } from '../src/constants/changePoints.js';

function paramsOf(url) {
  return new URL(url).searchParams;
}

test('con la matricola si punta il mezzo, non la linea', () => {
  const target = buildBusRadarTarget({ line: '71', vehicleNumber: '1234', vehicleShift: '6', place: 'CATT' });
  const params = paramsOf(target.url);
  assert.equal(target.hasVehicle, true);
  assert.deepEqual(target.fleetNumbers, ['1234']);
  assert.equal(params.get('vettura'), '1234');
  assert.equal(params.get('linea'), '71');
  /* Con la matricola in mano il centro lo decide BusRadar seguendo il mezzo:
     mandargli anche il posto cambio lo inchioderebbe dove il mezzo non e' piu'. */
  assert.equal(params.get('lat'), null);
  assert.equal(params.get('lon'), null);
});

test('il riquadro chiede la versione senza barra di navigazione, il bottone esterno no', () => {
  const target = buildBusRadarTarget({ line: '71', vehicleNumber: '1234' });
  assert.equal(paramsOf(target.url).get('embed'), 'turni-smart');
  assert.equal(paramsOf(target.externalUrl).get('embed'), null);
  assert.equal(paramsOf(target.externalUrl).get('vettura'), '1234');
});

test('senza matricola si inquadra il posto cambio da cui parte il tratto', () => {
  const target = buildBusRadarTarget({ line: '71', place: 'CATT', direction: 'A', vehicleShift: '6' });
  const params = paramsOf(target.url);
  const position = getChangePointPosition('CATT', { direction: 'A', line: '71' });
  assert.equal(target.hasVehicle, false);
  assert.equal(params.get('vettura'), null);
  assert.equal(params.get('lat'), position.lat.toFixed(6));
  assert.equal(params.get('lon'), position.lng.toFixed(6));
});

test('un posto cambio senza palina nota non inventa un punto, e non lo scrive nemmeno', () => {
  /* Il Deposito Gerbido non ha palina: la sua posizione sta in `gttLinks.js`,
     non nella tabella dei posti cambio. Senza punto la mappa resta dov'e', e
     allora il nome non va scritto - una didascalia che smentisce la mappa e'
     peggio di una didascalia in meno. */
  const depot = buildBusRadarTarget({ line: '71', place: 'GERB', direction: 'A', vehicleShift: '6' });
  assert.equal(paramsOf(depot.url).get('lat'), null);
  assert.equal(depot.placeLabel, '');
  assert.doesNotMatch(describeBusRadarTarget(depot), /Gerbido/);
  assert.equal(paramsOf(depot.url).get('linea'), '71');

  assert.equal(paramsOf(buildBusRadarTarget({ line: '71', place: 'ZZZZ' }).url).get('lat'), null);
});

test('piu vetture sullo stesso tratto arrivano tutte, senza doppioni', () => {
  const target = buildBusRadarTarget({ line: '71', vehicleNumber: '1234, 5678, 1234' });
  assert.deepEqual(target.fleetNumbers, ['1234', '5678']);
  assert.equal(paramsOf(target.url).get('vettura'), '1234,5678');
});

test('senza linea e senza matricola non c e niente da puntare', () => {
  assert.equal(buildBusRadarTarget({ place: 'CATT' }), null);
  assert.equal(buildBusRadarTarget({}), null);
});

test('il turno vettura si legge sia da solo sia preceduto dalla linea', () => {
  assert.equal(normalizeVehicleShift('6'), '6');
  assert.equal(normalizeVehicleShift('71 6'), '6');
  assert.equal(normalizeVehicleShift(''), '');
});

test('la nota dice quale delle due cose si sta guardando', () => {
  const withVehicle = describeBusRadarTarget(buildBusRadarTarget({ line: '71', vehicleNumber: '1234' }));
  assert.match(withVehicle, /vettura 1234/);

  /* Il punto su cui l'utente puo' sbagliarsi: il turno vettura non e' un dato
     che GTT trasmette, quindi la mappa senza matricola mostra la linea e non
     "il tuo mezzo". Se questa frase sparisce, sparisce l'avvertenza. */
  const withoutVehicle = describeBusRadarTarget(
    buildBusRadarTarget({ line: '71', place: 'CATT', vehicleShift: '6' }),
  );
  assert.match(withoutVehicle, /non e' un dato che GTT trasmette/);
  assert.match(withoutVehicle, /Cattaneo/);
});
