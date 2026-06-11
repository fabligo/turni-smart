import { SPECIAL_CODES } from './parserPreconoscenza.js';
import { formatCompactTime } from './parserPreconoscenza.js';
import { BALLOTTAGGI } from './constants/shiftClassification.js';

const cleanDateFormatter = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
});

function escapeCsv(value) {
  const text = String(value ?? '');
  if (!/[",\n;]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(entries = []) {
  const rows = [
    ['Data', 'Tipo', 'Linea', 'Turno', 'Inizio', 'Fine', 'Partenza', 'Termine', 'Note'],
    ...entries.map((day) => {
      if (day?.t !== 'turno') {
        const info = SPECIAL_CODES[day?.t] || { label: day?.t || '', description: '' };
        const ballot = day?.ball ? `${day.ball} ${BALLOTTAGGI[day.ball]?.description || ''}` : '';
        return [day?.iso || '', info.label, '', '', '', '', '', '', ballot || info.description || day?.x || ''];
      }

      return [
        day.iso || '',
        'Turno',
        day.l || '',
        day.n || '',
        formatCompactTime(day.i),
        formatCompactTime(day.e),
        day.li || '',
        day.le || '',
        day.c || '',
      ];
    }),
  ];

  return rows.map((row) => row.map(escapeCsv).join(';')).join('\n');
}

export function buildReadablePreconoscenza(entries = [], info = {}) {
  const shifts = entries
    .filter((day) => day?.t === 'turno')
    .sort((a, b) => (a.date || new Date(`${a.iso}T00:00:00`)) - (b.date || new Date(`${b.iso}T00:00:00`)))
    .map((day) => {
      const date = day.date || new Date(`${day.iso}T00:00:00`);
      const line = day.l ? `Linea ${day.l}` : 'Linea non indicata';
      const start = formatCompactTime(day.i);
      const end = formatCompactTime(day.e);
      return `${cleanDateFormatter.format(date)} · ${line} · ${start}-${end}`;
    });

  const period = [info?.dIn, info?.dTe]
    .filter(Boolean)
    .map((date) => new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date))
    .join(' - ');

  return [
    'Preconoscenza turni',
    period ? `Periodo: ${period}` : '',
    '',
    ...shifts,
    '',
    'Riepilogo semplificato: solo linee e orari di inizio/fine turno.',
  ]
    .filter((line, index, list) => line || (list[index - 1] && list[index + 1]))
    .join('\n');
}

export function downloadTextFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
