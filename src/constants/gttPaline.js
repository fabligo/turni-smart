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
// Qui dentro non ci sono capolinea: i loro codici stanno solo sul grafico di
// servizio, senza numero di palina, e agganciarli per somiglianza di nome
// produce accostamenti sbagliati.
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
