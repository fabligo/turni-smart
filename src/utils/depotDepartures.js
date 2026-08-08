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
 * Gerbido e si vede cosa parte in quel momento, su che linea e in che
 * direzione - perche' e' la direzione a decidere se quel mezzo porta dove
 * serve o dalla parte opposta.
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
    time = '',
    windowMinutes = DEPARTURE_WINDOW_MINUTES,
    direction: requestedDirection = '',
    service: requestedService = '',
  } = options;

  const explicitMinutes = parseClockMinutes(time);
  const targetDate = new Date(now.getTime());
  if (explicitMinutes !== null) {
    targetDate.setHours(Math.floor(explicitMinutes / 60), explicitMinutes % 60, 0, 0);
  }
  const targetMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const service = SERVICE_TYPES.includes(requestedService) ? requestedService : getTodayServiceType(targetDate);
  const wantedDirection = normalizeDirection(requestedDirection);

  const result = {
    byLine: [],
    countByService: {},
    direction: wantedDirection,
    matches: [],
    /* Uscite dentro la finestra ma dell'altra direzione: e' la ragione piu'
       frequente di un elenco corto quando si filtra. */
    otherDirection: 0,
    /* Uscite dentro la finestra ma di un altro tipo di servizio. */
    otherServiceCount: 0,
    outsideWindow: 0,
    service,
    targetMinutes,
    total: 0,
    windowMinutes,
  };

  const seen = new Set();
  const found = [];

  Object.entries(developments).forEach(([key, segments]) => {
    if (!Array.isArray(segments)) return;
    const { line: keyLine, shift } = getShiftParts(key);

    groupByRun(segments).forEach((run) => {
      run.forEach((segment, index) => {
        if (normalizePlace(segment.loc_s) !== DEPOT_CODE) return;

        /* Negativo = parte prima dell'orario scelto. */
        const offsetMinutes = minutesFromNow(segment.start, targetMinutes);

        const segmentService = getServiceType(segment.gt);
        result.countByService[segmentService] = (result.countByService[segmentService] || 0) + 1;
        if (segmentService !== service) {
          result.otherServiceCount += 1;
          return;
        }
        if (Math.abs(offsetMinutes) > windowMinutes) {
          result.outsideWindow += 1;
          return;
        }

        const direction = findRunDirection(run, index);
        if (wantedDirection && direction !== wantedDirection) {
          result.otherDirection += 1;
          return;
        }

        const line = segment.lineaNorm || segment.ln || keyLine;
        const vehicleShift = segment.vett || segment.turnoVettura || '';
        const identity = [line, shift, segment.start, normalizePlace(segment.loc_e), vehicleShift].join('|');
        if (seen.has(identity)) return;
        seen.add(identity);

        found.push({
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
          service,
          shift,
          toPlace: normalizePlace(segment.loc_e),
          vehicleShift,
        });
      });
    });
  });

  /* In ordine di orario, non di distanza dall'orario scelto: un elenco che
     salta avanti e indietro nel tempo non si legge. */
  found.sort((a, b) => a.offsetMinutes - b.offsetMinutes || String(a.line).localeCompare(String(b.line)));

  const perLine = new Map();
  found.forEach((item) => {
    const line = String(item.line || '-');
    perLine.set(line, (perLine.get(line) || 0) + 1);
  });

  result.matches = found;
  result.total = found.length;
  result.byLine = [...perLine.entries()]
    .map(([line, count]) => ({ count, line }))
    .sort((a, b) => b.count - a.count || a.line.localeCompare(b.line, 'it', { numeric: true }));

  return result;
}
