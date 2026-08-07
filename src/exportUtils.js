import { REST_CODES, SPECIAL_CODES } from './parserPreconoscenza.js';
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

function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawBusMark(ctx, x, y, size) {
  ctx.save();
  ctx.fillStyle = '#ffd100';
  drawRoundRect(ctx, x, y, size, size, 18);
  ctx.fill();
  ctx.strokeStyle = '#073865';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const left = x + size * 0.24;
  const top = y + size * 0.22;
  const bodyW = size * 0.52;
  const bodyH = size * 0.56;
  drawRoundRect(ctx, left, top, bodyW, bodyH, 10);
  ctx.stroke();
  ctx.strokeRect(left + size * 0.1, top + size * 0.11, bodyW - size * 0.2, size * 0.2);
  ctx.beginPath();
  ctx.moveTo(left + size * 0.12, top + bodyH - size * 0.14);
  ctx.lineTo(left + bodyW - size * 0.12, top + bodyH - size * 0.14);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(left + size * 0.16, top + bodyH + 1, size * 0.045, 0, Math.PI * 2);
  ctx.arc(left + bodyW - size * 0.16, top + bodyH + 1, size * 0.045, 0, Math.PI * 2);
  ctx.fillStyle = '#073865';
  ctx.fill();
  ctx.restore();
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.96));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function buildPreconoscenzaInfographicBlob(entries = [], info = {}) {
  const sorted = entries
    .filter((day) => day?.t === 'turno' || REST_CODES[day?.t] || day?.t === 'RIS')
    .sort((a, b) => (a.date || new Date(`${a.iso}T00:00:00`)) - (b.date || new Date(`${b.iso}T00:00:00`)));
  const rows = sorted.map((day) => {
    const date = day.date || new Date(`${day.iso}T00:00:00`);
    if (day.t === 'turno') {
      return {
        date: cleanDateFormatter.format(date),
        type: 'shift',
        main: day.l ? `Linea ${day.l}` : 'Linea non indicata',
        detail: `${formatCompactTime(day.i)} - ${formatCompactTime(day.e)}`,
      };
    }
    if (day.t === 'RIS') {
      return {
        date: cleanDateFormatter.format(date),
        type: 'ballot',
        main: 'Ballottaggio',
        detail: 'Turno da assegnare',
      };
    }
    return {
      date: cleanDateFormatter.format(date),
      type: 'rest',
      main: 'Riposo',
      detail: 'Giornata libera',
    };
  });
  const shifts = rows.filter((row) => row.type === 'shift').length;
  const rests = rows.filter((row) => row.type === 'rest').length;
  const ballots = rows.filter((row) => row.type === 'ballot').length;
  const period = [info?.dIn, info?.dTe]
    .filter(Boolean)
    .map((date) => new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date))
    .join(' - ');

  const width = 1080;
  const headerHeight = 230;
  const summaryHeight = 132;
  const rowHeight = 64;
  const footerHeight = 84;
  const height = headerHeight + summaryHeight + Math.max(rows.length, 1) * rowHeight + footerHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f6f7f9';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#005daa';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width - 120, 0);
  ctx.quadraticCurveTo(width, 0, width, 120);
  ctx.lineTo(width, headerHeight);
  ctx.lineTo(0, headerHeight);
  ctx.closePath();
  ctx.fill();

  try {
    const busIcon = await loadImage(`${import.meta.env.BASE_URL}assets-webp/bus-front-icon.webp?v=2`);
    ctx.drawImage(busIcon, 48, 46, 112, 112);
  } catch {
    drawBusMark(ctx, 48, 46, 112);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 54px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Preconoscenza turni', 190, 88);
  ctx.fillStyle = '#ffd100';
  ctx.font = '850 32px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(period || 'Periodo caricato', 190, 136);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '750 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Riepilogo semplificato per condivisione', 190, 180);

  const cardX = 48;
  let y = headerHeight + 34;
  const cardW = width - 96;
  drawRoundRect(ctx, cardX, y, cardW, 90, 26);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = '#073865';
  ctx.font = '900 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(`${shifts} turni`, cardX + 34, y + 56);
  ctx.fillStyle = '#1f8a43';
  ctx.fillText(`${rests} riposi`, cardX + 260, y + 56);
  ctx.fillStyle = '#c62828';
  ctx.fillText(`${ballots} ballott.`, cardX + 480, y + 56);
  ctx.fillStyle = '#697382';
  ctx.font = '760 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Solo linee e orari principali', cardX + 700, y + 56);

  y += summaryHeight;
  rows.forEach((row, index) => {
    const rowY = y + index * rowHeight;
    ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#eef4fa';
    drawRoundRect(ctx, cardX, rowY, cardW, rowHeight - 8, 16);
    ctx.fill();

    ctx.fillStyle = '#273241';
    ctx.font = '850 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(row.date, cardX + 24, rowY + 38);

    ctx.fillStyle = row.type === 'rest' ? '#1f8a43' : row.type === 'ballot' ? '#c62828' : '#005daa';
    ctx.font = '950 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(row.main, cardX + 360, rowY + 39);

    ctx.fillStyle = '#111827';
    ctx.font = '900 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(row.detail, cardX + cardW - 24, rowY + 39);
    ctx.textAlign = 'left';
  });

  ctx.fillStyle = '#697382';
  ctx.font = '720 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Generato con Turni Smart · turni, riposi e ballottaggi senza codici tecnici o posti cambio', 48, height - 34);

  return canvasToBlob(canvas);
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

export function downloadBlobFile(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
