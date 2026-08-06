import { CHANGE_POINTS, getChangePointLabel, normalizeChangePoint } from '../constants/changePoints.js';

const STORAGE_KEY = 'ts_change_points_v1';
const MAX_NAME_LENGTH = 40;

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

export function normalizeName(value) {
  const name = String(value ?? '').replace(/\s+/g, ' ').trim();
  return name ? name.slice(0, MAX_NAME_LENGTH) : '';
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

function normalizeEntry(value) {
  if (!value || typeof value !== 'object') return null;
  const name = normalizeName(value.name);
  const position = normalizePosition(value.position);
  if (!name && !position) return null;
  return {
    ...(name ? { name } : {}),
    ...(position ? { position } : {}),
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
      const normalized = normalizeEntry(entry);
      if (normalized) directory[normalizeChangePoint(code)] = normalized;
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

function updateEntry(code, changes, storage) {
  const normalizedCode = normalizeChangePoint(code);
  const directory = loadChangePointDirectory(storage);
  if (!normalizedCode) return directory;
  const merged = normalizeEntry({ ...directory[normalizedCode], ...changes });
  if (merged) directory[normalizedCode] = merged;
  else delete directory[normalizedCode];
  return writeDirectory(directory, storage);
}

export function setChangePointName(code, name, storage) {
  return updateEntry(code, { name: normalizeName(name) }, storage);
}

export function setChangePointPosition(code, position, storage) {
  const normalized = normalizePosition(position);
  if (!normalized) return loadChangePointDirectory(storage);
  return updateEntry(code, { position: normalized }, storage);
}

export function clearChangePointPosition(code, storage) {
  return updateEntry(code, { position: null }, storage);
}

/**
 * Il nome scelto da chi guida vince sempre: le etichette di serie sono solo
 * quelle che risultano certe, e per la maggior parte dei codici non esistono.
 */
export function resolveChangePointName(code, directory = {}) {
  const normalizedCode = normalizeChangePoint(code);
  return directory[normalizedCode]?.name || getChangePointLabel(normalizedCode);
}

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
