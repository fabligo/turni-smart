import { CHANGE_POINTS, normalizeChangePoint } from '../constants/changePoints.js';

const STORAGE_KEY = 'ts_change_points_v1';

function getStorage(storage) {
  if (storage) return storage;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidCoordinate(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function normalizePosition(value) {
  if (!value) return null;
  const lat = Number(value.lat ?? value.latitude);
  const lng = Number(value.lng ?? value.longitude);
  if (!isValidCoordinate(lat, lng)) return null;
  const accuracy = Number(value.accuracy);
  return {
    lat,
    lng,
    ...(Number.isFinite(accuracy) ? { accuracy: Math.round(accuracy) } : {}),
    savedAt: value.savedAt || new Date().toISOString(),
  };
}

export function loadChangePointDirectory(storage) {
  const store = getStorage(storage);
  if (!store) return {};
  try {
    const raw = store.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.entries(parsed).reduce((directory, [code, entry]) => {
      const position = normalizePosition(entry?.position);
      if (position) directory[normalizeChangePoint(code)] = { position };
      return directory;
    }, {});
  } catch {
    return {};
  }
}

function writeDirectory(directory, storage) {
  const store = getStorage(storage);
  if (!store) return directory;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(directory));
  } catch {
    // Spazio esaurito o storage negato: il dato resta valido per la sessione.
  }
  return directory;
}

export function setChangePointPosition(code, position, storage) {
  const normalizedCode = normalizeChangePoint(code);
  const normalized = normalizePosition(position);
  const directory = loadChangePointDirectory(storage);
  if (!normalizedCode || !normalized) return directory;
  return writeDirectory({ ...directory, [normalizedCode]: { position: normalized } }, storage);
}

export function clearChangePointPosition(code, storage) {
  const normalizedCode = normalizeChangePoint(code);
  const directory = loadChangePointDirectory(storage);
  if (!directory[normalizedCode]) return directory;
  delete directory[normalizedCode];
  return writeDirectory(directory, storage);
}

/**
 * La posizione registrata sul posto vince su quella di serie: e' presa col GPS
 * dove il posto cambio si trova davvero.
 */
export function resolveChangePointPosition(code, directory = {}) {
  const normalizedCode = normalizeChangePoint(code);
  const saved = directory[normalizedCode]?.position;
  if (saved) return { ...saved, source: 'saved' };
  const preset = CHANGE_POINTS[normalizedCode]?.coordinates;
  if (!preset || !isValidCoordinate(preset.lat, preset.lng)) return null;
  return { ...preset, source: 'preset' };
}

export function listLocatedChangePoints(directory = {}) {
  const codes = new Set([...Object.keys(CHANGE_POINTS), ...Object.keys(directory)]);
  return [...codes]
    .map((code) => ({ code, position: resolveChangePointPosition(code, directory) }))
    .filter((item) => item.position);
}
