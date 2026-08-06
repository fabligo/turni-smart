// I codici dei posti cambio arrivano dagli orari GTT e le paline sono raccolte
// sul campo da chi guida queste linee. Nomi e indirizzi vengono dalle pagine
// degli arrivi di gtt.to.it, una per palina: sono quelli che GTT stampa sulla
// fermata, non espansioni indovinate del codice. A = andata, R = ritorno.
export const CHANGE_POINTS = {
  GERB: {
    label: 'Deposito Gerbido',
    address: 'Via Gorini, Torino',
  },
  CATT: {
    label: 'Cattaneo',
    address: 'Corso Orbassano, Piazza Cattaneo, Torino',
    stops: { A: '307', R: '308' },
  },
  ORSN: {
    label: 'Santa Rita',
    address: 'Corso Orbassano, Via Montezemolo, Torino',
    stops: { A: '317', R: '318' },
  },
  ORSA: {
    label: 'Orbassano',
    address: 'Corso Sebastopoli 177, Torino',
    stops: { A: '728', R: '729' },
    // Sulla 62 le due direzioni sono invertite rispetto alle altre linee.
    stopsByLine: { 62: { A: '729', R: '728' } },
  },
  PITA: {
    label: 'Pitagora Nord',
    address: 'Corso Siracusa, Piazzale Pitagora, Torino',
    stops: { A: '134', R: '135' },
  },
  FILA: {
    label: 'Filadelfia',
    address: 'Via Filadelfia, Torino',
  },
  LING: {
    label: 'Stazione Lingotto',
    address: 'Via Pannunzio, Stazione Lingotto, Torino',
    stops: { A: '2604', R: '2603' },
  },
  BENS: {
    label: 'Bengasi Ovest',
    address: 'Via Vigliani, Piazza Bengasi, Torino',
    stops: { A: '3628', R: '1023' },
  },
  OSET: {
    label: 'Settembrini',
    address: 'Corso Orbassano, Corso Settembrini, Torino',
    stops: { A: '299', R: '300' },
  },
  CAIO: {
    label: 'Caio Mario',
    address: 'Piazzale Caio Mario, Torino',
    stops: { A: '1119', R: '1119' },
  },
  BARB: {
    label: 'Portofino',
    address: 'Via Barbera 18, Torino',
    stops: { A: '1169', R: '1170' },
  },
  CLGR: {
    label: 'Gramsci Nord',
    address: 'Corso Francia, Viale Gramsci, Collegno',
    stops: { A: '969', R: '968' },
  },
  CLMA: {
    label: 'Macedonia',
    address: 'Corso Francia 5, Collegno',
    stops: { A: '853', R: '852' },
  },
};

export function normalizeChangePoint(code) {
  return String(code ?? '').trim().toUpperCase();
}

export function getChangePointLabel(code) {
  const normalized = normalizeChangePoint(code);
  return CHANGE_POINTS[normalized]?.label || code || '';
}

export function getChangePointAddress(code) {
  return CHANGE_POINTS[normalizeChangePoint(code)]?.address || '';
}

export function getChangePointStop(code, { direction = '', line = '' } = {}) {
  const meta = CHANGE_POINTS[normalizeChangePoint(code)];
  if (!meta) return '';
  const byLine = meta.stopsByLine?.[String(line).trim()];
  const stops = byLine || meta.stops;
  if (!stops) return '';
  const normalizedDirection = String(direction || '').trim().toUpperCase().startsWith('R') ? 'R' : 'A';
  return stops[normalizedDirection] || stops.A || stops.R || '';
}
