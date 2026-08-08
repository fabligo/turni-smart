import { timeToMinutes } from './timeUtils.js';
import {
  DEPOT_CODE,
  SERVICE_TYPES,
  getServiceType,
  getShiftParts,
  getTodayServiceType,
  minutesFromNow,
  normalizePlace,
  parseClockMinutes,
} from './depotReturns.js';

/* Quanto largo cercare intorno all'orario scelto, se non viene chiesto altro.
   La domanda e' "cosa esce di qui verso quest'ora", quindi la finestra guarda
   da entrambe le parti: un mezzo che parte tre minuti prima si prende ancora,
   e tenerlo fuori sarebbe solo un artificio del filtro. */
export const DEPARTURE_WINDOW_MINUTES = 15;

const DIRECTIONS = { A: 'Andata', R: 'Ritorno' };

export function getDirectionLabel(direction = '') {
  return DIRECTIONS[String(direction || '').trim().toUpperCase()] || '';
}

function normalizeDirection(value = '') {
  const direction = String(value || '').trim().toUpperCase();
  return direction === 'A' || direction === 'R' ? direction : '';
}

function durationMinutes(start, end) {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);
  if (endMinutes < startMinutes) endMinutes += 1440;
  return endMinutes - startMinutes;
}

function groupByRun(segments = []) {
  const runs = new Map();
  segments.forEach((segment) => {
    const key = segment.run_id === undefined ? '_' : String(segment.run_id);
    if (!runs.has(key)) runs.set(key, []);
    runs.get(key).push(segment);
  });
  return [...runs.values()].map((run) => run.slice().sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)));
}

/**
 * La direzione che la linea prende uscendo dal deposito.
 *
 * Il tratto che parte dal deposito spesso non ce l'ha - negli sviluppi e'
 * segnato "-" - perche' e' il trasferimento, non ancora la corsa. La direzione
 * che serve e' allora quella del primo tratto orientato della stessa corsa: e'
 * lo stesso mezzo che prosegue, quindi e' davvero la direzione che prendera'.
 */
export function findRunDirection(run = [], startIndex = 0) {
  for (let index = startIndex; index < run.length; index += 1) {
    const direction = normalizeDirection(run[index].dir);
    if (direction) return direction;
  }
  return '';
}

/**
 * Le uscite dal deposito intorno a un orario.
 *
 * Serve a raggiungere un posto cambio: si sceglie l'ora in cui si e' al
 * Gerbido e si vede cosa parte in quel momento, su che linea, dove va a
 * finire quel tratto e in che direzione prosegue.
 *
 * Il filtro utile e' il posto cambio, non la direzione: chi deve andare a
 * Cattaneo vuole vedere i mezzi che vanno a Cattaneo, e "andata o ritorno" da
 * solo non risponde a quella domanda. La direzione resta comunque su ogni
 * uscita, perche' e' quella a dire da che parte il mezzo prosegue poi.
 *
 * Di ogni uscita si dice solo quello che il dato dice: ora di partenza dal
 * deposito, linea, turno, direzione e dove arriva il tratto. Se quel tratto sia
 * un trasferimento o gia' servizio, gli sviluppi non lo distinguono.
 *
 * Come per i rientri, i contatori raccontano perche' una ricerca resta vuota:
 * senza quelli "nessuna uscita" e indistinguibile da una funzione rotta.
 */
export function searchDepartures(developments = {}, options = {}) {
  const {
    now = new Date(),
    place: requestedPlace = '',
    time = '',
    windowMinutes = DEPARTURE_WINDOW_MINUTES,
    service: requestedService = '',
  } = options;

  const explicitMinutes = parseClockMinutes(time);
  const targetDate = new Date(now.getTime());
  if (explicitMinutes !== null) {
    targetDate.setHours(Math.floor(explicitMinutes / 60), explicitMinutes % 60, 0, 0);
  }
  const targetMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const service = SERVICE_TYPES.includes(requestedService) ? requestedService : getTodayServiceType(targetDate);
  const wantedPlace = normalizePlace(requestedPlace);

  const result = {
    byLine: [],
    countByService: {},
    matches: [],
    /* Uscite dentro la finestra ma dirette altrove: e' la ragione piu'
       frequente di un elenco corto quando si sceglie un posto cambio. */
    otherPlace: 0,
    /* Uscite dentro la finestra, e verso il posto scelto, ma di un altro
       tipo di servizio: quelle che si vedrebbero cambiando Servizio. */
    otherServiceCount: 0,
    otherServiceByType: {},
    outsideWindow: 0,
    place: wantedPlace,
    /* Dove si va a finire uscendo dal Gerbido, in tutta la giornata: e'
       l'elenco con cui si riempie il selettore, cosi' offre solo posti che
       hanno davvero un'uscita e non un menu di destinazioni immaginarie. */
    places: [],
    service,
    targetMinutes,
    total: 0,
    windowMinutes,
  };

  /* Una voce per uscita reale, non per riga letta: le copie si fondono qui. */
  const byIdentity = new Map();

  Object.entries(developments).forEach(([key, segments]) => {
    if (!Array.isArray(segments)) return;
    const { line: keyLine, shift } = getShiftParts(key);

    groupByRun(segments).forEach((run) => {
      run.forEach((segment, index) => {
        if (normalizePlace(segment.loc_s) !== DEPOT_CODE) return;

        /* Un tratto che dal deposito torna al deposito non porta a nessun
           posto cambio: negli orari sono le righe che riassumono lo sviluppo
           intero, non un'uscita da prendere. */
        const toPlace = normalizePlace(segment.loc_e);
        if (toPlace === DEPOT_CODE) return;

        /* Negativo = parte prima dell'orario scelto. */
        const offsetMinutes = minutesFromNow(segment.start, targetMinutes);

        const segmentService = getServiceType(segment.gt);
        const line = segment.lineaNorm || segment.ln || keyLine;
        /* Solo il numero letto da LINEA/VETTURA. Quando manca, il parser ci
           mette la chiave dello sviluppo come ripiego, che vettura non e'. */
        const vehicleShift = String(segment.vett || '').trim();

        /* L'identita' e' l'uscita reale - linea, ora di partenza, ora di
           arrivo, destinazione - non la riga da cui l'abbiamo letta. Lo stesso
           sviluppo finisce sotto piu' chiavi (il turno e la vettura) e il PDF
           lo ripete in ogni versione dell'orario: tenendo la chiave, o la
           vettura che in qualche copia si perde, la stessa uscita si contava
           una volta per copia. Un mezzo dal deposito esce una volta sola.

           Il tipo di servizio fa parte dell'identita': la stessa corsa di
           feriale e di sabato sono due uscite diverse, che capitano in due
           giorni diversi. */
        const identity = [segmentService, line, segment.start, segment.end, toPlace].join('|');
        const existing = byIdentity.get(identity);
        if (existing) {
          /* Fra due copie vince quella che porta l'informazione: se una ha il
             numero di vettura e l'altra no, si tiene il numero. */
          if (!existing.vehicleShift && vehicleShift) existing.vehicleShift = vehicleShift;
          if (!existing.direction) {
            const recovered = findRunDirection(run, index);
            if (recovered) {
              existing.direction = recovered;
              existing.directionLabel = getDirectionLabel(recovered);
              existing.directionFromRun = normalizeDirection(segment.dir) === '';
            }
          }
          return;
        }

        const direction = findRunDirection(run, index);

        byIdentity.set(identity, {
          arrival: segment.end,
          departure: segment.start,
          direction,
          directionLabel: getDirectionLabel(direction),
          /* Vero quando la direzione arriva da un tratto successivo della
             stessa corsa, non dal tratto che esce dal deposito. */
          directionFromRun: direction !== '' && normalizeDirection(segment.dir) === '',
          legMinutes: durationMinutes(segment.start, segment.end),
          line,
          offsetMinutes,
          service: segmentService,
          /* La chiave da cui il tratto e' stato letto: a volte e' il turno,
             a volte la vettura, e non c'e' modo di distinguerli. Resta qui
             perche' aiuta a rileggere il dato, ma non si mostra come turno. */
          shift,
          toPlace,
          vehicleShift,
        });
      });
    });
  });

  const exits = [...byIdentity.values()];
  const perDayPlace = new Map();
  const candidates = [];

  exits.forEach((item) => {
    const inWindow = Math.abs(item.offsetMinutes) <= windowMinutes;

    /* Su tutta la giornata: serve a dire quali servizi il PDF caricato
       contiene, non a spiegare una fascia oraria. */
    result.countByService[item.service] = (result.countByService[item.service] || 0) + 1;

    if (item.service !== service) {
      /* Le uscite dell'altro servizio si contano solo se sono davvero
         un'alternativa a quello che si sta cercando: stessa fascia, e stessa
         destinazione quando una e' stata scelta. Contarle tutte, su tutta la
         giornata, faceva dire al pannello numeri che non esistono. */
      if (!inWindow) return;
      if (wantedPlace && item.toPlace !== wantedPlace) return;
      result.otherServiceCount += 1;
      result.otherServiceByType[item.service] = (result.otherServiceByType[item.service] || 0) + 1;
      return;
    }

    /* Contate su tutta la giornata, prima della finestra: il selettore non
       deve svuotarsi mentre si sposta l'orario. */
    perDayPlace.set(item.toPlace, (perDayPlace.get(item.toPlace) || 0) + 1);
    if (inWindow) candidates.push(item);
    else result.outsideWindow += 1;
  });

  const found = wantedPlace ? candidates.filter((item) => item.toPlace === wantedPlace) : candidates;
  result.otherPlace = candidates.length - found.length;

  /* In ordine di orario, non di distanza dall'orario scelto: un elenco che
     salta avanti e indietro nel tempo non si legge. */
  found.sort((a, b) => a.offsetMinutes - b.offsetMinutes || String(a.line).localeCompare(String(b.line)));

  const perLine = new Map();
  const perWindowPlace = new Map();
  found.forEach((item) => {
    const line = String(item.line || '-');
    perLine.set(line, (perLine.get(line) || 0) + 1);
  });
  candidates.forEach((item) => {
    perWindowPlace.set(item.toPlace, (perWindowPlace.get(item.toPlace) || 0) + 1);
  });

  result.matches = found;
  result.total = found.length;
  result.byLine = [...perLine.entries()]
    .map(([line, count]) => ({ count, line }))
    .sort((a, b) => b.count - a.count || a.line.localeCompare(b.line, 'it', { numeric: true }));
  result.places = [...perDayPlace.entries()]
    .map(([place, count]) => ({ count, inWindow: perWindowPlace.get(place) || 0, place }))
    .sort((a, b) => b.count - a.count || a.place.localeCompare(b.place, 'it', { numeric: true }));

  return result;
}
