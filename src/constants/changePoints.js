export const CHANGE_POINTS = {
  GERB: {
    label: 'Deposito Gerbido',
    searchLabel: 'Deposito Gerbido',
  },
  ORSN: {
    label: 'Orbassano',
    searchLabel: 'Orbassano',
  },
  ORSA: {
    label: 'Orbassano',
    searchLabel: 'Orbassano',
  },
  PITA: {
    label: 'Piazza Tasso',
    searchLabel: 'Piazza Tasso',
  },
  FILA: {
    label: 'Filadelfia',
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
