// I codici dei posti cambio arrivano dagli orari GTT: quelli sono dati veri.
// Nomi e coordinate no: nessuno li ha verificati, quindi qui resta solo cio' che
// e' certo e tutto il resto lo definisce chi guida, dall'app, con "Rinomina" e
// "Registra qui" (vedi utils/changePointDirectory.js). Un codice senza nome si
// mostra com'e' scritto negli orari, senza inventare un luogo.
export const CHANGE_POINTS = {
  GERB: {
    coordinates: { lat: 45.0419, lng: 7.5886 },
    label: 'Deposito Gerbido',
  },
  CATT: {},
  ORSN: {},
  ORSA: {},
  PITA: {},
  FILA: {},
  LING: {},
  BENS: {},
  OSET: {},
  CAIO: {},
  BARB: {},
  CLGR: {},
  CLMA: {},
};

export function normalizeChangePoint(code) {
  return String(code ?? '').trim().toUpperCase();
}

export function getChangePointLabel(code) {
  const normalized = normalizeChangePoint(code);
  return CHANGE_POINTS[normalized]?.label || code || '';
}
