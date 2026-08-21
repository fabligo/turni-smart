import { timeToMinutes } from './timeUtils.js';
import { isUsciteKey } from '../parserRientri.js';
import {
  DEPOT_CODE,
  SERVICE_TYPES,
  getServiceTypes,
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

/**
 * Le uscite dal deposito intorno a un orario.
 *
 * Serve a raggiungere un posto cambio: si sceglie l'ora in cui si e' al
 * Gerbido e si vede cosa parte in quel momento, su che linea e dove entra in
 * linea quel mezzo.
 *
 * Le uscite le da' **solo** il grafico di servizio, dove ogni vettura ha il suo
 * "Esce" e il suo "I.L.": sono il trasferimento vero, che dura i minuti che la
 * tabella TEMPI DI USCITA / RIENTRO dichiara. Una riga della pagina dei turni
 * comincia in deposito allo stesso modo ma finisce dove il conducente stacca,
 * ore dopo: e' la ripresa, e presentarla come un'uscita diceva "esce alle 04:48
 * e arriva a Cattaneo alle 10:15". E' lo stesso difetto dei rientri, con la
 * stessa cura (-> docs/decisioni/0001 e 0010).
 *
 * Il filtro utile e' il posto cambio: chi deve andare a Cattaneo vuole vedere i
 * mezzi che vanno a Cattaneo.
 *
 * Di ogni uscita si dice solo quello che il dato dice: ora in cui lascia il
 * deposito, linea, dove e quando entra in linea. Da che parte il mezzo prosegua
 * poi, e con quale vettura, il grafico non lo scrive in un posto che non si
 * confonda con altro: i due campi restano, vuoti, invece di essere indovinati.
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
    /* Come per i rientri: se il grafico di servizio non e' stato letto non c'e'
       niente su cui cercare, e dirlo e' l'unica risposta onesta. Le riprese
       della pagina dei turni non sono uscite e non vanno usate al suo posto. */
    graphicLoaded: false,
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
    // Solo il grafico di servizio: vedi sopra, e decisioni/0010.
    if (!isUsciteKey(key)) return;
    result.graphicLoaded = true;

    segments.forEach((segment) => {
      /* Il parser del grafico non produce altro, ma un'uscita che non parte
         dal deposito - o che ci torna senza toccare la linea - non porta a
         nessun posto cambio e non e' un mezzo da prendere. */
      if (normalizePlace(segment.loc_s) !== DEPOT_CODE) return;
      const toPlace = normalizePlace(segment.loc_e);
      if (!toPlace || toPlace === DEPOT_CODE) return;

      /* Negativo = parte prima dell'orario scelto. */
      const offsetMinutes = minutesFromNow(segment.start, targetMinutes);

      const segmentServices = getServiceTypes(segment.gt);
      /* La linea la porta il segmento. La chiave non e' un ripiego: comincia
         con USCITE, e usarla farebbe comparire "USCITE" al posto del numero. */
      const line = segment.lineaNorm || segment.ln || '';
      const vehicleShift = String(segment.vett || '').trim();
      const direction = normalizeDirection(segment.dir);

      /* L'identita' e' l'uscita reale - linea, ora di partenza, ora di
         arrivo, destinazione - non la riga da cui l'abbiamo letta. Il PDF
         ripete la stessa pagina in ogni versione dell'orario: tenendo la
         chiave, o la vettura che in qualche copia si perde, la stessa uscita
         si contava una volta per copia. Un mezzo dal deposito esce una volta
         sola.

         I giorni in cui gira non fanno identita' ma si sommano: la stessa
         uscita scritta una volta come feriale e una come "LUN - SAB" resta
         un'uscita sola, che pero' capita in entrambi i giorni. */
      const identity = [line, segment.start, segment.end, toPlace].join('|');
      const existing = byIdentity.get(identity);
      if (existing) {
        segmentServices.forEach((type) => existing.services.add(type));
        /* Fra due copie vince quella che porta l'informazione: se una ha il
           numero di vettura e l'altra no, si tiene il numero. */
        if (!existing.vehicleShift && vehicleShift) existing.vehicleShift = vehicleShift;
        if (!existing.direction && direction) {
          existing.direction = direction;
          existing.directionLabel = getDirectionLabel(direction);
        }
        return;
      }

      byIdentity.set(identity, {
        services: new Set(segmentServices),
        arrival: segment.end,
        departure: segment.start,
        /* Il grafico dice dove la vettura entra in linea, non da che parte
           prosegue: oggi resta vuota sempre, e il campo c'e' perche' il giorno
           in cui quella pagina lo dicesse non ci sia altro da cambiare. */
        direction,
        directionLabel: getDirectionLabel(direction),
        /* Quanto dura il trasferimento: sono i minuti della tabella TEMPI DI
           USCITA / RIENTRO, nove per Cattaneo. Un numero a tre cifre qui vuol
           dire che si sta leggendo una ripresa. */
        legMinutes: durationMinutes(segment.start, segment.end),
        line,
        offsetMinutes,
        service,
        toPlace,
        vehicleShift,
      });
    });
  });

  const exits = [...byIdentity.values()];
  const perDayPlace = new Map();
  const candidates = [];

  exits.forEach((item) => {
    const inWindow = Math.abs(item.offsetMinutes) <= windowMinutes;

    /* Su tutta la giornata, e una volta per ogni giorno in cui l'uscita
       gira: serve a dire cosa contiene il PDF caricato, non a spiegare una
       fascia oraria. */
    item.services.forEach((type) => {
      result.countByService[type] = (result.countByService[type] || 0) + 1;
    });

    if (!item.services.has(service)) {
      /* Le uscite dell'altro servizio si contano solo se sono davvero
         un'alternativa a quello che si sta cercando: stessa fascia, e stessa
         destinazione quando una e' stata scelta. Contarle tutte, su tutta la
         giornata, faceva dire al pannello numeri che non esistono. */
      if (!inWindow) return;
      if (wantedPlace && item.toPlace !== wantedPlace) return;
      result.otherServiceCount += 1;
      item.services.forEach((type) => {
        result.otherServiceByType[type] = (result.otherServiceByType[type] || 0) + 1;
      });
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
