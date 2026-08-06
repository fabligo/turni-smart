import { getChangePointStop, normalizeChangePoint } from '../constants/changePoints.js';
import { getLineDisplayName, normalizeLineCode } from '../constants/depotGerbido.js';

const GTT_ARRIVALS_BASE_URL = 'https://www.gtt.to.it/cms/percorari/arrivi';
const GTT_URBAN_BASE_URL = 'https://www.gtt.to.it/cms/percorari/urbano';
const MAPS_SEARCH_BASE_URL = 'https://www.google.com/maps/search/';

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
