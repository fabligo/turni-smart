import { REST_CODES, SPECIAL_CODES, formatCompactTime } from '../parserPreconoscenza.js';
import { getLineDisplayName } from '../constants/depotGerbido.js';
import { Icon } from './Icon.jsx';

const weekdayFormatter = new Intl.DateTimeFormat('it-IT', { weekday: 'short' });

function dayDate(day) {
  return day?.date instanceof Date ? day.date : new Date(`${day?.iso}T00:00:00`);
}

function describe(day) {
  if (day?.t === 'turno') {
    return {
      kind: 'turno',
      title: `Linea ${getLineDisplayName(day.lineaNorm || day.l)} · Turno ${day.n || '-'}`,
      /* L'ora di attacco ha gia' la sua colonna: qui basta il percorso e la fine. */
      detail: `${day.li || '-'} → ${day.le || '-'} · fine ${formatCompactTime(day.e)}`,
      time: formatCompactTime(day.i),
    };
  }

  if (day?.t === 'RIS') {
    return { kind: 'ballottaggio', title: 'Ballottaggio', detail: 'Turno da assegnare', time: '' };
  }

  const info = SPECIAL_CODES[day?.t] || { label: day?.t || '-', description: '' };
  return {
    kind: REST_CODES[day?.t] ? 'riposo' : 'altro',
    title: info.label,
    detail: day?.projected ? 'Riposo calcolato' : info.description || '',
    time: '',
  };
}

/**
 * Sotto la griglia del mese non servono trenta schede complete: serve una riga
 * per giorno che risponda a "quando attacco", e il dettaglio al tocco.
 */
export function MonthDayList({ days = [], onSelectDay }) {
  if (!days.length) {
    return <p className="result-message">Nessun giorno caricato per questo mese.</p>;
  }

  return (
    <ul className="month-day-list" aria-label="Giorni del mese">
      {days.map((day) => {
        const date = dayDate(day);
        const info = describe(day);
        return (
          <li key={day.iso}>
            <button className={`month-day-row month-day-row--${info.kind}`} onClick={() => onSelectDay?.(date)} type="button">
              <span className="month-day-row__date">
                <small>{weekdayFormatter.format(date).toUpperCase()}</small>
                <strong>{date.getDate()}</strong>
              </span>
              <span className="month-day-row__body">
                <strong>{info.title}</strong>
                {info.detail ? <small>{info.detail}</small> : null}
              </span>
              {info.time ? <span className="month-day-row__time">{info.time}</span> : null}
              <Icon className="month-day-row__chevron" name="chevronRight" size={18} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
