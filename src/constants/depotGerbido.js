export const GERBIDO_LINES = [
  '5',
  '5B',
  '10',
  '12',
  '14',
  '17',
  '17B',
  '33',
  '34',
  '35',
  '36',
  '36_MERC',
  '38',
  '39',
  '43',
  '44',
  '55',
  '58',
  '58B',
  '62',
  '63',
  '63B',
  '71',
  '74',
  '76',
  '132',
  'CP1',
  'M1N',
  'M1S',
];

const DISPLAY_NAMES = {
  '36_MERC': '36 (merc.)',
};

export function normalizeLineCode(line) {
  const raw = String(line ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\\]/g, '/')
    .replace(/\s+/g, ' ');

  if (!raw) return '';
  if (/^36\s*(?:\(|)?MERC\.?(?:\)|)?$/.test(raw)) return '36_MERC';

  const compact = raw.replace(/\s+/g, '').replace(/[()]/g, '');

  const barrato = compact.replace(/\/+$/g, 'B');
  const match = barrato.match(/^0*(\d+)([A-Z]*)$/);
  if (!match) return barrato;

  const number = String(Number.parseInt(match[1], 10));
  return `${number}${match[2] || ''}`;
}

export function isGerbidoLine(line) {
  return GERBIDO_LINES.includes(normalizeLineCode(line));
}

/* Le barrate: dentro l'app la 58 barrata e' "58B", perche' una barra in fondo a
   una chiave non si maneggia bene. Ma sul documento e in deposito si chiama
   "58/", ed e' quello che uno legge sulla vettura: a schermo torna com'e'. */
const BARRATA_RE = /^(\d+)B$/;

export function getLineDisplayName(line) {
  const normalized = normalizeLineCode(line);
  if (DISPLAY_NAMES[normalized]) return DISPLAY_NAMES[normalized];
  const barrata = normalized.match(BARRATA_RE);
  if (barrata) return `${barrata[1]}/`;
  return normalized || String(line ?? '');
}

/* La variante di una linea rispetto alla sua linea madre: la 5B e' la 5
   barrata, la 36 (merc.) e' la 36 del mercato. CP1, M1N e M1S qui non c'entrano
   niente: non sono varianti di niente e non sono sigle, sono linee per conto
   loro, con il loro percorso e i loro capolinea. Erano marcate 'speciale', che
   e' il modo in cui questo codice diceva che non le considerava linee vere. */
export function getLineVariant(line) {
  const normalized = normalizeLineCode(line);
  if (normalized === '36_MERC') return 'merc';
  if (/B$/.test(normalized)) return 'B';
  return 'base';
}

