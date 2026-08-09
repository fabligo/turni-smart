import { compactTimeToMinutes, timeToMinutes } from './timeUtils.js';
import { getLineDisplayName } from '../constants/depotGerbido.js';

/* Le sveglie di tutto il periodo, in un colpo solo.

   Su iPhone nessuna app puo' creare una sveglia dell'Orologio: puo' farlo solo
   Comandi Rapidi. Quello che l'app puo' fare — e che e' la parte che conta —
   e' decidere **quali** turni richiedono la sveglia e **a che ora**, e
   consegnare l'elenco gia' fatto. Il calcolo sta qui, in JavaScript, dove e'
   coperto dai test e si cambia in un punto solo; la scorciatoia che poi fa
   suonare il telefono resta ignorante e stabile.

   Perche' l'ora d'attacco e non la categoria dell'Accordo: un 100 e' "Ripresa
   unica mattino", ma anche un T2R 001-049 attacca alle 04:00 (vedi
   `earliestStart` in `shiftClassification.js`) e chi lo fa deve alzarsi
   uguale. Guardare la categoria lascerebbe senza sveglia proprio il turno che
   ne ha piu' bisogno. */

/* La finestra d'attacco che richiede la sveglia, fissata dall'utente:
   dalle 04:00 alle 08:30, estremi compresi.

   Il limite basso coincide con l'attacco piu' presto previsto dall'Accordo e
   fa anche da filtro contro le ore illeggibili, che varrebbero 00:00: una
   sveglia a mezzanotte sarebbe peggio di nessuna sveglia.

   Il limite alto e' compreso perche' fra "sveglia di troppo" e "sveglia
   mancante" il secondo costa un turno. Da non confondere con
   `EARLY_START_MINUTES` di `shiftTiming.js`, che e' piu' stretto e risponde a
   un'altra domanda: quando *suggerire* la sveglia nella card. */
export const ALARM_WINDOW_FROM_MINUTES = 4 * 60;
export const ALARM_WINDOW_TO_MINUTES = 8 * 60 + 30;

/* Una sola scrittura della finestra, cosi' il testo a schermo, i documenti e
   il filtro non possono raccontare tre cose diverse. */
export const ALARM_WINDOW_LABEL = 'dalle 04:00 alle 08:30';

/* Un'ora fra sveglia e presa servizio, come richiesto. `shiftTiming.js` ne usa
   75 per il *suggerimento* mostrato nella card: quello e' un consiglio a
   schermo, questo un orario che suona davvero, e chi lo imposta ha detto
   un'ora. Restano due numeri perche' rispondono a due domande diverse. */
export const DEFAULT_ALARM_LEAD_MINUTES = 60;

function pad(value) {
  return String(value).padStart(2, '0');
}

function clockOf(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* L'attacco e' quello dello sviluppo quando c'e' (gli Orari Linee sono il dato
   piu' fine), altrimenti l'ora della Preconoscenza. E' la stessa scelta che
   fanno `analytics.js` e l'export del calendario: l'ora della sveglia e quella
   dell'evento in calendario devono raccontare lo stesso turno. */
function startMinutesOf(entry) {
  if (entry.segments?.length) return timeToMinutes(entry.segments[0].start);
  return compactTimeToMinutes(entry.day.i);
}

function dayStart(entry) {
  const base = entry.day.date instanceof Date ? new Date(entry.day.date) : new Date(`${entry.iso}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setHours(0, 0, 0, 0);
  return base;
}

/**
 * Da `enrichShiftDays()` all'elenco delle sveglie da impostare, in ordine di
 * data. Fuori restano riposi, ballottaggi e turni che attaccano abbastanza
 * tardi da non richiedere una sveglia.
 */
export function collectWakeAlarms(enrichedDays = {}, options = {}) {
  const leadMinutes = Number.isFinite(options.leadMinutes) ? options.leadMinutes : DEFAULT_ALARM_LEAD_MINUTES;
  const fromMinutes = Number.isFinite(options.fromMinutes) ? options.fromMinutes : ALARM_WINDOW_FROM_MINUTES;
  const toMinutes = Number.isFinite(options.toMinutes) ? options.toMinutes : ALARM_WINDOW_TO_MINUTES;

  return Object.values(enrichedDays)
    .filter((entry) => entry?.day?.t === 'turno')
    .map((entry) => {
      const startMinutes = startMinutesOf(entry);
      const base = dayStart(entry);
      /* Estremi compresi: un turno che attacca alle 08:30 in punto la sveglia
         la vuole. */
      if (!base || !Number.isFinite(startMinutes) || startMinutes < fromMinutes || startMinutes > toMinutes) return null;

      const start = new Date(base);
      start.setMinutes(startMinutes);
      const wakeAt = new Date(start.getTime() - leadMinutes * 60000);

      const line = getLineDisplayName(entry.day.lineaNorm || entry.day.l);
      return {
        iso: entry.iso,
        line,
        turn: entry.day.n,
        startAt: start,
        startTime: clockOf(start),
        wakeAt,
        wakeTime: clockOf(wakeAt),
        /* La sveglia suona quando e' ancora buio e si guarda lo schermo per
           mezzo secondo: deve dire quale turno, non "Sveglia". */
        label: `Turno ${line} ${entry.day.n} · attacco ${clockOf(start)}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.wakeAt - b.wakeAt);
}

/**
 * Il riassunto da mostrare prima di confermare: quante sveglie, in che giorni,
 * e la piu' presta. Chi preme il pulsante deve poter riconoscere i suoi turni
 * senza aprire il calendario.
 */
export function summarizeWakeAlarms(alarms = []) {
  if (!alarms.length) return { count: 0, earliest: '', latest: '', firstIso: '', lastIso: '' };

  const times = alarms.map((alarm) => alarm.wakeTime).sort();
  return {
    count: alarms.length,
    earliest: times[0],
    latest: times[times.length - 1],
    firstIso: alarms[0].iso,
    lastIso: alarms[alarms.length - 1].iso,
  };
}
