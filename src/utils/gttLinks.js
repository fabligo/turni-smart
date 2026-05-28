import { CHANGE_POINTS, normalizeChangePoint } from '../constants/changePoints.js';
import { getLineDisplayName, normalizeLineCode } from '../constants/depotGerbido.js';

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
    bacino: 'U',
    linea: normalizedLine || sanitizeToken(line),
    palina: sanitizeToken(palina),
    realtime: 'true',
    view: 'palina',
  });
  return `${GTT_URBAN_BASE_URL}?${params.toString()}`;
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
  const hasDirectStop = Boolean(meta.palina);

  return {
    direct: hasDirectStop,
    label: `Linea ${lineLabel} · ${label}`,
    title: hasDirectStop
      ? `Apri i passaggi GTT per la linea ${lineLabel} a ${label}`
      : `Apri GTT per la linea ${lineLabel}. Palina non configurata per ${label}`,
    url: hasDirectStop ? buildStopUrl(line, meta.palina) : buildLineUrl(line),
  };
}
