import { useMemo, useState } from 'react';
import { getLineDisplayName } from '../constants/depotGerbido.js';
import { getChangePointLabel, getChangePointStop } from '../constants/changePoints.js';
import { DEPARTURE_HORIZON_MINUTES, searchDepartures } from '../utils/depotDepartures.js';
import { formatClock } from '../utils/depotReturns.js';
import { formatMinutes } from '../utils/timeUtils.js';
import { Icon } from './Icon.jsx';

const HORIZON_OPTIONS = [
  { minutes: 60, label: 'entro 1 ora' },
  { minutes: 120, label: 'entro 2 ore' },
  { minutes: 240, label: 'entro 4 ore' },
  { minutes: DEPARTURE_HORIZON_MINUTES, label: 'tutta la giornata' },
];

const SERVICE_OPTIONS = [
  { value: '', label: 'Servizio di oggi' },
  { value: 'feriali', label: 'Feriale (lun-ven)' },
  { value: 'sabato', label: 'Sabato' },
  { value: 'festivi', label: 'Festivo' },
];

const SERVICE_LABELS = { feriali: 'feriale', sabato: 'sabato', festivi: 'festivo' };

function formatWait(minutes, anchor) {
  if (minutes <= 0) return `in uscita alle ${anchor}`;
  const amount = minutes >= 60 ? formatMinutes(minutes) : `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'}`;
  return `${amount} dopo le ${anchor}`;
}

/**
 * Lo specchio dei rientri: cosa parte dal Gerbido.
 *
 * La domanda a cui risponde non e' "come torno" ma "cosa esce da qui adesso":
 * quante uscite ci sono da un certo orario, e di quali linee.
 */
export function DepotDeparturesPanel({ developments = {} }) {
  const [form, setForm] = useState(() => ({
    horizonMinutes: 120,
    service: '',
    time: formatClock(new Date()),
  }));

  const result = useMemo(
    () =>
      searchDepartures(developments, {
        horizonMinutes: form.horizonMinutes,
        service: form.service,
        time: form.time,
      }),
    [developments, form.horizonMinutes, form.service, form.time],
  );

  const anchor = form.time || formatClock(new Date());
  const serviceLabel = SERVICE_LABELS[result.service] || result.service;

  function updateForm(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  return (
    <section className="depot-returns-panel dc" aria-labelledby="depot-departures-title">
      <div className="depot-returns-panel__header">
        <span className="section-kicker">
          <Icon name="route" size={22} />
          Uscite deposito
        </span>
        <h2 id="depot-departures-title">Cosa esce dal Gerbido</h2>
        <p>
          Tutte le corse di servizio che partono dal Gerbido dall&apos;orario indicato in avanti, con la linea, il turno
          e dove arriva il primo tratto.
        </p>
      </div>

      {/* La ricerca si aggiorna da se' al cambio dei criteri: qui non c'e'
          niente da leggere dal GPS ne' da attendere, quindi un bottone
          "Trova" non aggiungerebbe nulla. */}
      <form className="depot-returns-form" onSubmit={(event) => event.preventDefault()}>
        <div className="depot-returns-controls">
          <label>
            <span>Dalle</span>
            <input
              aria-label="Orario da cui elencare le uscite"
              onChange={(event) => updateForm({ time: event.target.value })}
              type="time"
              value={form.time}
            />
          </label>
          <label>
            <span>Fino a</span>
            <select
              onChange={(event) => updateForm({ horizonMinutes: Number(event.target.value) })}
              value={form.horizonMinutes}
            >
              {HORIZON_OPTIONS.map((option) => (
                <option key={option.minutes} value={option.minutes}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Servizio</span>
            <select onChange={(event) => updateForm({ service: event.target.value })} value={form.service}>
              {SERVICE_OPTIONS.map((option) => (
                <option key={option.value || 'auto'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>

      <p className="depot-returns-summary">
        {result.total ? (
          <>
            <strong>
              {result.total} {result.total === 1 ? 'uscita' : 'uscite'}
            </strong>{' '}
            dalle {anchor}, servizio {serviceLabel}
          </>
        ) : (
          <>Nessuna uscita dalle {anchor} con il servizio {serviceLabel}.</>
        )}
      </p>

      {result.byLine.length ? (
        <div className="departure-lines" aria-label="Uscite per linea">
          {result.byLine.map((item) => (
            <span className="departure-line-chip" key={item.line}>
              Linea {getLineDisplayName(item.line)}
              <em>{item.count}</em>
            </span>
          ))}
        </div>
      ) : null}

      {/* Un elenco vuoto ha sempre una ragione, e dirla e' l'unico modo per
          distinguere un dato che manca da una funzione rotta. */}
      {!result.total && result.otherServiceCount ? (
        <p className="depot-returns-message">
          Ci sono {result.otherServiceCount} uscite a quest&apos;ora, ma di un altro servizio
          {Object.keys(result.countByService).length
            ? ` (${Object.entries(result.countByService)
                .map(([key, count]) => `${SERVICE_LABELS[key] || key}: ${count}`)
                .join(', ')})`
            : ''}
          . Cambia Servizio per vederle.
        </p>
      ) : null}
      {!result.total && !result.otherServiceCount && result.outsideHorizon ? (
        <p className="depot-returns-message">
          Nessuna uscita in questa finestra, ma {result.outsideHorizon} piu&apos; avanti nella giornata: allarga Fino a.
        </p>
      ) : null}
      {result.total && result.outsideHorizon ? (
        <p className="depot-returns-message">Altre {result.outsideHorizon} uscite oltre la finestra scelta.</p>
      ) : null}

      <div className="depot-returns-results" aria-live="polite">
        {result.matches.map((item) => {
          const palina = getChangePointStop(item.toPlace, { line: item.line });
          return (
            <article
              className="depot-return-card"
              key={`${item.line}-${item.shift}-${item.departure}-${item.toPlace}-${item.vehicleShift}`}
            >
              <div>
                <strong>Linea {getLineDisplayName(item.line)}</strong>
                <span>
                  turno {item.shift || '-'}
                  {item.vehicleShift ? ` · vettura ${item.vehicleShift}` : ''}
                </span>
              </div>
              <div>
                <strong>
                  {item.departure} → {item.arrival}
                </strong>
                <span>
                  verso {getChangePointLabel(item.toPlace)}
                  {palina ? ` · palina ${palina}` : ''}
                </span>
              </div>
              <div>
                <strong>Esce {formatWait(item.waitMinutes, anchor)}</strong>
                <span>primo tratto {formatMinutes(item.legMinutes)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
