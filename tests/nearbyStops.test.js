import test from 'node:test';
import assert from 'node:assert/strict';
import { describeGeolocationError } from '../src/utils/nearbyStops.js';

test('distingue il permesso negato dal GPS che non risponde', () => {
  assert.match(describeGeolocationError({ code: 1 }), /Permesso posizione negato/);
  assert.match(describeGeolocationError({ code: 3 }), /non ha risposto in tempo/);
  assert.match(describeGeolocationError({ code: 2 }), /non disponibile/);
  assert.match(describeGeolocationError(null), /non disponibile/);
});
