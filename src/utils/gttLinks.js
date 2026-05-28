import { CHANGE_POINTS, normalizeChangePoint } from '../constants/changePoints.js';
import { getLineDisplayName, normalizeLineCode } from '../constants/depotGerbido.js';

const GTT_ARRIVALS_BASE_URL = 'https://www.gtt.to.it/cms/percorari/arrivi';
const GTT_URBAN_BASE_URL = 'https://www.gtt.to.it/cms/percorari/urbano';
const GOOGLE_MAPS_SEARCH_URL = 'https://www.google.com/maps/search/';

function sanitizeToken(value = '') {
  return String(value ?? '').trim();
}

function getChangePointMeta(place = '') {
  const code = normalizeChangePoint(place);
  return {
    code,
    ...(CHANGE_POINTS[code] || {}),
  };
}

function normalizeDirection(value = '') {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized.startsWith('A')) return 'A';
  if (normalized.startsWith('R')) return 'R';
  return '-';
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

function buildStopUrl(line, palina) {
  const params = new URLSearchParams({
    option: 'com_gtt',
    view: 'palina',
    palina: sanitizeToken(palina),
  });
  return `${GTT_ARRIVALS_BASE_URL}?${params.toString()}`;
}

function buildMapSearchUrl({ line, meta }) {
  const query = [meta.mapSearch || meta.searchLabel || meta.label || meta.code, 'GTT', `linea ${getLineDisplayName(line)}`]
    .filter(Boolean)
    .join(' ');
  const params = new URLSearchParams({ api: '1', query });
  return `${GOOGLE_MAPS_SEARCH_URL}?${params.toString()}`;
}

function resolveStopByContext({ direction, line, meta }) {
  const normalizedLine = normalizeLineCode(line);
  const normalizedDirection = normalizeDirection(direction);
  const byLine = meta.stopsByLine?.[normalizedLine] || meta.stopsByLine?.[getLineDisplayName(line)] || null;
  if (!byLine) return null;
  return byLine[normalizedDirection] || byLine['-'] || byLine.A || byLine.R || null;
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
  const place = sanitizeToken(input.place);
  if (!line || !place) return null;

  const meta = getChangePointMeta(place);
  const label = meta.label || place;
  const lineLabel = getLineDisplayName(line);
  const resolvedStop = resolveStopByContext({
    direction: input.direction,
    line,
    meta,
  });
  const palina = resolvedStop?.palina || meta.palina || '';
  const hasDirectStop = Boolean(palina);

  return {
    direct: hasDirectStop,
    label: `Linea ${lineLabel} · ${resolvedStop?.label || label}`,
    mapUrl: buildMapSearchUrl({ line, meta }),
    palina,
    title: hasDirectStop
      ? `Apri i passaggi GTT per la linea ${lineLabel} alla palina ${palina}`
      : `Apri GTT per la linea ${lineLabel}. Palina non ancora mappata per ${label}`,
    url: hasDirectStop ? buildStopUrl(line, palina) : buildLineUrl(line),
  };
}
