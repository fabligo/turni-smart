import { getPalinaPosition } from './gttPaline.js';

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
  // BABE e BARB sono lo stesso posto, in via Gaspero Barbera: stesse due
  // paline, 1169 andata e 1170 ritorno. Gli orari GTT usano due codici per
  // quel punto - BABE sulla 34 - e la preconoscenza riporta quello che trova,
  // quindi la tabella deve conoscerli entrambi.
  //
  // I due civici non coincidono - 34 di qui, 18 su BARB - ma chi guida la
  // linea ha confermato che a valere sono le paline, non il numero civico.
  // Restano com'erano: sono etichette, mentre a portare qualcuno nel posto
  // giusto sono le coordinate e i numeri delle paline.
  BABE: {
    label: 'Barbera',
    address: 'Via Gaspero Barbera 34, Torino',
    // Palina 1169, dal GTFS statico GTT, dove si chiama PORTOFINO.
    position: { lat: 45.01903, lng: 7.63359 },
    stops: { A: '1169', R: '1170' },
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
  // e' li' che compaiono i due posti cambio di piazza Omero.
  //
  // Il ritorno e' la palina davanti al civico 274 di corso Orbassano, l'andata
  // quella di fronte, verso il centro: lo dice chi guida la linea. Le due
  // paline distano 28 metri e i tracciati della 58 - che nei festivi la 12
  // ricalca - dicono con 15 metri di scarto che la 309 sta sulla carreggiata
  // verso il centro. Le due cose combaciano, quindi A = 309 e R = 310.
  OMRO: {
    label: 'Omero',
    address: 'Corso Orbassano, Piazza Omero, Torino',
    // Palina 309, dal GTFS statico GTT: il lato verso il centro.
    position: { lat: 45.03821, lng: 7.63044 },
    stops: { A: '309', R: '310' },
  },
  // Sulla 56, in corso Siracusa: A verso Largo Tabacchi, R verso Grugliasco.
  // Le due paline le ha date chi guida la linea: 711 andata, 128 ritorno.
  //
  // Il GTFS le conferma da solo. La 711 compare su 340 corse della 56 dirette
  // a TABACCHI CAP, la 128 su 346 dirette dall'altra parte, a TIRRENO CAP e
  // Parco Ruffini: l'andata e' il lato verso il centro, come dice l'autista.
  // Distano una sessantina di metri e portano il nome delle due vie che si
  // incrociano li', ed e' per questo che erano sfuggite: cercando "SIRACUSA"
  // la seconda non si trova, perche' si chiama MONFALCONE.
  SIRA: {
    label: 'Siracusa',
    address: 'Corso Siracusa, Torino',
    // Palina 711, dal GTFS statico GTT.
    position: { lat: 45.05287, lng: 7.63380 },
    stops: { A: '711', R: '128' },
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
 * Le coordinate del posto cambio. Non sono scritte a mano da nessuna parte: si
 * cerca la sua palina nel GTFS di GTT, dove il numero di palina e' una chiave
 * esatta. Un posto cambio sbagliato manda un autista alla fermata sbagliata
 * alle quattro del mattino, e nessuno se ne accorge finche' non e' tardi:
 * quando la palina non e' nota la posizione resta nulla, e chi chiama deve
 * saperlo fare senza.
 *
 * Resta accettato un `position` scritto nella tabella, per un posto cambio che
 * una palina non ce l'abbia.
 */
export function getChangePointPosition(code, { direction = '', line = '' } = {}) {
  const fromPalina = getPalinaPosition(getChangePointStop(code, { direction, line }));
  if (fromPalina) return fromPalina;
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
