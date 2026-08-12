import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_DEVELOPMENTS } from '../src/demoData.js';
import { ANY_PLACE, DEPOT_CODE, searchReturns } from '../src/utils/depotReturns.js';
import { timeToMinutes } from '../src/utils/timeUtils.js';

// Chi guida queste linee sa quanto ci vuole da un posto cambio al deposito: da
// Cattaneo al Gerbido e' un quarto d'ora, non mezz'ora. Un tempo inventato
// lungo nella demo non e' un dettaglio estetico, fa sembrare sbagliato il
// calcolo dei rientri a chi lo legge per la prima volta.
const MAX_DEMO_TRANSFER_MINUTES = 25;

test('nella demo un tratto che chiude in deposito dura quanto dura davvero', () => {
  Object.entries(DEMO_DEVELOPMENTS).forEach(([key, segments]) => {
    segments
      .filter((segment) => segment.loc_e === DEPOT_CODE && segment.loc_s !== DEPOT_CODE)
      .forEach((segment) => {
        const minutes = timeToMinutes(segment.end) - timeToMinutes(segment.start);
        assert.ok(
          minutes > 0 && minutes <= MAX_DEMO_TRANSFER_MINUTES,
          `${key}: ${segment.loc_s} → ${DEPOT_CODE} in ${minutes} minuti, non e' un rientro credibile`,
        );
      });
  });
});

test('i rientri della demo arrivano in deposito in tempi credibili', () => {
  const result = searchReturns(DEMO_DEVELOPMENTS, ANY_PLACE, {
    service: 'feriali',
    time: '11:07',
    windowMinutes: 120,
  });

  assert.ok(result.matches.length, 'la demo deve produrre almeno un rientro');
  result.matches.forEach((item) => {
    // Anche concatenando piu' tratti si resta nell'ordine di grandezza di un
    // rientro, non di un giro di linea.
    assert.ok(
      item.rideMinutes <= 45,
      `${item.line} da ${item.from}: ${item.rideMinutes} minuti a bordo, troppi per un rientro`,
    );
  });
});
