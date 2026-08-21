import test from 'node:test';
import assert from 'node:assert/strict';
import { getDirectionLabel, searchDepartures } from '../src/utils/depotDepartures.js';

/* Un lunedi', cosi' il servizio dedotto e' "feriali". */
const LUNEDI = new Date('2026-04-06T05:00:00');

/* Le uscite come le da' il grafico di servizio: dal deposito al posto dove la
   vettura entra in linea, e la durata e' quella che la tabella TEMPI DI USCITA
   / RIENTRO dichiara - nove minuti per Cattaneo, dodici per Orbassano. Stanno
   sotto chiavi USCITE, che nessun turno puo' avere. */
const USCITE = {
  'USCITE 5 LUN - VEN': [
    { start: '05:10', loc_s: 'GERB', dir: '', end: '05:19', loc_e: 'CATT', ln: '5', lineaNorm: '5', vett: '', gt: 'LUN - VEN', run_id: 1 },
    { start: '05:12', loc_s: 'GERB', dir: '', end: '05:21', loc_e: 'CATT', ln: '5', lineaNorm: '5', vett: '', gt: 'LUN - VEN', run_id: 2 },
  ],
  'USCITE 17 LUN - VEN': [
    { start: '05:06', loc_s: 'GERB', dir: '', end: '05:18', loc_e: 'ORSA', ln: '17', lineaNorm: '17', vett: '', gt: 'LUN - VEN', run_id: 1 },
  ],
  'USCITE 34 SAB': [
    { start: '05:08', loc_s: 'GERB', dir: '', end: '05:26', loc_e: 'BABE', ln: '34', lineaNorm: '34', vett: '', gt: 'SAB', run_id: 1 },
  ],
  'USCITE 14 LUN - VEN': [
    { start: '09:40', loc_s: 'GERB', dir: '', end: '09:49', loc_e: 'CATT', ln: '14', lineaNorm: '14', vett: '', gt: 'LUN - VEN', run_id: 1 },
  ],
};

/* La stessa giornata come la scrive la pagina TURNI DEL PERSONALE: una riga e'
   la ripresa intera, dal deposito a dove il conducente stacca cinque ore dopo.
   Non e' un'uscita, e non deve entrare da nessuna parte. */
const PAGINA_TURNI = {
  '05 101': [
    { start: '05:10', loc_s: 'GERB', dir: '-', end: '10:15', loc_e: 'CATT', ln: '5', lineaNorm: '5', vett: '1', gt: 'LUN - VEN', run_id: 1 },
  ],
  '05 302': [
    { start: '16:33', loc_s: 'CATT', dir: 'R', end: '21:58', loc_e: 'GERB', ln: '5', lineaNorm: '5', vett: '2', gt: 'LUN - VEN', run_id: 1 },
  ],
};

/* Il difetto della issue #62, in una riga: prima le uscite le davano le
   riprese della pagina turni, e "esce alle 05:10, a Cattaneo alle 10:15" era
   un'uscita da cinque ore. E' lo stesso errore dei rientri (decisioni/0001),
   e il filtro e' sulla provenienza del dato, non sulla sua durata. */
test('le riprese della pagina turni non sono uscite', () => {
  const r = searchDepartures(PAGINA_TURNI, { now: LUNEDI, time: '05:10', windowMinutes: 15 });
  assert.equal(r.total, 0);
  assert.equal(r.graphicLoaded, false, 'e va detto che il grafico non c e, non che non passa niente');
  assert.deepEqual(r.places, [], 'nemmeno una destinazione da offrire');
});

test('con le due pagine insieme vale solo il grafico di servizio', () => {
  const r = searchDepartures({ ...PAGINA_TURNI, ...USCITE }, { now: LUNEDI, time: '05:10', windowMinutes: 0 });
  assert.equal(r.total, 1);
  // Nove minuti, quelli della tabella: se qui comparissero le cinque ore della
  // ripresa, staremmo leggendo di nuovo la pagina sbagliata.
  assert.equal(r.matches[0].legMinutes, 9);
  assert.equal(r.matches[0].arrival, '05:19');
});

test('la finestra guarda anche prima dell orario scelto', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.deepEqual(
    r.matches.map((m) => `${m.departure} ${m.offsetMinutes}`),
    ['05:06 -4', '05:10 0', '05:12 2'],
    'un mezzo partito 4 minuti prima si prende ancora',
  );
});

test('l elenco resta in ordine di orario, non di distanza', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '05:10', windowMinutes: 10 });
  const orari = r.matches.map((m) => m.departure);
  assert.deepEqual(orari, [...orari].sort(), 'ordine cronologico');
});

/* Il filtro utile e' la destinazione: chi deve andare a Orsini vuole i mezzi
   che vanno a Orsini. */
test('si puo chiedere un posto cambio solo', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '05:10', windowMinutes: 10, place: 'ORSA' });
  assert.deepEqual(r.matches.map((m) => m.line), ['17']);
  assert.equal(r.otherPlace, 2, 'le due verso Cattaneo restano fuori, ma contate');
});

test('senza posto cambio scelto si vedono tutte le uscite', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '05:10', windowMinutes: 10 });
  assert.equal(r.total, 3);
  assert.equal(r.otherPlace, 0, 'senza filtro non resta fuori niente da contare');
});

test('un posto cambio senza uscite in quella fascia non ne inventa', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '05:10', windowMinutes: 10, place: 'BABE' });
  assert.equal(r.total, 0, 'BABE e del sabato, non del feriale');
});

test('il codice del posto cambio si accetta anche minuscolo', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '05:10', windowMinutes: 10, place: '  orsa ' });
  assert.deepEqual(r.matches.map((m) => m.line), ['17']);
});

/* L'elenco del selettore deve reggere mentre si sposta l'orario: se si
   svuotasse a ogni finestra stretta non sarebbe un elenco di destinazioni ma
   un secondo risultato di ricerca. */
test('le destinazioni offerte sono quelle di tutta la giornata', () => {
  const stretta = searchDepartures(USCITE, { now: LUNEDI, time: '05:10', windowMinutes: 0 });
  assert.deepEqual(
    stretta.places.map((p) => p.place).sort(),
    ['CATT', 'ORSA'],
    'anche la 09:40, fuori finestra, porta la sua destinazione',
  );
  const cattaneo = stretta.places.find((p) => p.place === 'CATT');
  assert.equal(cattaneo.count, 3, 'tre uscite verso Cattaneo nella giornata feriale');
  assert.equal(cattaneo.inWindow, 1, 'ma una sola in questa fascia');
});

test('le destinazioni seguono il servizio scelto', () => {
  const sabato = searchDepartures(USCITE, { now: LUNEDI, service: 'sabato', time: '05:08', windowMinutes: 2 });
  assert.deepEqual(sabato.places.map((p) => p.place), ['BABE']);
});

test('scegliere un posto cambio non cambia l elenco delle destinazioni', () => {
  const tutte = searchDepartures(USCITE, { now: LUNEDI, time: '05:10', windowMinutes: 10 });
  const sola = searchDepartures(USCITE, { now: LUNEDI, time: '05:10', windowMinutes: 10, place: 'ORSA' });
  assert.deepEqual(sola.places, tutte.places, 'il selettore resta popolato uguale');
});

test('conta quante uscite ci sono e di quali linee', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '05:10', windowMinutes: 10 });
  assert.equal(r.total, 3);
  assert.deepEqual(r.byLine, [
    { count: 2, line: '5' },
    { count: 1, line: '17' },
  ]);
});

test('i rientri non sono uscite', () => {
  const conRientri = {
    ...USCITE,
    'RIENTRI 5 LUN - VEN': [
      { start: '21:51', loc_s: 'OSET', dir: '', end: '21:58', loc_e: 'GERB', ln: '5', lineaNorm: '5', gt: 'LUN - VEN', run_id: 1 },
    ],
  };
  const r = searchDepartures(conRientri, { now: LUNEDI, time: '21:51', windowMinutes: 60 });
  assert.equal(r.total, 0, 'quel tratto arriva in deposito, non ne parte');
});

test('fuori dalla finestra si conta, non si elenca', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.equal(r.outsideWindow, 1, 'la 09:40 e lontana');
  assert.ok(r.matches.every((m) => m.departure !== '09:40'));
});

test('un altro tipo di servizio resta fuori, ma viene contato', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '05:08', windowMinutes: 2 });
  assert.ok(r.matches.every((m) => m.line !== '34'), 'la corsa del sabato non esce di feriale');
  assert.equal(r.otherServiceCount, 1);
  assert.deepEqual(r.otherServiceByType, { sabato: 1 });
  assert.equal(r.countByService.sabato, 1);
});

/* Il messaggio dice "in questa fascia": se il contatore guarda tutta la
   giornata annuncia uscite che a quell'ora non esistono. */
test('le uscite di un altro servizio si contano solo dentro la fascia', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '20:00', windowMinutes: 15 });
  assert.equal(r.otherServiceCount, 0, 'la corsa del sabato e alle 05:08, non alle 20:00');
  assert.equal(r.countByService.sabato, 1, 'ma negli orari caricati c e, e il conto della giornata lo dice');
});

test('con un posto scelto si contano solo le alternative che ci vanno', () => {
  const altrove = searchDepartures(USCITE, { now: LUNEDI, time: '05:08', windowMinutes: 2, place: 'CATT' });
  assert.equal(altrove.otherServiceCount, 0, 'la corsa del sabato va a BABE, non a Cattaneo');

  const stessoPosto = searchDepartures(USCITE, { now: LUNEDI, time: '05:08', windowMinutes: 2, place: 'BABE' });
  assert.equal(stessoPosto.otherServiceCount, 1, 'li invece cambiare servizio serve davvero');
});

/* La stessa corsa scritta nel feriale e nel sabato non e' un doppione da
   scartare ne' due uscite: e' una sola uscita che gira in entrambi i giorni,
   e in ciascuna vista se ne vede una. */
test('la stessa corsa in due servizi e una sola uscita che gira in entrambi', () => {
  const dueServizi = {
    'USCITE 5 LUN - VEN': [
      { start: '05:10', loc_s: 'GERB', dir: '', end: '05:19', loc_e: 'CATT', ln: '5', lineaNorm: '5', gt: 'LUN - VEN' },
    ],
    'USCITE 5 SAB': [
      { start: '05:10', loc_s: 'GERB', dir: '', end: '05:19', loc_e: 'CATT', ln: '5', lineaNorm: '5', gt: 'SAB' },
    ],
  };
  const feriale = searchDepartures(dueServizi, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.equal(feriale.total, 1);
  assert.equal(feriale.otherServiceCount, 0, 'non e un altro servizio: e anche questo');
  assert.deepEqual(feriale.countByService, { feriali: 1, sabato: 1 });

  const sabato = searchDepartures(dueServizi, { now: LUNEDI, service: 'sabato', time: '05:10', windowMinutes: 5 });
  assert.equal(sabato.total, 1, 'e di sabato si vede la stessa');
});

/* Negli Orari del Gerbido c'e' "LUN - SAB": dal lunedi' al sabato. Con un
   tipo solo finiva tutto nel sabato e di mercoledi' spariva, pur girando. */
test('LUN - SAB esce sia in settimana sia di sabato', () => {
  const lunSab = {
    'USCITE 5 LUN - SAB': [
      { start: '05:10', loc_s: 'GERB', dir: '', end: '05:19', loc_e: 'CATT', ln: '5', lineaNorm: '5', gt: 'LUN - SAB' },
    ],
  };
  assert.equal(searchDepartures(lunSab, { now: LUNEDI, time: '05:10', windowMinutes: 5 }).total, 1, 'di lunedi');
  assert.equal(
    searchDepartures(lunSab, { now: LUNEDI, service: 'sabato', time: '05:10', windowMinutes: 5 }).total,
    1,
    'e di sabato',
  );
  assert.equal(
    searchDepartures(lunSab, { now: LUNEDI, service: 'festivi', time: '05:10', windowMinutes: 5 }).total,
    0,
    'ma non di domenica',
  );
});

test('un orario del solo sabato non esce in settimana', () => {
  const soloSabato = {
    'USCITE 5 SABATO': [
      { start: '05:10', loc_s: 'GERB', dir: '', end: '05:19', loc_e: 'CATT', ln: '5', lineaNorm: '5', gt: 'SABATO' },
    ],
  };
  assert.equal(searchDepartures(soloSabato, { now: LUNEDI, time: '05:10', windowMinutes: 5 }).total, 0);
  assert.equal(searchDepartures(soloSabato, { now: LUNEDI, service: 'sabato', time: '05:10', windowMinutes: 5 }).total, 1);
});

test('chiedendo il sabato la corsa del sabato compare', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '05:08', windowMinutes: 2, service: 'sabato' });
  assert.deepEqual(r.matches.map((m) => m.line), ['34']);
  assert.equal(r.matches[0].toPlace, 'BABE');
});

test('senza orario si parte da adesso', () => {
  const r = searchDepartures(USCITE, { now: new Date('2026-04-06T09:40:00'), windowMinutes: 5 });
  assert.deepEqual(r.matches.map((m) => m.departure), ['09:40']);
});

test('sviluppi vuoti o malformati non fanno saltare la ricerca', () => {
  assert.equal(searchDepartures({}, { now: LUNEDI }).total, 0);
  assert.equal(searchDepartures({ 'USCITE 5 LUN - VEN': null }, { now: LUNEDI }).total, 0);
  assert.equal(searchDepartures(undefined, { now: LUNEDI }).total, 0);
});

test('la stessa uscita non si conta due volte', () => {
  const doppio = {
    'USCITE 5 LUN - VEN': [
      { start: '05:10', loc_s: 'GERB', dir: '', end: '05:19', loc_e: 'CATT', ln: '5', lineaNorm: '5', gt: 'LUN - VEN', run_id: 1 },
      { start: '05:10', loc_s: 'GERB', dir: '', end: '05:19', loc_e: 'CATT', ln: '5', lineaNorm: '5', gt: 'LUN - VEN', run_id: 2 },
    ],
  };
  assert.equal(searchDepartures(doppio, { now: LUNEDI, time: '05:10', windowMinutes: 5 }).total, 1);
});

/* Il PDF ripete la stessa pagina in piu' versioni dell'orario. Un mezzo pero'
   dal deposito esce una volta sola: se l'identita' include la chiave, il
   pannello moltiplica le uscite per il numero di copie. */
test('la stessa uscita in due versioni dello stesso servizio resta una', () => {
  const corsa = { start: '05:10', loc_s: 'GERB', dir: '', end: '05:19', loc_e: 'CATT', ln: '5', lineaNorm: '5' };
  const dueVersioni = {
    'USCITE 5 LUN - VEN': [{ ...corsa, gt: 'LUN - VEN', ver: 'A' }],
    'USCITE 5 FERIALE INVERNALE': [{ ...corsa, gt: 'FERIALE INVERNALE', ver: 'B' }],
  };
  const r = searchDepartures(dueVersioni, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.equal(r.total, 1, 'due righe dello stesso feriale, un mezzo solo');
  assert.equal(r.places.find((p) => p.place === 'CATT').count, 1);
});

/* La linea la porta il segmento: la chiave comincia con USCITE, e usarla come
   ripiego farebbe comparire "USCITE" al posto del numero di linea. */
test('una linea che il grafico non dichiara resta vuota, non diventa la chiave', () => {
  const senzaLinea = {
    'USCITE ? LUN - VEN': [
      { start: '05:10', loc_s: 'GERB', dir: '', end: '05:19', loc_e: 'CATT', ln: '', lineaNorm: '', gt: 'LUN - VEN' },
    ],
  };
  const r = searchDepartures(senzaLinea, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.equal(r.matches[0].line, '');
});

/* Il grafico dice dove la vettura entra in linea, non da che parte prosegue.
   Il campo resta, vuoto, perche' il giorno in cui quella pagina lo dicesse non
   ci sia altro da cambiare. */
test('l uscita non inventa una direzione', () => {
  const r = searchDepartures(USCITE, { now: LUNEDI, time: '05:06', windowMinutes: 1 });
  assert.equal(r.matches[0].line, '17');
  assert.equal(r.matches[0].direction, '');
  assert.equal(r.matches[0].directionLabel, '');
});

test('una direzione, se ci fosse, verrebbe letta e tradotta', () => {
  const conDirezione = {
    'USCITE 5 LUN - VEN': [
      { start: '05:10', loc_s: 'GERB', dir: 'A', end: '05:19', loc_e: 'CATT', ln: '5', lineaNorm: '5', gt: 'LUN - VEN' },
    ],
  };
  const r = searchDepartures(conDirezione, { now: LUNEDI, time: '05:10', windowMinutes: 5 });
  assert.equal(r.matches[0].direction, 'A');
  assert.equal(r.matches[0].directionLabel, 'Andata');
});

test('il grafico caricato si distingue dal grafico assente', () => {
  assert.equal(searchDepartures(USCITE, { now: LUNEDI }).graphicLoaded, true);
  assert.equal(searchDepartures({}, { now: LUNEDI }).graphicLoaded, false);
});

test('le etichette di direzione sono quelle degli orari', () => {
  assert.equal(getDirectionLabel('A'), 'Andata');
  assert.equal(getDirectionLabel('r'), 'Ritorno');
  assert.equal(getDirectionLabel('-'), '');
  assert.equal(getDirectionLabel(''), '');
});
