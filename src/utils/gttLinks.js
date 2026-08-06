import { getChangePointAddress, getChangePointStop, normalizeChangePoint } from '../constants/changePoints.js';
import { getLineDisplayName, normalizeLineCode } from '../constants/depotGerbido.js';

const GTT_ARRIVALS_BASE_URL = 'https://www.gtt.to.it/cms/percorari/arrivi';
const GTT_URBAN_BASE_URL = 'https://www.gtt.to.it/cms/percorari/urbano';
const MAPS_SEARCH_BASE_URL = 'https://www.google.com/maps/search/';
const MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/';
const MOOVIT_WEB_URL = 'https://moovitapp.com/';
// Lo schema dell'app: un indirizzo https resta una pagina web e il telefono la
// apre come tale, con dentro il tasto "apri l'app". Con moovit:// il sistema
// consegna direttamente all'app installata.
const MOOVIT_APP_URL = 'moovit://directions';
// Il deposito e' in via Gorini: lo dice GTT stessa, che sulla 74 scrive come
// destinazione "Gerbido / Via Gorini".
const DEPOT_DESTINATION = 'Via Gorini, Torino';
// Moovit vuole la destinazione come coordinate, un nome non gli basta. Questa
// posizione del deposito e' quella con cui il progetto e' nato e nessuno l'ha
// verificata: si vede subito sulla mappa dove cade il segnaposto, ed e' il solo
// punto in cui viene usata.
const DEPOT_POSITION = { lat: 45.0419, lng: 7.5886 };

function sanitizeToken(value = '') {
  return String(value ?? '').trim();
}

function buildLineUrl(line) {
  const normalizedLine = normalizeLineCode(line);
  const params = new URLSearchParams({
    bacino: 'U',
    linea: normalizedLine || sanitizeToken(line),
    realtime: 'true',
    view: 'percorsi',
  });
  return `${GTT_URBAN_BASE_URL}?${params.toString()}`;
}

/**
 * Le fermate intorno a dove ci si trova adesso: e' l'unico dato di posizione
 * che non richiede una mappa di paline scritta a mano, e quindi l'unico che non
 * puo' mandare su una fermata sbagliata.
 */
export function buildNearbyStopsUrl({ lat, lng } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  return `${MAPS_SEARCH_BASE_URL}fermate+GTT/@${lat.toFixed(6)},${lng.toFixed(6)},16z`;
}

/**
 * Il percorso in mezzi pubblici da dove ci si trova fino al deposito: linee da
 * prendere e cambi da fare li calcola la mappa sulla rete GTT vera, che qui non
 * abbiamo. E' la risposta quando nessuna corsa di servizio rientra utile.
 */
export function buildDepotDirectionsUrl({ lat, lng } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  const params = new URLSearchParams({
    api: '1',
    origin: `${lat.toFixed(6)},${lng.toFixed(6)}`,
    destination: DEPOT_DESTINATION,
    travelmode: 'transit',
  });
  return `${MAPS_DIRECTIONS_URL}?${params.toString()}`;
}

/**
 * Lo stesso percorso su Moovit, che sui trasporti di Torino e' quello che si
 * usa davvero. Sul telefono l'indirizzo apre l'app se e' installata.
 */
export function buildMoovitWebUrl({ lat, lng } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  const params = new URLSearchParams({
    from: 'La mia posizione',
    fll: `${lat.toFixed(6)}_${lng.toFixed(6)}`,
    to: DEPOT_DESTINATION,
    tll: `${DEPOT_POSITION.lat.toFixed(6)}_${DEPOT_POSITION.lng.toFixed(6)}`,
    lang: 'it',
  });
  return `${MOOVIT_WEB_URL}?${params.toString()}`;
}

/**
 * Lo stesso percorso ma consegnato all'app Moovit. I parametri vanno scritti a
 * mano: URLSearchParams mette il piu' al posto dello spazio, che dentro uno
 * schema personalizzato non viene riletto come spazio.
 */
export function buildMoovitDirectionsUrl({ lat, lng } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  const query = [
    ['orig_lat', lat.toFixed(6)],
    ['orig_lon', lng.toFixed(6)],
    ['orig_name', 'La mia posizione'],
    ['dest_lat', DEPOT_POSITION.lat.toFixed(6)],
    ['dest_lon', DEPOT_POSITION.lng.toFixed(6)],
    ['dest_name', DEPOT_DESTINATION],
    ['auto_run', 'true'],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return `${MOOVIT_APP_URL}?${query}`;
}

/**
 * Il percorso da dove ci si trova fino al posto cambio da cui parte un rientro:
 * serve a sapere se si fa in tempo a prenderlo. La destinazione e' l'indirizzo
 * che GTT stampa sulla fermata, quindi non servono coordinate.
 */
export function buildChangePointDirectionsUrl({ lat, lng } = {}, code = '') {
  const address = getChangePointAddress(code);
  if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  const params = new URLSearchParams({
    api: '1',
    origin: `${lat.toFixed(6)},${lng.toFixed(6)}`,
    destination: address,
    travelmode: 'transit',
  });
  return `${MAPS_DIRECTIONS_URL}?${params.toString()}`;
}

export function getPrimaryGttChangePoint({ shift, dayData, segments = [] }) {
  const firstSegment = segments[0] || {};
  const line = dayData?.lineaNorm || firstSegment.linea || shift?.line || dayData?.l || '';
  const place = firstSegment.loc_s || shift?.startPlace || dayData?.li || '';
  const direction = firstSegment.dir || shift?.startDirection || shift?.direction || dayData?.di || '';
  const time = firstSegment.start || shift?.start || dayData?.hi || '';

  return {
    direction,
    line,
    place,
    time,
  };
}

function buildStopUrl(line, palina) {
  const params = new URLSearchParams({
    option: 'com_gtt',
    view: 'palina',
    palina: sanitizeToken(palina),
    linea: normalizeLineCode(line) || sanitizeToken(line),
  });
  return `${GTT_ARRIVALS_BASE_URL}?${params.toString()}`;
}

/**
 * I passaggi della palina del posto cambio dove inizia il turno: la palina e'
 * un dato raccolto sul campo, quindi si puo' puntare la fermata esatta. Il
 * nome del posto cambio invece arriva da fuori, perche' lo decide chi guida.
 */
export function buildGttPassagesTarget(input = {}) {
  const line = sanitizeToken(input.line);
  if (!line) return null;

  const place = normalizeChangePoint(input.place);
  const lineLabel = getLineDisplayName(line);
  const placeLabel = sanitizeToken(input.placeLabel) || place;
  const palina = getChangePointStop(place, { direction: input.direction, line: normalizeLineCode(line) });

  return {
    label: palina ? `Linea ${lineLabel} · ${placeLabel}` : `Linea ${lineLabel}`,
    line: lineLabel,
    palina,
    title: palina
      ? `Apri i passaggi GTT della linea ${lineLabel} alla palina ${palina}${placeLabel ? ` (${placeLabel})` : ''}`
      : `Apri l'itinerario realtime GTT della linea ${lineLabel}`,
    url: palina ? buildStopUrl(line, palina) : buildLineUrl(line),
  };
}
