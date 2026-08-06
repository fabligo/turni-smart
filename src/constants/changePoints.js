// Le coordinate servono solo a "Usa posizione", che accetta il posto cambio
// piu' vicino entro 900 metri. Quelle qui sotto sono approssimate a livello di
// piazzale o capolinea: dove mancano, o dove sbagliano, si registrano sul posto
// col GPS del telefono (vedi utils/changePointPositions.js) e da quel momento
// vincono su queste.
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
    // Approssimata: piazza Tasso, quartiere San Paolo.
    coordinates: { lat: 45.0668, lng: 7.6513 },
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
    // Approssimata: capolinea di via Nizza davanti al Lingotto.
    coordinates: { lat: 45.0301, lng: 7.664 },
    label: 'Lingotto',
    stops: {
      A: { palina: '2604', label: 'Lingotto' },
      R: { palina: '2603', label: 'Lingotto' },
    },
  },
  BENS: {
    // Approssimata: piazza Bengasi.
    coordinates: { lat: 45.0197, lng: 7.6653 },
    label: 'Bengasi',
    stops: {
      A: { palina: '3628', label: 'Bengasi' },
      R: { palina: '1023', label: 'Bengasi' },
    },
  },
  OSET: {
    // Approssimata: ospedale San Luigi Gonzaga, regione Gonzole (Orbassano).
    coordinates: { lat: 45.0175, lng: 7.565 },
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
