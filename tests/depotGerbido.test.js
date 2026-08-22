import test from 'node:test';
import assert from 'node:assert/strict';
import { getLineDisplayName, getLineVariant, normalizeLineCode } from '../src/constants/depotGerbido.js';

/* In deposito la 58 barrata si chiama "58/", non "58B". Dentro l'app la chiave
   e' 58B - una barra in fondo non si maneggia bene - ma a schermo torna com'e'
   scritta sulla vettura. */
test('le linee barrate si mostrano col nome che si usa a voce', () => {
  assert.equal(getLineDisplayName('58B'), '58/');
  assert.equal(getLineDisplayName('58/'), '58/');
  assert.equal(getLineDisplayName('63B'), '63/');
  // Quelle che barrate non sono restano com'erano.
  assert.equal(getLineDisplayName('5'), '5');
  assert.equal(getLineDisplayName('M1S'), 'M1S');
  assert.equal(getLineDisplayName('36 merc.'), '36 (merc.)');
});

test('la barra in fondo diventa B nella chiave, e la variante si riconosce', () => {
  assert.equal(normalizeLineCode('58/'), '58B');
  assert.equal(normalizeLineCode('05'), '5');
  assert.equal(getLineVariant('58/'), 'B');
  assert.equal(getLineVariant('5'), 'base');
});
