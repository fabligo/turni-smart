import { timeToMinutes } from './timeUtils.js';

export const DEPOT_CODE = 'GERB';
export const RETURN_WINDOW_MINUTES = 30;
// Oltre la finestra scelta continuiamo a guardare avanti: serve solo a dire
// all'utente a che ora passa il primo rientro utile, non a proporlo come esito.
export const SEARCH_HORIZON_MINUTES = 720;
export const SERVICE_TYPES = ['feriali', 'sabato', 'festivi'];

// Un rientro utile resta una corsa sola o pochi tratti concatenati dello stesso
// mezzo: oltre questi limiti non e' piu' un rientro immediato in deposito.
const MAX_LEGS = 4;
const MAX_LAYOVER_MINUTES = 20;
export const MAX_RIDE_MINUTES = 90;

export function normalizePlace(value = '') {
  return String(value || '').trim().toUpperCase();
}

// Accetta l'orario digitato dall'utente solo se e' un HH:MM valido.
export function parseClockMinutes(value = '') {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatClock(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function getShiftParts(key = '') {
  const [line = '', shift = ''] = String(key).split(/\s+/);
  return { line, shift };
}

export function getServiceType(value = '') {
  const service = String(value || '').toUpperCase();
  if (service.includes('SAB')) return 'sabato';
  if (service.includes('FEST') || service.includes('DOM')) return 'festivi';
  return 'feriali';
}

export function getTodayServiceType(date = new Date()) {
  const day = date.getDay();
  if (day === 0) return 'festivi';
  if (day === 6) return 'sabato';
  return 'feriali';
}

// Le corse a cavallo della mezzanotte tornano indietro di un giorno: se il
// distacco negativo e' molto ampio la corsa appartiene al giorno successivo.
export function minutesFromNow(start, targetMinutes) {
  let startMinutes = timeToMinutes(start);
  if (startMinutes < targetMinutes - 720) startMinutes += 1440;
  return startMinutes - targetMinutes;
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

// Il tratto successivo deve ripartire da dove finisce il precedente e senza
// attese lunghe: solo cosi' il mezzo prosegue davvero verso il deposito.
function findNextLeg(run, current, usedIndexes) {
  const arrival = normalizePlace(current.loc_e);
  for (let index = 0; index < run.length; index += 1) {
    if (usedIndexes.has(index)) continue;
    const candidate = run[index];
    if (normalizePlace(candidate.loc_s) !== arrival) continue;
    const layover = durationMinutes(current.end, candidate.start);
    if (layover < 0 || layover > MAX_LAYOVER_MINUTES) continue;
    return { candidate, index };
  }
  return null;
}

function buildChain(run, startIndex) {
  const chain = [run[startIndex]];
  const usedIndexes = new Set([startIndex]);

  while (chain.length <= MAX_LEGS) {
    const last = chain[chain.length - 1];
    if (normalizePlace(last.loc_e) === DEPOT_CODE) return chain;
    if (chain.length === MAX_LEGS) return null;
    const next = findNextLeg(run, last, usedIndexes);
    if (!next) return null;
    usedIndexes.add(next.index);
    chain.push(next.candidate);
  }

  return null;
}

// L'orario esplicito vince sull'offset: e' l'ora in cui l'utente passa
// davvero dal posto cambio.
function resolveTargetDate({ now, offsetMinutes, time }) {
  const explicitMinutes = parseClockMinutes(time);
  const targetDate = new Date(now.getTime());
  if (explicitMinutes === null) {
    targetDate.setMinutes(targetDate.getMinutes() + offsetMinutes);
  } else {
    targetDate.setHours(Math.floor(explicitMinutes / 60), explicitMinutes % 60, 0, 0);
  }
  return targetDate;
}

/**
 * Cerca i rientri e racconta anche perche' una ricerca resta vuota: senza
 * questi conteggi il pannello puo' solo dire "nessun risultato", che e'
 * indistinguibile da una funzione rotta.
 *
 * Torna i rientri dentro la finestra (`matches`), quelli piu' avanti
 * nell'orizzonte di ricerca (`upcoming`) e i contatori dei passaggi dal posto
 * cambio, divisi per tipo di servizio.
 */
export function searchReturns(developments = {}, selectedPlace, options = {}) {
  const place = normalizePlace(selectedPlace);

  const {
    now = new Date(),
    offsetMinutes = 0,
    time = '',
    windowMinutes = RETURN_WINDOW_MINUTES,
    horizonMinutes = SEARCH_HORIZON_MINUTES,
    service: requestedService = '',
  } = options;

  const targetDate = resolveTargetDate({ now, offsetMinutes, time });
  const targetMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const service = SERVICE_TYPES.includes(requestedService) ? requestedService : getTodayServiceType(targetDate);
  const horizon = Math.max(windowMinutes, horizonMinutes);

  const result = {
    isDepot: place === DEPOT_CODE,
    matches: [],
    // Passaggi dal posto cambio nell'orizzonte, anche se non portano in deposito.
    passages: 0,
    passagesByService: {},
    // Perche' un passaggio non e' diventato un rientro: senza questi numeri
    // "nessuno prosegue" non distingue un mezzo che il deposito non lo vede
    // proprio da uno che ci arriva dopo mezza giornata di giro.
    noDepotChain: 0,
    longRides: 0,
    shortestLongRide: null,
    place,
    placeKnown: false,
    service,
    targetMinutes,
    upcoming: [],
    windowMinutes,
  };

  if (!place || place === DEPOT_CODE) return result;

  const seen = new Set();
  const found = [];

  Object.entries(developments).forEach(([key, segments]) => {
    if (!Array.isArray(segments)) return;
    const { line: keyLine, shift } = getShiftParts(key);

    groupByRun(segments).forEach((run) => {
      run.forEach((segment, index) => {
        if (normalizePlace(segment.loc_s) === place || normalizePlace(segment.loc_e) === place) {
          result.placeKnown = true;
        }
        if (normalizePlace(segment.loc_s) !== place) return;

        const waitMinutes = minutesFromNow(segment.start, targetMinutes);
        if (waitMinutes < 0 || waitMinutes > horizon) return;

        const segmentService = getServiceType(segment.gt);
        result.passagesByService[segmentService] = (result.passagesByService[segmentService] || 0) + 1;
        if (segmentService !== service) return;
        result.passages += 1;

        const chain = buildChain(run, index);
        if (!chain) {
          result.noDepotChain += 1;
          return;
        }

        const arrival = chain[chain.length - 1];
        const rideMinutes = durationMinutes(segment.start, arrival.end);
        if (rideMinutes > MAX_RIDE_MINUTES) {
          result.longRides += 1;
          result.shortestLongRide =
            result.shortestLongRide === null ? rideMinutes : Math.min(result.shortestLongRide, rideMinutes);
          return;
        }

        const line = segment.lineaNorm || segment.ln || keyLine;
        const vehicleShift = segment.vett || segment.turnoVettura || '';
        const identity = [line, segment.start, arrival.end, vehicleShift, chain.length].join('|');
        if (seen.has(identity)) return;
        seen.add(identity);

        found.push({
          arrival: arrival.end,
          departure: segment.start,
          direct: chain.length === 1,
          legs: chain.map((leg) => ({
            end: leg.end,
            from: normalizePlace(leg.loc_s),
            line: leg.lineaNorm || leg.ln || keyLine,
            start: leg.start,
            to: normalizePlace(leg.loc_e),
          })),
          line,
          rideMinutes,
          route: [normalizePlace(segment.loc_s), ...chain.map((leg) => normalizePlace(leg.loc_e))].join(' → '),
          service,
          shift,
          vehicleShift,
          waitMinutes,
        });
      });
    });
  });

  found.sort(
    (a, b) => a.waitMinutes - b.waitMinutes || a.rideMinutes - b.rideMinutes || timeToMinutes(a.departure) - timeToMinutes(b.departure),
  );

  result.matches = found.filter((item) => item.waitMinutes <= windowMinutes);
  result.upcoming = found.filter((item) => item.waitMinutes > windowMinutes);

  return result;
}

/**
 * Restituisce i mezzi che transitano dal posto cambio indicato entro la
 * finestra richiesta e che proseguono fino al deposito Gerbido, anche quando
 * il deposito non e' il capolinea del primo tratto.
 */
export function buildReturnMatches(developments = {}, selectedPlace, options = {}) {
  return searchReturns(developments, selectedPlace, options).matches;
}
