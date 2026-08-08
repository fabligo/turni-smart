// I codici dei posti cambio arrivano dagli orari GTT e le paline sono raccolte
// sul campo da chi guida queste linee. Nomi e indirizzi vengono dalle pagine
// degli arrivi di gtt.to.it, una per palina: sono quelli che GTT stampa sulla
// fermata, non espansioni indovinate del codice. A = andata, R = ritorno.
//
// Le coordinate sono quelle della palina di andata nel GTFS statico GTT, presa
// per numero: il numero e' gia' verificato sul campo, quindi il punto non e'
// indovinato ma lo stesso che GTT pubblica per quella fermata. FILA non ne ha
// perche' su via Filadelfia ci sono quattordici fermate omonime e nessuna
// palina raccolta che dica quale sia: meglio nessun punto che quello sbagliato.
// (Filadelfia le ha avute da chi guida la linea, quindi ora ce le ha anche lei.)
export const CHANGE_POINTS = {
  GERB: {
    label: 'Deposito Gerbido',
    address: 'Via Gorini, Torino',
  },
  CATT: {
    label: 'Cattaneo',
    address: 'Corso Orbassano, Piazza Cattaneo, Torino',
    // Palina 307, dal GTFS statico GTT.
    position: { lat: 45.03614, lng: 7.62627 },
    stops: { A: '307', R: '308' },
  },
  ORSN: {
    label: 'Santa Rita',
    address: 'Corso Orbassano, Via Montezemolo, Torino',
    // Palina 317, dal GTFS statico GTT.
    position: { lat: 45.04595, lng: 7.64538 },
    stops: { A: '317', R: '318' },
  },
  ORSA: {
    label: 'Orbassano',
    address: 'Corso Sebastopoli 177, Torino',
    // Palina 728, dal GTFS statico GTT.
    position: { lat: 45.04553, lng: 7.64359 },
    stops: { A: '728', R: '729' },
    // Sulla 62 le due direzioni sono invertite rispetto alle altre linee.
    stopsByLine: { 62: { A: '729', R: '728' } },
  },
  FILA: {
    label: 'Filadelfia',
    address: 'Via Filadelfia, Torino',
    // Palina 1665, dal GTFS statico GTT.
    position: { lat: 45.04447, lng: 7.64046 },
    // Il ritorno alla 1666 lo conferma chi guida queste linee. L'andata alla
    // 1665 e' una deduzione, ma regge: stesso nome sulla palina, 42 metri
    // dall'altra, e sono le due fermate della 58, che e' del Gerbido.
    stops: { A: '1665', R: '1666' },
  },
  LING: {
    label: 'Stazione Lingotto',
    address: 'Via Pannunzio, Stazione Lingotto, Torino',
    // Palina 2604, dal GTFS statico GTT.
    position: { lat: 45.02628, lng: 7.65665 },
    stops: { A: '2604', R: '2603' },
  },
  BENS: {
    label: 'Bengasi Ovest',
    address: 'Via Vigliani, Piazza Bengasi, Torino',
    // Palina 3628, dal GTFS statico GTT.
    position: { lat: 45.01780, lng: 7.66114 },
    stops: { A: '3628', R: '1023' },
  },
  OSET: {
    label: 'Settembrini',
    address: 'Corso Orbassano, Corso Settembrini, Torino',
    // Palina 299, dal GTFS statico GTT.
    position: { lat: 45.03106, lng: 7.61206 },
    stops: { A: '299', R: '300' },
  },
  CAIO: {
    label: 'Caio Mario',
    address: 'Piazzale Caio Mario, Torino',
    // Palina 1119, dal GTFS statico GTT.
    position: { lat: 45.02446, lng: 7.63614 },
    stops: { A: '1119', R: '1119' },
  },
  BARB: {
    label: 'Portofino',
    address: 'Via Barbera 18, Torino',
    // Palina 1169, dal GTFS statico GTT.
    position: { lat: 45.01903, lng: 7.63359 },
    stops: { A: '1169', R: '1170' },
  },
  CLGR: {
    label: 'Gramsci Nord',
    address: 'Corso Francia, Viale Gramsci, Collegno',
    // Palina 969, dal GTFS statico GTT.
    position: { lat: 45.07285, lng: 7.57994 },
    stops: { A: '969', R: '968' },
  },
  // Nei festivi la 58 non gira e il suo percorso lo copre la 12 modificata:
  // e' li' che compaiono i due posti cambio di piazza Omero. Le due paline
  // sono la 309 e la 310, a 28 metri l'una dall'altra sui due lati del corso;
  // quale delle due sia l'andata e quale il ritorno non e' ancora confermato,
  // percio' qui c'e' solo il punto - che per un percorso a piedi basta - e
  // non la coppia A/R, che manderebbe i passaggi GTT sulla palina sbagliata.
  OMRO: {
    label: 'Omero',
    address: 'Corso Orbassano, Piazza Omero, Torino',
    // Palina 309, dal GTFS statico GTT: il lato verso il centro.
    position: { lat: 45.03821, lng: 7.63044 },
  },
  // Sulla 56, in corso Siracusa. Il GTFS conosce una sola fermata della 56 su
  // quel corso, la palina 711: il punto e' quello, la coppia A/R no.
  SIRA: {
    label: 'Siracusa',
    address: 'Corso Siracusa, Torino',
    // Palina 711, dal GTFS statico GTT.
    position: { lat: 45.05287, lng: 7.63380 },
  },
  CLMA: {
    label: 'Macedonia',
    address: 'Corso Francia 5, Collegno',
    // Palina 853, dal GTFS statico GTT.
    position: { lat: 45.07386, lng: 7.60412 },
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

/**
 * Le coordinate del posto cambio, quando ci sono. Moovit vuole un punto, non
 * un indirizzo: senza queste il percorso si puo' solo chiedere per nome, e a
 * risolverlo e' la ricerca di Moovit invece della nostra mappa.
 *
 * Vanno riempite solo con valori verificati sul posto o presi dalla palina:
 * un posto cambio sbagliato manda un autista alla fermata sbagliata alle
 * quattro del mattino, e nessuno se ne accorge finche' non e' tardi.
 */
export function getChangePointPosition(code) {
  const position = CHANGE_POINTS[normalizeChangePoint(code)]?.position;
  if (!Number.isFinite(position?.lat) || !Number.isFinite(position?.lng)) return null;
  return position;
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
