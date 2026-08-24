// Le coordinate delle paline dei posti cambio, prese dal GTFS statico di GTT
// (istantanea del 12/07/2026, dal repository BusRadar) cercando ogni palina per
// il suo numero. Il numero di palina e' una chiave esatta, non un nome da
// confrontare: la fermata che porta il numero 307 e' una sola, e la sua
// posizione e' quella che GTT pubblica.
//
// Il nome accanto e' quello del GTFS, tenuto perche' e' la prova che la ricerca
// e' andata a segno: combacia con il nome che GTT stampa sulla palina, quindi
// il numero raccolto sul campo e la fermata trovata sono la stessa cosa.
//
// Un capolinea ci entra solo quando qualcuno ne ha dato il numero di palina:
// il grafico di servizio i capolinea li chiama per nome, senza numero, e
// agganciarli per somiglianza di nome produce accostamenti sbagliati.
export const PALINE = {
  307: { lat: 45.03614, lng: 7.62627, name: 'CATTANEO' },
  308: { lat: 45.03618, lng: 7.62581, name: 'CATTANEO' },
  317: { lat: 45.04595, lng: 7.64538, name: 'SANTA RITA' },
  318: { lat: 45.04602, lng: 7.64529, name: 'SANTA RITA' },
  728: { lat: 45.04553, lng: 7.64359, name: 'ORBASSANO' },
  729: { lat: 45.04543, lng: 7.64521, name: 'ORBASSANO' },
  2604: { lat: 45.02628, lng: 7.65665, name: 'STAZIONE LINGOTTO' },
  2603: { lat: 45.02623, lng: 7.65655, name: 'STAZIONE LINGOTTO' },
  3628: { lat: 45.0178, lng: 7.66114, name: 'BENGASI OVEST' },
  1023: { lat: 45.01757, lng: 7.66112, name: 'BENGASI OVEST' },
  299: { lat: 45.03106, lng: 7.61206, name: 'SETTEMBRINI' },
  300: { lat: 45.03158, lng: 7.61453, name: 'SETTEMBRINI' },
  1119: { lat: 45.02446, lng: 7.63614, name: 'CAIO MARIO CAP' },
  1169: { lat: 45.01903, lng: 7.63359, name: 'PORTOFINO' },
  1170: { lat: 45.01923, lng: 7.63375, name: 'PORTOFINO' },
  969: { lat: 45.07285, lng: 7.57994, name: 'GRAMSCI NORD' },
  968: { lat: 45.07294, lng: 7.57962, name: 'GRAMSCI NORD' },
  853: { lat: 45.07386, lng: 7.60412, name: 'MACEDONIA' },
  852: { lat: 45.07398, lng: 7.604, name: 'MACEDONIA' },
  /* I due capolinea della 5. Il grafico li chiama P.za Arbarello e Orbassano -
     Strada Torino, GTT li chiama Siccardi e Dalla Chiesa: sono gli stessi
     posti, e i numeri di palina lo dimostrano meglio dei nomi. Il GTFS conferma
     che sono proprio i capolinea della linea 5. */
  303: { lat: 45.07296, lng: 7.67568, name: 'SICCARDI CAP' },
  2927: { lat: 45.0078, lng: 7.54506, name: 'DALLA CHIESA CAP' },
  /* I due lati di corso Siracusa, sulla 56: portano il nome delle due vie che
     si incrociano li', ed e' per questo che la seconda era sfuggita - cercando
     "SIRACUSA" non si trova, perche' si chiama MONFALCONE. Distano 62 metri, e
     senza tutte e due il ritorno veniva collocato sul lato dell'andata. */
  711: { lat: 45.05287, lng: 7.6338, name: 'SIRACUSA' },
  128: { lat: 45.05292, lng: 7.63458, name: 'MONFALCONE' },
  /* Piazza Omero e via Filadelfia: le paline la tabella dei posti cambio le
     conosceva gia', ma qui non c'erano, e il ritorno finiva sulle coordinate
     dell'andata. */
  309: { lat: 45.03821, lng: 7.63044, name: 'OMERO' },
  310: { lat: 45.03835, lng: 7.63014, name: 'OMERO' },
  1665: { lat: 45.04447, lng: 7.64046, name: 'FILADELFIA' },
  1666: { lat: 45.04411, lng: 7.6403, name: 'FILADELFIA' },
  /* I due capolinea della 58/. Bertola lo divide con la 58 - il GTFS elenca la
     palina su tutte e due - mentre via Grosso, all'angolo con via Casalegno, e'
     solo suo: e' quello che il grafico chiama GCAS. */
  1683: { lat: 45.06996, lng: 7.68134, name: 'BERTOLA CAP' },
  3542: { lat: 45.04929, lng: 7.62255, name: 'GROSSO CAP' },
};

export function getPalinaPosition(palina) {
  const meta = PALINE[String(palina || '').trim()];
  return meta ? { lat: meta.lat, lng: meta.lng } : null;
}

const EARTH_RADIUS_M = 6371000;

/**
 * La distanza in linea d'aria fra due punti. Non e' la strada da fare - quella
 * la sa la mappa - ma basta a dire quale posto cambio e' piu' vicino e quale e'
 * dall'altra parte della citta'.
 */
export function distanceMeters(from, to) {
  if (!from || !to) return null;
  if (![from.lat, from.lng, to.lat, to.lng].every(Number.isFinite)) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(EARTH_RADIUS_M * 2 * Math.asin(Math.min(1, Math.sqrt(a))));
}
