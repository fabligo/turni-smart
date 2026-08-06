import { getLineDisplayName, normalizeLineCode } from '../constants/depotGerbido.js';

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

export function buildGttPassagesTarget(input = {}) {
  const line = sanitizeToken(input.line);
  if (!line) return null;

  const lineLabel = getLineDisplayName(line);
  return {
    label: `Linea ${lineLabel}`,
    line: lineLabel,
    title: `Fermate intorno a dove sei adesso, con l'itinerario realtime della linea ${lineLabel} come alternativa`,
    url: buildLineUrl(line),
  };
}
