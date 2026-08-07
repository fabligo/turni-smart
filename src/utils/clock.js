/* Un solo orologio per tutta l'app.
 *
 * Con un timer per card, una schermata con dieci turni ne accendeva dieci.
 * Qui c'e' un intervallo solo: parte al primo iscritto, si spegne quando
 * l'ultimo se ne va, e resta fermo mentre la scheda e' in secondo piano -
 * un conto alla rovescia che nessuno guarda non deve consumare batteria.
 * Al ritorno in primo piano scatta subito, cosi' il numero non resta
 * indietro del tempo passato in pausa.
 */

const subscribers = new Set();
let timer = null;

function notify() {
  const now = Date.now();
  subscribers.forEach((callback) => callback(now));
}

function isHidden() {
  return typeof document !== 'undefined' && document.hidden;
}

function handleVisibility() {
  if (isHidden()) return;
  notify();
}

function start() {
  if (timer !== null || !subscribers.size) return;
  timer = window.setInterval(() => {
    if (!isHidden()) notify();
  }, 1000);
  document.addEventListener('visibilitychange', handleVisibility);
}

function stop() {
  if (timer === null) return;
  window.clearInterval(timer);
  timer = null;
  document.removeEventListener('visibilitychange', handleVisibility);
}

export function subscribeToClock(callback) {
  subscribers.add(callback);
  start();

  return () => {
    subscribers.delete(callback);
    if (!subscribers.size) stop();
  };
}
