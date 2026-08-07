import test from 'node:test';
import assert from 'node:assert/strict';

/* Il modulo parla con window e document: qui si finge il minimo che gli
   serve, cosi' il comportamento si verifica senza aprire un browser. */
function installFakeDom() {
  const state = { intervals: new Map(), nextId: 1, listeners: {}, hidden: false, cleared: 0 };

  global.window = {
    setInterval(fn, ms) {
      const id = state.nextId++;
      state.intervals.set(id, { fn, ms });
      return id;
    },
    clearInterval(id) {
      if (state.intervals.delete(id)) state.cleared += 1;
    },
  };

  global.document = {
    get hidden() {
      return state.hidden;
    },
    addEventListener(name, fn) {
      (state.listeners[name] = state.listeners[name] || []).push(fn);
    },
    removeEventListener(name, fn) {
      state.listeners[name] = (state.listeners[name] || []).filter((item) => item !== fn);
    },
  };

  state.tickAll = () => state.intervals.forEach((entry) => entry.fn());
  state.fire = (name) => (state.listeners[name] || []).forEach((fn) => fn());
  return state;
}

const dom = installFakeDom();
const { subscribeToClock } = await import('../src/utils/clock.js');

test('dieci iscritti condividono un solo intervallo', () => {
  const visti = [];
  const stop = Array.from({ length: 10 }, (_, i) => subscribeToClock(() => visti.push(i)));

  assert.equal(dom.intervals.size, 1, 'deve esserci un timer solo');

  dom.tickAll();
  assert.equal(visti.length, 10, 'ogni iscritto riceve il battito');

  stop.forEach((fn) => fn());
  assert.equal(dom.intervals.size, 0, 'con l ultimo iscritto se ne va anche il timer');
});

test('il timer riparte dopo essere stato spento', () => {
  const stop = subscribeToClock(() => {});
  assert.equal(dom.intervals.size, 1);
  stop();
  assert.equal(dom.intervals.size, 0);

  const stop2 = subscribeToClock(() => {});
  assert.equal(dom.intervals.size, 1);
  stop2();
});

test('in secondo piano il battito si ferma', () => {
  let battiti = 0;
  const stop = subscribeToClock(() => {
    battiti += 1;
  });

  dom.tickAll();
  assert.equal(battiti, 1);

  dom.hidden = true;
  dom.tickAll();
  assert.equal(battiti, 1, 'con la scheda nascosta non deve scattare');

  dom.hidden = false;
  dom.tickAll();
  assert.equal(battiti, 2);
  stop();
});

test('tornando in primo piano il conto si aggiorna subito', () => {
  let battiti = 0;
  const stop = subscribeToClock(() => {
    battiti += 1;
  });

  dom.hidden = true;
  dom.fire('visibilitychange');
  assert.equal(battiti, 0, 'nascondendosi non serve aggiornare');

  dom.hidden = false;
  dom.fire('visibilitychange');
  assert.equal(battiti, 1, 'al ritorno il numero non deve restare indietro');
  stop();
});

test('un iscritto che se ne va non zittisce gli altri', () => {
  let a = 0;
  let b = 0;
  const stopA = subscribeToClock(() => {
    a += 1;
  });
  const stopB = subscribeToClock(() => {
    b += 1;
  });

  stopA();
  dom.tickAll();
  assert.equal(a, 0);
  assert.equal(b, 1);
  assert.equal(dom.intervals.size, 1);
  stopB();
});
