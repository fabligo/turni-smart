// I codici dei posti cambio arrivano dagli orari GTT e le paline sono raccolte
// sul campo da chi guida queste linee: sono dati veri. Nomi e coordinate no,
// nessuno li ha verificati, quindi qui non ce ne sono e il posto cambio si
// mostra com'e' scritto negli orari. A = andata, R = ritorno.
export const CHANGE_POINTS = {
  GERB: {
    label: 'Deposito Gerbido',
  },
  CATT: {
    stops: { A: '307', R: '308' },
  },
  ORSN: {
    stops: { A: '317', R: '318' },
  },
  ORSA: {
    stops: { A: '728', R: '729' },
    // Sulla 62 le due direzioni sono invertite rispetto alle altre linee.
    stopsByLine: { 62: { A: '729', R: '728' } },
  },
  PITA: {
    stops: { A: '134', R: '135' },
  },
  FILA: {},
  LING: {
    stops: { A: '2604', R: '2603' },
  },
  BENS: {
    stops: { A: '3628', R: '1023' },
  },
  OSET: {
    stops: { A: '299', R: '300' },
  },
  CAIO: {
    stops: { A: '1119', R: '1119' },
  },
  BARB: {
    stops: { A: '1169', R: '1170' },
  },
  CLGR: {
    stops: { A: '969', R: '968' },
  },
  CLMA: {
    stops: { A: '853', R: '852' },
  },
};

export function getChangePointStop(code, { direction = '', line = '' } = {}) {
  const meta = CHANGE_POINTS[normalizeChangePoint(code)];
  if (!meta) return '';
  const byLine = meta.stopsByLine?.[String(line).trim()];
  const stops = byLine || meta.stops;
  if (!stops) return '';
  const normalizedDirection = String(direction || '').trim().toUpperCase().startsWith('R') ? 'R' : 'A';
  return stops[normalizedDirection] || stops.A || stops.R || '';
}

export function normalizeChangePoint(code) {
  return String(code ?? '').trim().toUpperCase();
}

export function getChangePointLabel(code) {
  const normalized = normalizeChangePoint(code);
  return CHANGE_POINTS[normalized]?.label || code || '';
}
