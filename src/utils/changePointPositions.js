import { CHANGE_POINTS, normalizeChangePoint } from '../constants/changePoints.js';

const STORAGE_KEY = 'ts_change_point_coords_v1';

function getStorage(storage) {
  if (storage) return storage;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidCoordinate(value) {
  if (!value) return false;
  const { lat, lng } = value;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function normalizePosition(value) {
  if (!value) return null;
  const lat = Number(value.lat ?? value.latitude);
  const lng = Number(value.lng ?? value.longitude);
  if (!isValidCoordinate({ lat, lng })) return null;
  const accuracy = Number(value.accuracy);
  return {
    lat,
    lng,
    ...(Number.isFinite(accuracy) ? { accuracy: Math.round(accuracy) } : {}),
    savedAt: value.savedAt || new Date().toISOString(),
  };
}

export function loadSavedPositions(storage) {
  const store = getStorage(storage);
  if (!store) return {};
  try {
    const raw = store.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.entries(parsed).reduce((saved, [code, position]) => {
      const normalized = normalizePosition(position);
      if (normalized) saved[normalizeChangePoint(code)] = normalized;
      return saved;
    }, {});
  } catch {
    return {};
  }
}

function writePositions(positions, storage) {
  const store = getStorage(storage);
  if (!store) return positions;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Spazio esaurito o storage negato: la posizione resta valida per la sessione.
  }
  return positions;
}

export function saveChangePointPosition(code, position, storage) {
  const normalizedCode = normalizeChangePoint(code);
  const normalized = normalizePosition(position);
  if (!normalizedCode || !normalized) return loadSavedPositions(storage);
  return writePositions({ ...loadSavedPositions(storage), [normalizedCode]: normalized }, storage);
}

export function clearChangePointPosition(code, storage) {
  const normalizedCode = normalizeChangePoint(code);
  const positions = loadSavedPositions(storage);
  if (!positions[normalizedCode]) return positions;
  delete positions[normalizedCode];
  return writePositions(positions, storage);
}

/**
 * Le coordinate registrate sul posto vincono su quelle di serie: sono prese
 * col GPS dove il posto cambio si trova davvero, quelle predefinite sono solo
 * un punto di partenza approssimativo.
 */
export function getChangePointCoordinates(code, savedPositions = {}) {
  const normalizedCode = normalizeChangePoint(code);
  const saved = savedPositions[normalizedCode];
  if (saved) return { ...saved, source: 'saved' };
  const preset = CHANGE_POINTS[normalizedCode]?.coordinates;
  if (!isValidCoordinate(preset)) return null;
  return { ...preset, source: 'preset' };
}

export function listLocatedChangePoints(savedPositions = {}) {
  const codes = new Set([...Object.keys(CHANGE_POINTS), ...Object.keys(savedPositions)]);
  return [...codes]
    .map((code) => ({ code, coordinates: getChangePointCoordinates(code, savedPositions) }))
    .filter((item) => item.coordinates);
}
