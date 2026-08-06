// Nomenclatura e caratteristiche dei turni come le fissa l'Accordo "Esercizio
// TPL Urbano" del 16/07/2025: la tabella "Tipologie e caratteristiche turni"
// (allegato pag. 2/2) per codifica e finestre orarie, la legenda della pellicola
// "Gigante" (allegato pag. 1/2) per i nomi delle fasce e per i ballottaggi.
//
// `range` e' la codifica del numero di turno, `earliestStart`/`latestEnd` sono
// l'ora di inizio minima e di termine massima previste dall'accordo: servono a
// riconoscere un turno che non torna, non a riscriverne l'orario.
export const SHIFT_CATEGORIES = {
  SPLIT_ODD: {
    type: 'split_odd',
    label: '2 riprese dispari',
    badge: '2 riprese',
    code: 'T2R',
    range: '001-049',
    earliestStart: '04:00',
    latestEnd: '16:00',
    isSplit: true,
    isEvening: false,
    color: '#e65100',
  },
  SPLIT_CHANGE: {
    type: 'split_change',
    label: '2 riprese cambio',
    badge: '2 riprese',
    code: 'T2R',
    range: '050-089',
    earliestStart: '08:30',
    latestEnd: '21:00',
    isSplit: true,
    isEvening: false,
    color: '#d35400',
  },
  // La legenda della pellicola tiene 050-099 sotto "2 riprese cambio", ma la
  // tabella delle tipologie stacca 090-099 come T2RP, con la finestra del
  // pomeridiano: qui vale la tabella, che e' quella piu' fine.
  SPLIT_AFTERNOON: {
    type: 'split_afternoon',
    label: '2 riprese pomeridiano',
    badge: '2 riprese',
    code: 'T2RP',
    range: '090-099',
    earliestStart: '11:30',
    latestEnd: '21:00',
    isSplit: true,
    isEvening: false,
    color: '#b34700',
  },
  MORNING: {
    type: 'morning',
    label: 'Ripresa unica mattino',
    badge: 'Mattino',
    code: '100',
    range: '100-199',
    earliestStart: '04:00',
    latestEnd: '13:45',
    isSplit: false,
    isEvening: false,
    color: '#1b7a3d',
  },
  INTERMEDIATE: {
    type: 'intermediate',
    label: 'Ripresa unica intermedia',
    badge: 'Intermedia',
    code: '200',
    range: '200-299',
    earliestStart: '07:16',
    latestEnd: '17:59',
    isSplit: false,
    isEvening: false,
    color: '#00796b',
  },
  AFTERNOON: {
    type: 'afternoon',
    label: 'Ripresa unica pomeridiana',
    badge: 'Pomeridiano',
    code: '300',
    range: '300-399',
    earliestStart: '11:30',
    latestEnd: '22:00',
    isSplit: false,
    isEvening: false,
    color: '#003366',
  },
  EVENING: {
    type: 'evening',
    label: 'Ripresa unica serale',
    badge: 'Serale',
    code: '400',
    range: '400-499',
    earliestStart: '17:15',
    latestEnd: '02:30',
    isSplit: false,
    isEvening: true,
    color: '#4a148c',
  },
  // La tipologia "W" e' stata eliminata dall'accordo, insieme alla sua banca
  // ore: se ricompare in un vecchio PDF va detto, non spacciato per un turno
  // qualunque.
  WITHDRAWN: {
    type: 'withdrawn',
    label: 'Tipologia W soppressa',
    badge: 'W',
    code: 'W',
    range: 'W',
    isSplit: false,
    isEvening: false,
    color: '#8d6e63',
  },
  // "Non si prevedono turni denominati 900 su programmazione ordinaria di
  // linea": un 900 e' quindi servizio fuori programmazione ordinaria.
  OUT_OF_LINE: {
    type: 'out_of_line',
    label: 'Fuori programmazione ordinaria',
    badge: '900',
    code: '900',
    range: '900-999',
    isSplit: false,
    isEvening: false,
    color: '#6d4c41',
  },
  UNKNOWN: {
    type: 'unknown',
    label: 'Categoria non riconosciuta',
    badge: 'Turno',
    code: '',
    range: '',
    isSplit: false,
    isEvening: false,
    color: '#5a6b80',
  },
};

// Codici di ballottaggio e relativa codifica, dalla legenda della pellicola.
export const BALLOTTAGGI = {
  B00: {
    label: 'Tutte le tipologie di turno',
    description: '001-099 / 100 - 200 - 300 - 400',
  },
  B01: {
    label: 'Ripresa unica dopo le 11.45',
    description: 'Turni a ripresa unica che iniziano dopo le 11.45: 300 / 400',
  },
  B03: {
    label: 'Termine entro le 21.00',
    description: 'Turni che terminano entro le 21,00: 001-099 / 100 - 200 - 300',
  },
  B04: {
    label: 'Termine entro le 17.45',
    description: 'Turni che terminano entro le 17,45: 001-049 / 100 - 200',
  },
  B05: {
    label: 'Mattino entro le 13.45',
    description: 'Turni a ripresa unica che terminano entro le 13,45: 100',
  },
};

// Quote di composizione giornaliera per deposito (punto 3 dell'accordo): sono
// medie sul deposito, non un vincolo sul singolo turno.
export const DAILY_SHIFT_MIX = {
  feriali: {
    label: 'Feriali (lun-ven)',
    single: { share: 80, maximals: [{ share: 60, hours: '6.30h' }, { share: 40, hours: '6.50h' }] },
    split: { share: 20 },
  },
  sabato: {
    label: 'Sabato',
    single: { share: 85, maximals: [{ share: 60, hours: '6.30h' }, { share: 40, hours: '6.50h' }] },
    split: { share: 15 },
  },
  festivi: {
    label: 'Festivi (e agosto)',
    single: { share: 95, maximals: [{ share: 50, hours: '6.30h' }, { share: 50, hours: '6.45h' }] },
    split: { share: 5, note: 'riservati a chi ha un T2R per motivi di salute' },
  },
};

function turnNumber(turnCode) {
  const match = String(turnCode || '').match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

export function getShiftCategory(turnCode) {
  const raw = String(turnCode || '').trim().toUpperCase();
  if (/^W\d*$/.test(raw)) return SHIFT_CATEGORIES.WITHDRAWN;

  const code = turnNumber(raw);
  if (code === null) return SHIFT_CATEGORIES.UNKNOWN;
  if (code >= 1 && code <= 49) return SHIFT_CATEGORIES.SPLIT_ODD;
  if (code >= 50 && code <= 89) return SHIFT_CATEGORIES.SPLIT_CHANGE;
  if (code >= 90 && code <= 99) return SHIFT_CATEGORIES.SPLIT_AFTERNOON;
  if (code >= 100 && code < 200) return SHIFT_CATEGORIES.MORNING;
  if (code >= 200 && code < 300) return SHIFT_CATEGORIES.INTERMEDIATE;
  if (code >= 300 && code < 400) return SHIFT_CATEGORIES.AFTERNOON;
  if (code >= 400 && code < 500) return SHIFT_CATEGORIES.EVENING;
  if (code >= 900 && code <= 999) return SHIFT_CATEGORIES.OUT_OF_LINE;
  return SHIFT_CATEGORIES.UNKNOWN;
}

/**
 * Il nome per esteso del turno, con la codifica dell'accordo: "2 riprese
 * dispari (T2R 001-049)". Serve dove il turno va chiamato con il suo nome, non
 * solo colorato.
 */
export function getShiftCategoryName(turnCode) {
  const category = getShiftCategory(turnCode);
  if (!category.code) return category.label;
  // Le riprese uniche si chiamano con la sola codifica ("un 100", "un 300"); i
  // turni a due riprese con la sigla piu' la fascia di numeri.
  const numeric = /^\d+$/.test(category.code);
  const codifica = numeric || category.code === category.range ? category.code : `${category.code} ${category.range}`;
  return `${category.label} (${codifica})`;
}

export function isEveningShift(turnCode, fallback = false) {
  const category = getShiftCategory(turnCode);
  return category.type === 'unknown' ? fallback : category.isEvening;
}

export function isSplitCategory(turnCode) {
  return getShiftCategory(turnCode).isSplit;
}

export function getShiftColor(turnCode) {
  return getShiftCategory(turnCode).color;
}
