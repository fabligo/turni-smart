export const CHANGE_POINTS = {
  GERB: {
    coordinates: { lat: 45.0419, lng: 7.5886 },
    label: 'Deposito Gerbido',
    mapSearch: 'Deposito Gerbido GTT Torino',
    searchLabel: 'Deposito Gerbido',
    stopsByLine: {
      '74': {
        A: { palina: '693', label: 'Gorini Cap.' },
        R: { palina: '693', label: 'Gorini Cap.' },
      },
    },
  },
  ORSN: {
    coordinates: null,
    label: 'Orbassano',
    mapSearch: 'Orbassano fermata GTT',
    searchLabel: 'Orbassano',
  },
  ORSA: {
    coordinates: null,
    label: 'Orbassano',
    mapSearch: 'Orbassano fermata GTT',
    searchLabel: 'Orbassano',
  },
  PITA: {
    coordinates: null,
    label: 'Piazza Tasso',
    mapSearch: 'Piazza Tasso Torino fermata GTT',
    searchLabel: 'Piazza Tasso',
  },
  FILA: {
    coordinates: null,
    label: 'Filadelfia',
    mapSearch: 'Filadelfia Torino fermata GTT',
    searchLabel: 'Filadelfia',
  },
};

export function normalizeChangePoint(code) {
  return String(code ?? '').trim().toUpperCase();
}

export function getChangePointLabel(code) {
  const normalized = normalizeChangePoint(code);
  return CHANGE_POINTS[normalized]?.label || code || '';
}
