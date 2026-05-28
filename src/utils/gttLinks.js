import { CHANGE_POINTS, normalizeChangePoint } from '../constants/changePoints.js';
import { getLineDisplayName, normalizeLineCode } from '../constants/depotGerbido.js';

const GTT_ARRIVALS_BASE_URL = 'https://www.gtt.to.it/cms/percorari/arrivi';
const GTT_URBAN_BASE_URL = 'https://www.gtt.to.it/cms/percorari/urbano';

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
  const normalizedLine = normalizeLineCode(line);
  const params = new URLSearchParams({
    option: 'com_gtt',
    view: 'palina',
    palina: sanitizeToken(palina),
    linea: normalizedLine || sanitizeToken(line),
  });
  return `${GTT_ARRIVALS_BASE_URL}?${params.toString()}`;
}

function resolveStopByContext({ direction, line, meta }) {
  const normalizedLine = normalizeLineCode(line);
  const normalizedDirection = normalizeDirection(direction);
  const byLine = meta.stopsByLine?.[normalizedLine] || meta.stopsByLine?.[getLineDisplayName(line)] || null;
  const candidates = byLine || meta.stops || null;
  if (!candidates) return null;
  return candidates[normalizedDirection] || candidates['-'] || candidates.A || candidates.R || null;
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
    palina,
    title: hasDirectStop
      ? `Apri i passaggi GTT per la linea ${lineLabel} alla palina ${palina}`
      : `Apri l'itinerario realtime GTT della linea ${lineLabel}`,
    url: hasDirectStop ? buildStopUrl(line, palina) : buildLineUrl(line),
  };
}
