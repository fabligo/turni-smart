import { useMemo, useState } from 'react';
import { getLineDisplayName } from '../constants/depotGerbido.js';
import { getChangePointLabel, getChangePointStop } from '../constants/changePoints.js';
import { DEPARTURE_WINDOW_MINUTES, searchDepartures } from '../utils/depotDepartures.js';
import { DEPOT_CODE } from '../utils/depotReturns.js';
import { formatClock } from '../utils/depotReturns.js';
import { formatMinutes } from '../utils/timeUtils.js';
import { Icon } from './Icon.jsx';

/* La finestra guarda da entrambe le parti: un mezzo partito pochi minuti prima
   si prende ancora, quindi tenerlo fuori sarebbe un artificio del filtro. */
const WINDOW_OPTIONS = [5, 10, DEPARTURE_WINDOW_MINUTES, 30, 60, 120];

/* Con la giornata intera si pianifica, non si corre a prendere un mezzo: la
   finestra copre tutto e l'elenco si legge per fasce orarie. */
const ALL_DAY_MINUTES = 720;

const SERVICE_OPTIONS = [
  { value: '', label: 'Servizio di oggi' },
  { value: 'feriali', label: 'Feriale (lun-ven)' },
  { value: 'sabato', label: 'Sabato' },
  { value: 'festivi', label: 'Festivo' },
];

const SERVICE_LABELS = { feriali: 'feriale', sabato: 'sabato', festivi: 'festivo' };

/* Lo scarto e' firmato: negativo vuol dire che il mezzo parte prima
   dell'orario scelto, e va detto, non nascosto in un valore assoluto. */
function formatOffset(minutes, anchor) {
  if (minutes === 0) return `esattamente alle ${anchor}`;
  const amount = Math.abs(minutes) >= 60 ? formatMinutes(Math.abs(minutes)) : `${Math.abs(minutes)} min`;
  return minutes < 0 ? `${amount} prima delle ${anchor}` : `${amount} dopo le ${anchor}`;
}

/* Dove va a finire il tratto che esce: e' la riga che risponde alla domanda
   vera, "questo mezzo mi porta dove devo andare?". */
function formatDestination(item) {
  /* Certi tratti partono e finiscono al deposito: dire "verso Deposito
     Gerbido" sarebbe solo confuso. */
  if (item.toPlace === DEPOT_CODE) return 'rientra al Gerbido';
  const place = getChangePointLabel(item.toPlace);
  return item.directionLabel ? `${item.directionLabel} verso ${place}` : `verso ${place}`;
}

/* Le uscite lette per fascia oraria: con la giornata intera un elenco piatto
   non si scorre, e la fascia e' il modo in cui si ragiona pianificando. Con
   una finestra stretta resta un gruppo solo e non da' fastidio. */
function groupByHour(matches = []) {
  const groups = [];
  matches.forEach((item) => {
    const hour = `${String(item.departure).slice(0, 2)}:00`;
    const last = groups[groups.length - 1];
    if (last && last.hour === hour) last.items.push(item);
    else groups.push({ hour, items: [item] });
  });
  return groups;
}

/**
 * Lo specchio dei rientri: cosa parte dal Gerbido.
 *
 * La domanda a cui risponde non e' "come torno" ma "cosa esce da qui per
 * arrivare dove devo andare": si sceglie il posto cambio e restano solo le
 * uscite che ci vanno. Senza sceglierlo si vedono tutte, che e' il modo giusto
 * di guardare la giornata quando si sta ancora decidendo.
 */
export function DepotDeparturesPanel({ developments = {} }) {
  const [form, setForm] = useState(() => ({
    place: '',
    service: '',
    time: formatClock(new Date()),
    windowMinutes: DEPARTURE_WINDOW_MINUTES,
  }));

  const result = useMemo(
    () =>
      searchDepartures(developments, {
        place: form.place,
        service: form.service,
        time: form.time,
        windowMinutes: form.windowMinutes,
      }),
    [developments, form.place, form.service, form.time, form.windowMinutes],
  );

  const anchor = form.time || formatClock(new Date());
  const serviceLabel = SERVICE_LABELS[result.service] || result.service;
  const placeLabel = form.place ? getChangePointLabel(form.place) : '';

  /* Il selettore offre solo posti che negli orari caricati hanno davvero
     un'uscita dal Gerbido, in ordine alfabetico perche' si cerca per nome. Se
     il posto scelto sparisce cambiando servizio resta comunque nell'elenco,
     altrimenti la select si mostrerebbe vuota senza spiegare perche'. */
  const placeOptions = useMemo(() => {
    const options = result.places.map((item) => ({
      count: item.count,
      label: item.place === DEPOT_CODE ? 'Rientro al Gerbido' : getChangePointLabel(item.place),
      value: item.place,
    }));
    if (form.place && !options.some((option) => option.value === form.place)) {
      options.push({ count: 0, label: getChangePointLabel(form.place), value: form.place });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, 'it'));
  }, [form.place, result.places]);

  /* Quante uscite verso il posto scelto ci sono in tutta la giornata: serve a
     dire "non in questa finestra, ma piu' tardi si'" invece di un secco no. */
  const placeDayCount = form.place ? result.places.find((item) => item.place === form.place)?.count || 0 : 0;

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
          I mezzi che partono dal Gerbido intorno all&apos;orario scelto, con la linea, la direzione e il posto cambio
          dove arrivano. Se devi raggiungere un posto cambio preciso scegli <strong>Vado a</strong>: restano solo le
          uscite che ci vanno.
        </p>
      </div>

      {/* La ricerca si aggiorna da se' al cambio dei criteri: qui non c'e'
          niente da leggere dal GPS ne' da attendere, quindi un bottone
          "Trova" non aggiungerebbe nulla. */}
      <form className="depot-returns-form" onSubmit={(event) => event.preventDefault()}>
        <div className="depot-returns-controls">
          <label>
            <span>Sono in deposito alle</span>
            <input
              aria-label="Orario intorno al quale cercare le uscite dal deposito"
              onChange={(event) => updateForm({ time: event.target.value })}
              type="time"
              value={form.time}
            />
          </label>
          <label>
            <span>Cerca entro</span>
            <select
              aria-label="Quanti minuti prima e dopo l'orario scelto"
              onChange={(event) => updateForm({ windowMinutes: Number(event.target.value) })}
              value={form.windowMinutes}
            >
              {WINDOW_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  &plusmn; {minutes} min
                </option>
              ))}
              <option value={ALL_DAY_MINUTES}>tutta la giornata</option>
            </select>
          </label>
          <label>
            <span>Vado a</span>
            <select
              aria-label="Posto cambio da raggiungere"
              onChange={(event) => updateForm({ place: event.target.value })}
              value={form.place}
            >
              <option value="">Tutti i posti cambio</option>
              {placeOptions.map((option) => (
                <option key={option.value} value={option.value}>
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
            </strong>
            {placeLabel ? ` verso ${placeLabel}` : ''}
            {form.windowMinutes >= ALL_DAY_MINUTES
              ? ` nella giornata, servizio ${serviceLabel}`
              : ` intorno alle ${anchor} (± ${form.windowMinutes} min), servizio ${serviceLabel}`}
          </>
        ) : (
          <>
            Nessuna uscita{placeLabel ? ` verso ${placeLabel}` : ''}
            {form.windowMinutes >= ALL_DAY_MINUTES ? ' nella giornata' : ` intorno alle ${anchor}`} con il servizio{' '}
            {serviceLabel}.
          </>
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
      {!result.total && result.otherPlace ? (
        <p className="depot-returns-message">
          {result.otherPlace === 1
            ? "Un'altra uscita in questa fascia va verso un altro posto cambio."
            : `Altre ${result.otherPlace} uscite in questa fascia vanno verso altri posti cambio.`}{' '}
          Scegli <em>Tutti i posti cambio</em> per vederle.
        </p>
      ) : null}
      {!result.total && placeLabel && placeDayCount ? (
        <p className="depot-returns-message">
          Verso {placeLabel} nella giornata {placeDayCount === 1 ? "c'è 1 uscita" : `ci sono ${placeDayCount} uscite`},
          ma fuori da questa fascia: allarga <em>Cerca entro</em>.
        </p>
      ) : null}
      {!result.total && !placeLabel && !result.otherServiceCount && result.outsideWindow ? (
        <p className="depot-returns-message">
          Niente in questa fascia, ma {result.outsideWindow}{' '}
          {result.outsideWindow === 1 ? 'uscita' : 'uscite'} altrove nella giornata: allarga <em>Cerca entro</em>.
        </p>
      ) : null}

      <div className="depot-returns-results" aria-live="polite">
        {groupByHour(result.matches).map((group) => (
          <div className="departure-hour" key={group.hour}>
            <h3 className="departure-hour__title">
              {group.hour}
              <em>
                {group.items.length} {group.items.length === 1 ? 'uscita' : 'uscite'}
              </em>
            </h3>
            {group.items.map((item) => {
              const palina = getChangePointStop(item.toPlace, { direction: item.direction, line: item.line });
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
                    <strong>esce alle {item.departure}</strong>
                    <span>{formatOffset(item.offsetMinutes, anchor)}</span>
                  </div>
                  <div>
                    <strong>{formatDestination(item)}</strong>
                    <span>
                      arriva alle {item.arrival}
                      {item.toPlace !== DEPOT_CODE && palina ? ` · palina ${palina}` : ''}
                    </span>
                    {/* Se la direzione arriva da un tratto successivo della corsa
                        lo diciamo: e' la direzione del mezzo una volta in linea,
                        non del trasferimento con cui esce dal deposito. */}
                    {item.directionFromRun ? <span>direzione letta dal tratto in linea</span> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
