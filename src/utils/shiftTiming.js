import { compactTimeToMinutes } from './timeUtils.js';

/* Quanto in la' nel futuro ha ancora senso dire "attacchi tra...": oltre
   due giorni il conto alla rovescia non aiuta piu' nessuno. */
const COUNTDOWN_HORIZON_MINUTES = 48 * 60;

/* Sotto quest'ora di attacco la sveglia va suggerita: e' il turno che si
   prepara la sera prima. */
const EARLY_START_MINUTES = 6 * 60;

/* Tempo tipico tra sveglia e presa servizio: vestirsi, viaggio, margine. */
const DEFAULT_WAKE_LEAD_MINUTES = 75;

export function shiftStartDate(day) {
  if (!day || day.t !== 'turno' || !day.i) return null;
  const base = day.date instanceof Date ? day.date : day.iso ? new Date(`${day.iso}T00:00:00`) : null;
  if (!base || Number.isNaN(base.getTime())) return null;

  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(compactTimeToMinutes(day.i));
  return start;
}

export function formatCountdown(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return '';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

/**
 * Le due informazioni che l'autista calcola a mente ogni sera: quanto manca
 * all'attacco e a che ora deve suonare la sveglia.
 */
export function describeShiftTiming(day, now = new Date(), leadMinutes = DEFAULT_WAKE_LEAD_MINUTES) {
  const start = shiftStartDate(day);
  if (!start) return { countdown: '', isImminent: false, wakeUp: '' };

  const minutesAway = Math.round((start - now) / 60000);
  const withinHorizon = minutesAway >= 0 && minutesAway <= COUNTDOWN_HORIZON_MINUTES;
  const startMinutes = compactTimeToMinutes(day.i);

  const wake = new Date(start);
  wake.setMinutes(wake.getMinutes() - leadMinutes);

  return {
    countdown: withinHorizon ? formatCountdown(minutesAway) : '',
    isImminent: minutesAway >= 0 && minutesAway <= 180,
    /* La sveglia si suggerisce solo quando serve davvero, e solo se il turno
       non e' gia' passato. */
    wakeUp:
      withinHorizon && startMinutes > 0 && startMinutes < EARLY_START_MINUTES
        ? `${String(wake.getHours()).padStart(2, '0')}:${String(wake.getMinutes()).padStart(2, '0')}`
        : '',
  };
}
