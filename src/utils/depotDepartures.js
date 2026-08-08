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

/* Quanto avanti guardare da un orario, se non viene chiesto altro: mezza
   giornata copre l'inizio e la fine di qualsiasi turno. */
export const DEPARTURE_HORIZON_MINUTES = 720;

function durationMinutes(start, end) {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);
  if (endMinutes < startMinutes) endMinutes += 1440;
  return endMinutes - startMinutes;
}

/**
 * Le uscite dal deposito, dall'orario indicato in avanti.
 *
 * E' lo specchio della ricerca dei rientri: la' si cerca chi passa da un posto
 * cambio e torna a Gerbido, qui chi parte da Gerbido e va a inserirsi in linea.
 * Torna anche il conto per linea, perche' la domanda vera non e' solo "quante
 * uscite ci sono" ma "di che linee sono".
 *
 * Di ogni uscita si dice quello che il dato dice: ora di partenza dal
 * deposito, linea, turno, e dove finisce il primo tratto. Se quel tratto sia
 * un trasferimento o gia' servizio, gli sviluppi non lo distinguono.
 *
 * Come per i rientri, i contatori raccontano perche' una ricerca resta vuota:
 * senza quelli "nessuna uscita" e indistinguibile da una funzione rotta.
 */
export function searchDepartures(developments = {}, options = {}) {
  const {
    now = new Date(),
    time = '',
    horizonMinutes = DEPARTURE_HORIZON_MINUTES,
    service: requestedService = '',
  } = options;

  const explicitMinutes = parseClockMinutes(time);
  const targetDate = new Date(now.getTime());
  if (explicitMinutes !== null) {
    targetDate.setHours(Math.floor(explicitMinutes / 60), explicitMinutes % 60, 0, 0);
  }
  const targetMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const service = SERVICE_TYPES.includes(requestedService) ? requestedService : getTodayServiceType(targetDate);

  const result = {
    byLine: [],
    horizonMinutes,
    matches: [],
    /* Uscite che cadono nell'orizzonte ma in un altro tipo di servizio: e' la
       spiegazione piu' frequente di un elenco vuoto al sabato o di festa. */
    otherServiceCount: 0,
    countByService: {},
    outsideHorizon: 0,
    service,
    targetMinutes,
    total: 0,
  };

  const seen = new Set();
  const found = [];

  Object.entries(developments).forEach(([key, segments]) => {
    if (!Array.isArray(segments)) return;
    const { line: keyLine, shift } = getShiftParts(key);

    segments.forEach((segment) => {
      if (normalizePlace(segment.loc_s) !== DEPOT_CODE) return;

      const waitMinutes = minutesFromNow(segment.start, targetMinutes);
      if (waitMinutes < 0) return;

      /* Prima il servizio, poi l'orizzonte: cosi' "ce ne sono altre piu'
         avanti" conta solo uscite dello stesso servizio, che sono le uniche
         che l'utente potrebbe davvero prendere allargando la ricerca. */
      const segmentService = getServiceType(segment.gt);
      result.countByService[segmentService] = (result.countByService[segmentService] || 0) + 1;
      if (segmentService !== service) {
        result.otherServiceCount += 1;
        return;
      }
      if (waitMinutes > horizonMinutes) {
        result.outsideHorizon += 1;
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
        /* Dove finisce il primo tratto, e niente di piu'. Negli sviluppi un
           tratto che parte dal deposito a volte e' un trasferimento di pochi
           minuti e a volte e' cinque ore di servizio: chiamarlo "punto di
           inserimento" sarebbe una lettura che il dato non autorizza. */
        toPlace: normalizePlace(segment.loc_e),
        line,
        legMinutes: durationMinutes(segment.start, segment.end),
        service,
        shift,
        vehicleShift,
        waitMinutes,
      });
    });
  });

  found.sort((a, b) => a.waitMinutes - b.waitMinutes || String(a.line).localeCompare(String(b.line)));

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
