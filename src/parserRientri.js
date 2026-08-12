// La pagina "grafico di servizio" degli Orari e' l'unica che dice come si torna
// davvero in deposito. La pagina dei turni da' la ripresa intera - "16.33 CATT
// R 21.58 GERB" sono cinque ore e mezza di linea, non un passaggio - mentre qui
// ogni vettura chiude con due dati soli:
//
//   Linea  U.L. 21.51 OSET
//   5      Entra 21.58
//
// U.L. e' l'ultima corsa di linea, Entra l'ingresso in deposito: fra i due c'e'
// il tragitto vero, sette minuti. E in fondo alla pagina la tabella che lo
// conferma per ogni capolinea:
//
//   TEMPI DI USCITA / RIENTRO 5
//   GERB - OSET  7 7
//   GERB - CATT  9 9
//
// I due dati si controllano a vicenda: un U.L. si accoppia al suo Entra solo se
// la differenza e' il tempo che la tabella dichiara per quel posto. Cosi' un
// PDF estratto con le colonne mescolate non produce accoppiamenti a caso.

const DEPOT = 'GERB';
const PLACE_RE = /^[A-Z]{4}$/;
// L'ora esce dal PDF in tre forme a seconda di come il testo viene estratto:
// "21.51", "21:51" e, quando il separatore si perde, "2151".
const TIME_RE = /^(\d{1,2})[.:](\d{2})$/;
const COMPACT_TIME_RE = /^(\d{2})(\d{2})$/;
// Fra "U.L. 21.51 OSET" e "Entra 21.58" il testo estratto puo' infilare le
// etichette della colonna accanto: si guarda avanti quel tanto che basta.
const ENTRY_LOOKAHEAD = 14;
// Senza tabella dei tempi resta il buon senso: dal capolinea al deposito non ci
// si mette tre quarti d'ora.
const MAX_TRANSFER_MINUTES = 45;

function tokenize(text) {
  return String(text || '')
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    /* "GERB-OSET" e "U.L." attaccati al valore capitano quando il PDF perde gli
       spazi fra le celle: si riaprono qui, una volta, invece di complicare ogni
       confronto piu' avanti. */
    .flatMap((token) => (/^[A-Z]{4}-[A-Z]{4}$/.test(token) ? [token.slice(0, 4), '-', token.slice(5)] : [token]));
}

function toMinutes(token) {
  const raw = String(token || '');
  const match = TIME_RE.exec(raw) || COMPACT_TIME_RE.exec(raw);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatTime(token) {
  const minutes = toMinutes(token);
  if (minutes === null) return '';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// Una corsa che chiude dopo mezzanotte rientra il giorno dopo: la differenza va
// riportata avanti, non letta come un numero negativo enorme.
function transferMinutes(fromMinutes, toMinutes_) {
  const gap = toMinutes_ - fromMinutes;
  return gap < 0 ? gap + 1440 : gap;
}

function isAnchor(token, letter) {
  return new RegExp(`^${letter}\\.?L\\.?$`).test(token);
}

/**
 * La linea a cui appartiene la pagina. Il titolo grande non porta la parola
 * "linea", quindi si parte dalle due tabelle in fondo, che il numero ce l'hanno
 * accanto, e solo dopo si prova con l'intestazione.
 */
export function detectRientriLine(text = '') {
  const source = String(text || '').toUpperCase();
  const patterns = [
    /USCITA\s*\/?\s*RIENTRO\s+(\d{1,3}[A-Z]?)\b/,
    /ANDATA\s*\/?\s*RITORNO\s+(\d{1,3}[A-Z]?)\b/,
    /\bLINEA\s+(\d{1,3}[A-Z]?)\b/,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return match[1];
  }
  return '';
}

/**
 * I tempi fra deposito e capolinea, dalla tabella "TEMPI DI USCITA / RIENTRO".
 * Le righe hanno una o due cifre: quando ce n'e' una sola vale per entrambi i
 * versi, quando sono due la prima e' l'uscita e la seconda il rientro.
 */
export function parseDepotTransferTimes(text = '') {
  const tokens = tokenize(text);
  const transfers = {};

  for (let index = 0; index < tokens.length - 3; index += 1) {
    if (tokens[index] !== DEPOT) continue;
    if (tokens[index + 1] !== '-') continue;
    const place = tokens[index + 2];
    if (!PLACE_RE.test(place) || place === DEPOT) continue;

    const first = Number(tokens[index + 3]);
    if (!Number.isInteger(first) || first <= 0 || first > MAX_TRANSFER_MINUTES) continue;
    const second = Number(tokens[index + 4]);
    const hasSecond = Number.isInteger(second) && second > 0 && second <= MAX_TRANSFER_MINUTES;

    transfers[place] = { out: first, in: hasSecond ? second : first };
  }

  return transfers;
}

/**
 * Le ultime corse prima dell'ingresso in deposito, una per vettura. Torna
 * segmenti nella stessa forma di quelli degli Orari, cosi' la ricerca dei
 * rientri li tratta come qualsiasi altra corsa.
 */
export function parseDepotReturns(text = '', { gt = '', ver = '', line = '' } = {}) {
  const tokens = tokenize(text);
  const transfers = parseDepotTransferTimes(text);
  const lineCode = line || detectRientriLine(text);
  const returns = [];
  const seen = new Set();

  for (let index = 0; index < tokens.length - 2; index += 1) {
    if (!isAnchor(tokens[index], 'U')) continue;
    const departure = toMinutes(tokens[index + 1]);
    const place = tokens[index + 2];
    if (departure === null || !PLACE_RE.test(place) || place === DEPOT) continue;

    const expected = transfers[place]?.in ?? null;
    let chosen = null;

    for (let ahead = index + 3; ahead < Math.min(tokens.length - 1, index + 3 + ENTRY_LOOKAHEAD); ahead += 1) {
      if (tokens[ahead] !== 'ENTRA') continue;
      const entry = toMinutes(tokens[ahead + 1]);
      if (entry === null) continue;
      const gap = transferMinutes(departure, entry);
      if (gap <= 0 || gap > MAX_TRANSFER_MINUTES) continue;
      // Il tempo dichiarato dalla tabella e' la prova: se combacia si chiude
      // qui, altrimenti si tiene da parte il primo plausibile e si continua a
      // cercare quello giusto.
      if (expected !== null && gap === expected) {
        chosen = { entry, token: tokens[ahead + 1] };
        break;
      }
      if (!chosen) chosen = { entry, token: tokens[ahead + 1] };
    }

    if (!chosen) continue;

    const start = formatTime(tokens[index + 1]);
    const end = formatTime(chosen.token);
    const identity = `${lineCode}|${place}|${start}|${end}`;
    if (seen.has(identity)) continue;
    seen.add(identity);

    returns.push({
      ln: lineCode,
      lineaNorm: lineCode,
      vett: '',
      turnoVettura: '',
      start,
      loc_s: place,
      dir: '',
      end,
      loc_e: DEPOT,
      gt,
      ver,
      run_id: returns.length + 1,
    });
  }

  return returns;
}

// I rientri stanno nella stessa mappa degli sviluppi turno, sotto una chiave
// che nessun turno puo' avere: la ricerca li legge senza sapere che vengono da
// un'altra pagina, e la scheda di un turno non li pesca per sbaglio.
export const RIENTRI_KEY_PREFIX = 'RIENTRI';

export function rientriKey(line = '', gt = '') {
  return [RIENTRI_KEY_PREFIX, line || '?', gt].filter(Boolean).join(' ');
}

export function isRientriKey(key = '') {
  return String(key).startsWith(`${RIENTRI_KEY_PREFIX} `);
}

/* Marcatori del grafico di servizio nel testo grezzo di una pagina. Servono a
   distinguere due esiti che nel referto si somigliano ma vogliono cose
   opposte: il PDF quella pagina non ce l'ha, oppure ce l'ha e il testo esce in
   una forma che il parser non riconosce. Nel secondo caso il pezzo di testo
   qui sotto e' quello su cui aggiustare il parser. */
const GRAPHIC_MARKERS = [
  ['ul', /\bU\.?\s?L\.?\s/],
  ['entra', /\bENTRA\b/],
  ['esce', /\bESCE\b/],
  ['tempi', /TEMPI\s+DI\s+USCITA/],
];

const EXCERPT_LENGTH = 320;

export function findGraphicHints(text = '') {
  const source = String(text || '').toUpperCase();
  const found = GRAPHIC_MARKERS.filter(([, pattern]) => pattern.test(source)).map(([name]) => name);
  if (!found.length) return { excerpt: '', markers: [] };

  const anchor = source.search(/TEMPI\s+DI\s+USCITA|\bU\.?\s?L\.?\s/);
  const from = Math.max(0, anchor - 40);
  return {
    excerpt: source.slice(from, from + EXCERPT_LENGTH).replace(/\s+/g, ' ').trim(),
    markers: found,
  };
}
