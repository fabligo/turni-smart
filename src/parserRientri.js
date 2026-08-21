// La pagina "grafico di servizio" degli Orari e' l'unica che dice come si esce
// dal deposito e come ci si torna davvero. La pagina dei turni da' la ripresa
// intera - "16.33 CATT R 21.58 GERB" sono cinque ore e mezza di linea, non un
// passaggio - mentre qui ogni vettura chiude con due dati soli:
//
//   Linea  U.L. 21.51 OSET
//   5      Entra 21.58
//
// U.L. e' l'ultima corsa di linea, Entra l'ingresso in deposito: fra i due c'e'
// il tragitto vero, sette minuti.
//
// La stessa pagina dice allo stesso modo come si esce, e sono i due dati su cui
// si regge la funzione Uscite:
//
//   8   Esce 04.13   I.L. 04.22 CATT
//
// Esce e' l'ora in cui la vettura lascia il Gerbido, I.L. dove e quando entra in
// linea: nove minuti per Cattaneo, non le cinque ore della ripresa.
//
// E in fondo alla pagina la tabella che conferma entrambi, per ogni capolinea:
//
//   TEMPI DI USCITA / RIENTRO 5
//   GERB - OSET  7 7
//   GERB - CATT  9 9
//
// I dati si controllano a vicenda: un U.L. si accoppia al suo Entra - e un Esce
// al suo I.L. - solo se la differenza e' il tempo che la tabella dichiara per
// quel posto. Cosi' un PDF estratto con le colonne mescolate non produce
// accoppiamenti a caso.

import { findTerminus } from './constants/gttTermini.js';
import { distanceMeters } from './constants/gttPaline.js';

const DEPOT = 'GERB';
// Il deposito e' la palina 693, GORINI CAP: e' li' che entrano le vetture.
const DEPOT_POSITION = { lat: 45.03941, lng: 7.59166 };
const PLACE_RE = /^[A-Z]{4}$/;
// L'ora esce dal PDF in tre forme a seconda di come il testo viene estratto:
// "21.51", "21:51" e, quando il separatore si perde, "2151".
const TIME_RE = /^(\d{1,2})[.:](\d{2})$/;
const COMPACT_TIME_RE = /^(\d{2})(\d{2})$/;
// Fra "U.L. 21.51 OSET" e "Entra 21.58" il testo estratto puo' infilare le
// etichette della colonna accanto: si guarda avanti quel tanto che basta.
const ENTRY_LOOKAHEAD = 14;
// Fra "Esce 04.13" e "I.L. 04.22 CATT" il testo estratto infila i codici della
// colonna accanto - "ARBA GER" - allo stesso modo e con lo stesso rimedio.
const LINE_START_LOOKAHEAD = 14;
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
    /* I codici dell'orario tipo portano dentro la linea: A05Q0101 e' la 5.
       E' l'unico appiglio quando l'intestazione grande non ha la parola
       "linea" e le due tabelle in fondo non vengono estratte. */
    /\b[AHW](\d{2,3}[A-Z]?)Q\d/,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return match[1].replace(/^0+(?=\d)/, '');
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
/* Un autobus in citta' non supera i sessanta all'ora. Serve a controllare un
   capolinea trovato per nome: se la distanza in linea d'aria dal deposito e il
   tempo di rientro dichiarato dalla tabella richiedono piu' di cosi', il nome
   ha pescato una fermata troppo lontana e la posizione si butta.
   Il limite e' solo verso l'alto: il capolinea della 74 e' Gorini, cioe' il
   deposito stesso, e i suoi due minuti su zero metri sono il tempo di entrare,
   non una velocita' impossibile. */
const MAX_KMH = 60;

function plausiblePosition(position, minutes) {
  if (!position || !Number.isFinite(minutes) || minutes <= 0) return position || null;
  const meters = distanceMeters(DEPOT_POSITION, position);
  if (meters === null) return position;
  return meters / 1000 / (minutes / 60) <= MAX_KMH ? position : null;
}

export function parseDepotReturns(text = '', { gt = '', ver = '', legend = null, line = '' } = {}) {
  const tokens = tokenize(text);
  const transfers = parseDepotTransferTimes(text);
  const places = legend || parseLegend(text);
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

    /* Dove sta il capolinea da cui si sale. Il codice da solo non lo dice: lo
       dice il nome che la legenda gli da', cercato fra i capolinea di quella
       linea, e poi controllato contro il tempo di rientro dichiarato. */
    const terminus = findTerminus(lineCode, places[place]?.label || '');
    const position = plausiblePosition(
      terminus ? { lat: terminus.lat, lng: terminus.lng } : null,
      transfers[place]?.in ?? null,
    );

    returns.push({
      ln: lineCode,
      lineaNorm: lineCode,
      palina: terminus && position ? terminus.code : '',
      position,
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

/**
 * Le uscite dal deposito, una per vettura, lette dalla stessa pagina.
 *
 * Sono lo specchio dei rientri: "Esce" e' l'ora in cui la vettura lascia il
 * Gerbido, "I.L." dove e quando entra in linea. Fra i due c'e' il
 * trasferimento, che dura quanto dichiara la tabella - nove minuti per
 * Cattaneo - e non e' la ripresa di cinque ore che sta sulla pagina dei turni.
 *
 * Torna segmenti nella stessa forma degli altri, con il deposito come partenza.
 */
export function parseDepotExits(text = '', { gt = '', ver = '', line = '' } = {}) {
  const tokens = tokenize(text);
  const transfers = parseDepotTransferTimes(text);
  const lineCode = line || detectRientriLine(text);
  const exits = [];
  const seen = new Set();

  for (let index = 0; index < tokens.length - 3; index += 1) {
    if (tokens[index] !== 'ESCE') continue;
    const departure = toMinutes(tokens[index + 1]);
    if (departure === null) continue;

    let chosen = null;

    for (let ahead = index + 2; ahead < Math.min(tokens.length - 2, index + 2 + LINE_START_LOOKAHEAD); ahead += 1) {
      if (!isAnchor(tokens[ahead], 'I')) continue;
      const entry = toMinutes(tokens[ahead + 1]);
      const place = tokens[ahead + 2];
      if (entry === null || !PLACE_RE.test(place) || place === DEPOT) continue;
      const gap = transferMinutes(departure, entry);
      if (gap <= 0 || gap > MAX_TRANSFER_MINUTES) continue;
      // Come per l'Entra: il tempo dichiarato dalla tabella e' la prova. Se
      // combacia si chiude qui, altrimenti si tiene il primo plausibile e si
      // continua a cercare quello giusto.
      if (transfers[place]?.out === gap) {
        chosen = { place, token: tokens[ahead + 1] };
        break;
      }
      if (!chosen) chosen = { place, token: tokens[ahead + 1] };
    }

    if (!chosen) continue;

    const start = formatTime(tokens[index + 1]);
    const end = formatTime(chosen.token);
    const identity = `${lineCode}|${chosen.place}|${start}|${end}`;
    if (seen.has(identity)) continue;
    seen.add(identity);

    exits.push({
      ln: lineCode,
      lineaNorm: lineCode,
      /* Il numero di vettura sembra stare subito prima di "Esce", e nel testo
         estratto per colonne davvero c'e'. Ma in quella stessa posizione
         finisce la coda della tabella dei tempi - "GERB - ARBA 25" seguito da
         "8 Esce" - e le due cose sono indistinguibili: un 25 letto come vettura
         manda qualcuno al mezzo sbagliato nel piazzale. Resta vuoto finche' il
         grafico non lo dira' in un posto che non si confonde con altro. */
      vett: '',
      turnoVettura: '',
      start,
      loc_s: DEPOT,
      /* Il grafico dice dove la vettura entra in linea, non da che parte
         prosegue: la direzione resta vuota invece di essere dedotta. */
      dir: '',
      end,
      loc_e: chosen.place,
      gt,
      ver,
      run_id: exits.length + 1,
    });
  }

  return exits;
}

// I rientri stanno nella stessa mappa degli sviluppi turno, sotto una chiave
// che nessun turno puo' avere: la ricerca li legge senza sapere che vengono da
// un'altra pagina, e la scheda di un turno non li pesca per sbaglio.
export const RIENTRI_KEY_PREFIX = 'RIENTRI';

/* Quale versione del parser ha prodotto una lettura. Gli Orari restano salvati
   fra un avvio e l'altro, quindi una lettura fatta prima che il grafico di
   servizio venisse letto sopravvive all'aggiornamento e non ha ne' rientri ne'
   uscite: senza questo numero l'app non puo' distinguerla da un PDF che il
   grafico non ce l'ha, e finisce per dare la colpa al PDF. Va alzato quando
   cambia cio' che il parser ricava dalla stessa pagina - la 2 e' quella che ha
   aggiunto le uscite. */
export const RIENTRI_PARSER_VERSION = 2;

export function rientriKey(line = '', gt = '') {
  return [RIENTRI_KEY_PREFIX, line || '?', gt].filter(Boolean).join(' ');
}

export function isRientriKey(key = '') {
  return String(key).startsWith(`${RIENTRI_KEY_PREFIX} `);
}

// Le uscite seguono la stessa regola dei rientri e per la stessa ragione: la
// pagina dei turni non deve poterle produrre, e la scheda di un turno non deve
// pescarle credendole uno sviluppo.
export const USCITE_KEY_PREFIX = 'USCITE';

export function usciteKey(line = '', gt = '') {
  return [USCITE_KEY_PREFIX, line || '?', gt].filter(Boolean).join(' ');
}

export function isUsciteKey(key = '') {
  return String(key).startsWith(`${USCITE_KEY_PREFIX} `);
}

// Le due pagine speciali insieme: quello che non e' uno sviluppo turno.
export function isGraphicKey(key = '') {
  return isRientriKey(key) || isUsciteKey(key);
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
  /* L'I.L. si cerca seguito dalla sua ora: "IL" da solo e' una parola come
     un'altra, e nel referto un marcatore falso vale meno di niente. */
  ['il', /\bI\.?\s?L\.?\s+\d{1,2}[.:]?\d{2}\b/],
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

/* La legenda della pagina, che dei codici a quattro lettere dice il posto vero:
 *
 *   OBFR = ORBASSANO - STRADA TORINO - Capolinea andata 5
 *   CATT = P.ZA CATTANEO - Posto cambio
 *   OSET = C. ORBASSANO / C. SETTEMBRINI
 *
 * Senza questa l'app mostra "GORX" e "NEGR", che chi guida non ha motivo di
 * riconoscere. Con questa mostra il nome che c'e' scritto sul documento, e non
 * uno inventato da noi.
 */
const LEGEND_ENTRY_RE = /\b([A-Z]{4})\s*=\s*([^=]{2,80}?)(?=\s+[A-Z]{4}\s*=|$)/g;
// Oltre questa lunghezza non e' piu' una voce di legenda ma il testo che segue.
const MAX_LEGEND_NAME = 60;

/* Il PDF scrive tutto maiuscolo. Su una scheda "P.ZA CATTANEO" urla e si legge
   peggio di "P.za Cattaneo": le parole restano quelle, cambia solo la forma. */
function titleCase(value = '') {
  // Dopo il punto no: "P.ZA" e' "P.za", non "P.Za".
  return String(value).toLowerCase().replace(/(^|[\s/-])([a-zà-ù])/g, (_, before, letter) => before + letter.toUpperCase());
}

function tidyLegendName(value = '') {
  return String(value)
    .replace(/\s+/g, ' ')
    .replace(/[\s\-–,;.]+$/, '')
    .trim();
}

export function parseLegend(text = '') {
  const source = String(text || '').toUpperCase().replace(/\s+/g, ' ');
  const legend = {};

  for (const match of source.matchAll(LEGEND_ENTRY_RE)) {
    const code = match[1];
    const name = tidyLegendName(match[2]);
    if (!name || name.length > MAX_LEGEND_NAME) continue;
    /* La legenda dice anche a cosa serve il posto: il posto cambio e' dove si
       da' il cambio, il capolinea dove la vettura inverte. Sono parole loro,
       non nostre, e servono a non chiamare le due cose allo stesso modo. */
    const role = /POSTO\s+CAMBIO/.test(name) ? 'cambio' : /CAPOLINEA/.test(name) ? 'capolinea' : '';
    const label = tidyLegendName(name.replace(/-?\s*(POSTO\s+CAMBIO|CAPOLINEA(\s+\w+)*(\s+\d+[A-Z]?)?)\s*$/, ''));
    if (!label) continue;
    legend[code] = { label: titleCase(label), role };
  }

  return legend;
}
