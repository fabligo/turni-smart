export const CHANGE_POINTS = {
  GERB: {
    coordinates: { lat: 45.0419, lng: 7.5886 },
    label: 'Deposito Gerbido',
    mapSearch: 'Deposito Gerbido GTT Torino',
    searchLabel: 'Deposito Gerbido',
  },
  CATT: {
    label: 'Cattaneo',
    stops: {
      A: { palina: '307', label: 'Cattaneo' },
      R: { palina: '308', label: 'Cattaneo' },
    },
  },
  ORSN: {
    coordinates: null,
    label: 'Orbassano',
    mapSearch: 'Orbassano fermata GTT',
    searchLabel: 'Orbassano',
    stops: {
      A: { palina: '317', label: 'Orbassano' },
      R: { palina: '318', label: 'Orbassano' },
    },
  },
  ORSA: {
    coordinates: null,
    label: 'Orbassano',
    mapSearch: 'Orbassano fermata GTT',
    searchLabel: 'Orbassano',
    stops: {
      A: { palina: '728', label: 'Orbassano' },
      R: { palina: '729', label: 'Orbassano' },
    },
    stopsByLine: {
      '62': {
        A: { palina: '729', label: 'Orbassano' },
        R: { palina: '728', label: 'Orbassano' },
      },
    },
  },
  PITA: {
    coordinates: null,
    label: 'Piazza Tasso',
    mapSearch: 'Piazza Tasso Torino fermata GTT',
    searchLabel: 'Piazza Tasso',
    stops: {
      A: { palina: '134', label: 'Piazza Tasso' },
      R: { palina: '135', label: 'Piazza Tasso' },
    },
  },
  FILA: {
    coordinates: null,
    label: 'Filadelfia',
    mapSearch: 'Filadelfia Torino fermata GTT',
    searchLabel: 'Filadelfia',
  },
  LING: {
    label: 'Lingotto',
    stops: {
      A: { palina: '2604', label: 'Lingotto' },
      R: { palina: '2603', label: 'Lingotto' },
    },
  },
  BENS: {
    label: 'Bengasi',
    stops: {
      A: { palina: '3628', label: 'Bengasi' },
      R: { palina: '1023', label: 'Bengasi' },
    },
  },
  OSET: {
    label: 'Ospedale San Luigi',
    stops: {
      A: { palina: '299', label: 'Ospedale San Luigi' },
      R: { palina: '300', label: 'Ospedale San Luigi' },
    },
  },
  CAIO: {
    label: 'Cairoli',
    stops: {
      A: { palina: '1119', label: 'Cairoli' },
      R: { palina: '1119', label: 'Cairoli' },
    },
  },
  BARB: {
    label: 'Barbaroux',
    stops: {
      A: { palina: '1169', label: 'Barbaroux' },
      R: { palina: '1170', label: 'Barbaroux' },
    },
  },
  CLGR: {
    label: 'Claviere/Grosseto',
    stops: {
      A: { palina: '969', label: 'Claviere/Grosseto' },
      R: { palina: '968', label: 'Claviere/Grosseto' },
    },
  },
  CLMA: {
    label: 'Claviere/Madonna di Campagna',
    stops: {
      A: { palina: '853', label: 'Claviere/Madonna di Campagna' },
      R: { palina: '852', label: 'Claviere/Madonna di Campagna' },
    },
  },
};

export function normalizeChangePoint(code) {
  return String(code ?? '').trim().toUpperCase();
}

export function getChangePointLabel(code) {
  const normalized = normalizeChangePoint(code);
  return CHANGE_POINTS[normalized]?.label || code || '';
}
