import { useEffect, useMemo, useState } from 'react';
import { CHANGE_POINTS } from '../constants/changePoints.js';
import { getLineDisplayName } from '../constants/depotGerbido.js';
import {
  DEPOT_CODE,
  formatClock,
  MAX_RIDE_MINUTES,
  normalizePlace,
  RETURN_WINDOW_MINUTES,
  searchReturns,
} from '../utils/depotReturns.js';
import { readNearbyStopsUrl } from '../utils/nearbyStops.js';
import { formatMinutes } from '../utils/timeUtils.js';
import { Icon } from './Icon.jsx';

// La ricerca e' istantanea: la barra resta visibile il minimo che basta a
// vedere che qualcosa e' partito, altrimenti premere Trova sembra inutile.
const SEARCH_FEEDBACK_MS = 520;

const UPCOMING_LIMIT = 5;

const WINDOW_OPTIONS = [30, 60, 90, 120];

const SERVICE_OPTIONS = [
  { value: '', label: 'Servizio di oggi' },
  { value: 'feriali', label: 'Feriale (lun-ven)' },
  { value: 'sabato', label: 'Sabato' },
  { value: 'festivi', label: 'Festivo' },
];

const SERVICE_LABELS = {
  feriali: 'feriale',
  sabato: 'sabato',
  festivi: 'festivo',
};

function clockFromNow(offsetMinutes = 0) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + offsetMinutes);
  return formatClock(date);
}

function sortByCode(codes) {
  return [...codes].sort((a, b) => a.localeCompare(b, 'it'));
}

// I posti cambio presenti negli orari caricati vanno separati dagli altri:
// sceglierne uno senza corse e' il modo piu' rapido per non trovare nulla.
function getChangePointGroups(developments = {}) {
  const inTimetable = new Set();
  Object.values(developments).forEach((segments) => {
    if (!Array.isArray(segments)) return;
    segments.forEach((segment) => {
      if (normalizePlace(segment.loc_s)) inTimetable.add(normalizePlace(segment.loc_s));
      if (normalizePlace(segment.loc_e)) inTimetable.add(normalizePlace(segment.loc_e));
    });
  });
  const others = Object.keys(CHANGE_POINTS).filter((code) => !inTimetable.has(code));
  return { inTimetable: sortByCode(inTimetable), others: sortByCode(others) };
}

/**
 * L'attesa e' sempre contata dall'orario di passaggio cercato, non dall'ora
 * corrente: "tra 49 minuti" si puo' dire solo se i due coincidono, altrimenti
 * l'attesa va ancorata all'orario cercato o si legge come un conto alla
 * rovescia da adesso, che sarebbe falso.
 */
function formatWait(waitMinutes, { anchor = '', anchorIsNow = false } = {}) {
  if (waitMinutes <= 0) return anchorIsNow ? 'in transito ora' : `in transito alle ${anchor}`;
  // Sui rientri lontani "154 minuti" non dice niente: meglio ore e minuti.
  const amount = waitMinutes >= 60 ? formatMinutes(waitMinutes) : `${waitMinutes} ${waitMinutes === 1 ? 'minuto' : 'minuti'}`;
  return anchorIsNow ? `tra ${amount}` : `${amount} dopo le ${anchor}`;
}

function formatWindow(windowMinutes) {
  if (windowMinutes < 60) return `${windowMinutes} minuti`;
  const hours = windowMinutes / 60;
  return hours === 1 ? '1 ora' : `${hours} ore`;
}

export function DepotReturnsPanel({ developments = {} }) {
  const { inTimetable, others } = useMemo(() => getChangePointGroups(developments), [developments]);
  const defaultPlace = inTimetable.find((code) => code !== DEPOT_CODE) || '';

  const [form, setForm] = useState(() => ({
    place: defaultPlace,
    service: '',
    time: clockFromNow(0),
    windowMinutes: RETURN_WINDOW_MINUTES,
  }));
  // I criteri confermati restano separati dal form: la ricerca parte quando si
  // preme Trova, non a ogni tasto premuto.
  const [criteria, setCriteria] = useState(form);
  const [searching, setSearching] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  // Il link alla mappa si prepara prima e si apre con un tocco a parte: aprire
  // una scheda in attesa del GPS la lascia bianca su iOS.
  const [nearbyUrl, setNearbyUrl] = useState('');

  function findNearbyStops() {
    setGeoMessage('');
    setNearbyUrl('');
    setGeoBusy(true);
    readNearbyStopsUrl()
      .then((url) => setNearbyUrl(url))
      .catch((error) => setGeoMessage(error.message))
      .finally(() => setGeoBusy(false));
  }

  const result = useMemo(
    () =>
      searchReturns(developments, criteria.place, {
        service: criteria.service,
        time: criteria.time,
        windowMinutes: criteria.windowMinutes,
      }),
    [criteria, developments],
  );

  const isDirty =
    form.place !== criteria.place ||
    form.service !== criteria.service ||
    form.time !== criteria.time ||
    form.windowMinutes !== criteria.windowMinutes;

  function updateForm(changes) {
    setForm((current) => ({ ...current, ...changes }));
  }

  function runSearch(changes = {}) {
    const next = { ...form, ...changes };
    setForm(next);
    setCriteria(next);
    setSearching(true);
  }

  useEffect(() => {
    if (!searching) return undefined;
    const timer = setTimeout(() => setSearching(false), SEARCH_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [criteria, searching]);

  // "Adesso" vale solo se l'orario cercato e' ancora il minuto corrente.
  const waitAnchor = { anchor: criteria.time, anchorIsNow: criteria.time === clockFromNow(0) };
  const nextUpcoming = result.upcoming[0];
  const otherServices = Object.entries(result.passagesByService).filter(
    ([service, count]) => service !== result.service && count > 0,
  );

  function renderEmptyState() {
    if (!criteria.place) {
      return <p className="result-message">Scegli il posto cambio da cui parti, poi premi Trova rientri.</p>;
    }

    if (result.isDepot) {
      return <p className="result-message">Sei gia al deposito Gerbido: nessun rientro da cercare.</p>;
    }

    const placeLabel = criteria.place;

    if (!result.placeKnown) {
      return (
        <p className="result-message">
          Negli orari caricati non c&apos;e nessuna corsa che passa da {placeLabel}. Controlla di aver caricato il PDF
          degli orari giusto, oppure scegli un altro posto cambio.
        </p>
      );
    }

    if (!result.passages && otherServices.length) {
      return (
        <p className="result-message">
          Da {placeLabel} gli orari caricati hanno corse solo per il servizio{' '}
          {otherServices.map(([service]) => SERVICE_LABELS[service] || service).join(' e ')}, non per il servizio{' '}
          {SERVICE_LABELS[result.service] || result.service}. Cambia il campo Servizio e riprova.
        </p>
      );
    }

    // Il riepilogo sopra ha gia' detto posto, orario e finestra, e l'elenco
    // qui sotto dice quando passano i prossimi: qui non serve altro.
    if (nextUpcoming) return null;

    if (!result.passages) {
      return (
        <p className="result-message">
          Dopo le {criteria.time} non parte nessuna corsa da {placeLabel}. Sposta l&apos;orario di passaggio o scegli un
          altro posto cambio.
        </p>
      );
    }

    const passages = result.passages === 1 ? 'passa 1 mezzo' : `passano ${result.passages} mezzi`;

    // Distinguere i due casi conta: uno dice che di qui al deposito non ci si
    // va, l'altro che ci si va ma facendo mezzo giro di linea.
    if (result.longRides) {
      return (
        <p className="result-message">
          Da {placeLabel} {passages} dopo le {criteria.time}:{' '}
          {result.longRides === 1
            ? 'uno arriva al Gerbido ma dopo '
            : `${result.longRides} arrivano al Gerbido ma dopo `}
          {result.shortestLongRide ? formatMinutes(result.shortestLongRide) : `piu di ${MAX_RIDE_MINUTES} minuti`} di
          viaggio, {result.longRides === 1 ? 'e un giro di linea' : 'sono giri di linea'}, non un rientro.
        </p>
      );
    }

    return (
      <p className="result-message">
        Da {placeLabel} {passages} dopo le {criteria.time}, ma nessuno arriva al Gerbido: prova un altro posto cambio.
      </p>
    );
  }

  return (
    <section className="depot-returns-panel dc" aria-labelledby="depot-returns-title">
      <div className="depot-returns-panel__header">
        <span className="section-kicker">
          <Icon name="dockReturns" size={22} />
          Rientri deposito
        </span>
        <h2 id="depot-returns-title">Come rientro al Gerbido</h2>
        <p>
          Mezzi che transitano dal posto cambio nei minuti successivi all&apos;orario indicato e proseguono fino al
          Gerbido, anche quando il deposito non e il capolinea della corsa.
        </p>
      </div>

      <form
        className="depot-returns-form"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch();
        }}
      >
        <div className="depot-returns-controls">
          <label>
            <span>Posto cambio</span>
            <select onChange={(event) => updateForm({ place: event.target.value })} value={form.place}>
              <option value="">Seleziona…</option>
              {inTimetable.length ? (
                <optgroup label="Presenti negli orari caricati">
                  {inTimetable.map((code) => (
                    <option key={code} value={code}>
                      {(code) === code ? code : `${code} · ${(code)}`}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {others.length ? (
                <optgroup label="Senza corse negli orari caricati">
                  {others.map((code) => (
                    <option key={code} value={code}>
                      {(code) === code ? code : `${code} · ${(code)}`}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>
          <label>
            <span>Passo di qui alle</span>
            <input
              aria-label="Orario di passaggio dal posto cambio"
              onChange={(event) => updateForm({ time: event.target.value })}
              type="time"
              value={form.time}
            />
          </label>
          <label>
            <span>Entro</span>
            <select
              onChange={(event) => updateForm({ windowMinutes: Number(event.target.value) })}
              value={form.windowMinutes}
            >
              {WINDOW_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatWindow(minutes)}
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

        <div className="depot-returns-actions">
          <button className="depot-returns-search" type="submit">
            <Icon name="search" size={18} />
            Trova rientri
          </button>
          {nearbyUrl ? (
            <a
              className="small-button depot-returns-nearby-link"
              href={nearbyUrl}
              onClick={() => setNearbyUrl('')}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon name="mapPin" size={18} />
              Apri la mappa delle fermate
            </a>
          ) : (
            <button
              className="small-button"
              disabled={geoBusy}
              onClick={findNearbyStops}
              title="Trova le fermate intorno a dove sei adesso, per vedere quali linee ci passano"
              type="button"
            >
              <Icon name="mapPin" size={18} />
              {geoBusy ? 'Leggo la posizione…' : 'Cosa passa qui vicino'}
            </button>
          )}
        </div>

        <div className="depot-returns-quick">
          <button onClick={() => runSearch({ time: clockFromNow(0) })} type="button">
            Adesso
          </button>
          <button onClick={() => runSearch({ time: clockFromNow(15) })} type="button">
            Tra 15 min
          </button>
          <button onClick={() => runSearch({ time: clockFromNow(30) })} type="button">
            Tra 30 min
          </button>
        </div>
      </form>

      {searching ? (
        <div className="depot-returns-progress" role="status">
          <span className="depot-returns-progress__track">
            <span className="depot-returns-progress__bar" />
          </span>
          <span className="depot-returns-progress__label">
            Cerco le linee che passano da {criteria.place || 'qui'} e proseguono fino al Gerbido…
          </span>
        </div>
      ) : null}

      {geoMessage ? <p className="depot-returns-message">{geoMessage}</p> : null}

      {!searching && isDirty ? (
        <p className="depot-returns-message">Criteri cambiati: premi Trova rientri per aggiornare.</p>
      ) : null}
      {!searching && criteria.place && !result.isDepot ? (
        <p className="depot-returns-summary">
          {result.matches.length
            ? `${result.matches.length} ${result.matches.length === 1 ? 'rientro' : 'rientri'} da ${criteria.place}`
            : `Nessun rientro da ${criteria.place}`}{' '}
          · passaggio alle {criteria.time} · entro {formatWindow(criteria.windowMinutes)} · servizio{' '}
          {SERVICE_LABELS[result.service] || result.service}
        </p>
      ) : null}

      <div className="depot-returns-results" aria-live="polite">
        {searching ? null : result.matches.length ? (
          result.matches.map((item) => (
              <article
                className="depot-return-card"
                key={`${item.line}-${item.shift}-${item.departure}-${item.vehicleShift}`}
              >
                <div>
                  <strong>Linea {getLineDisplayName(item.line)}</strong>
                  <span>{item.direct ? 'Diretto in deposito' : `${item.legs.length} tratti`}</span>
                </div>
                <div>
                  <strong>
                    {item.departure} → {item.arrival}
                  </strong>
                  <span>{item.route}</span>
                </div>
                <div>
                  <strong>{formatWait(item.waitMinutes, waitAnchor)}</strong>
                  <span>
                    {item.rideMinutes} min di viaggio
                    {item.vehicleShift ? ` · vettura ${item.vehicleShift}` : ''}
                  </span>
                </div>
            </article>
          ))
        ) : (
          renderEmptyState()
        )}
      </div>

      {!searching && result.upcoming.length ? (
        <div className="depot-returns-upcoming">
          <h3>{result.matches.length ? 'Rientri successivi' : 'Prossimi rientri'}</h3>
          <ul>
            {result.upcoming.slice(0, UPCOMING_LIMIT).map((item) => (
              <li key={`${item.line}-${item.shift}-${item.departure}-${item.vehicleShift}`}>
                <strong>Linea {getLineDisplayName(item.line)}</strong>
                <span>
                  {item.departure} → {item.arrival}
                </span>
                <span>
                  {formatWait(item.waitMinutes, waitAnchor)} · {item.direct ? 'diretto in deposito' : `${item.legs.length} tratti`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
