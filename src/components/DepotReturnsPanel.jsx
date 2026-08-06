import { useEffect, useMemo, useState } from 'react';
import { CHANGE_POINTS, getChangePointLabel } from '../constants/changePoints.js';
import { getLineDisplayName } from '../constants/depotGerbido.js';
import {
  DEPOT_CODE,
  formatClock,
  normalizePlace,
  RETURN_WINDOW_MINUTES,
  searchReturns,
} from '../utils/depotReturns.js';
import {
  clearChangePointPosition,
  listLocatedChangePoints,
  loadSavedPositions,
  saveChangePointPosition,
} from '../utils/changePointPositions.js';
import { formatMinutes } from '../utils/timeUtils.js';
import { Icon } from './Icon.jsx';

const GEO_MAX_DISTANCE_METERS = 900;

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

function haversineMeters(a, b) {
  const radius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function findNearestChangePoint(current, savedPositions) {
  return listLocatedChangePoints(savedPositions)
    .map(({ code, coordinates }) => ({ code, distance: haversineMeters(current, coordinates) }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function sortByLabel(codes) {
  return [...codes].sort((a, b) => getChangePointLabel(a).localeCompare(getChangePointLabel(b), 'it'));
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
  return { inTimetable: sortByLabel(inTimetable), others: sortByLabel(others) };
}

function formatWait(waitMinutes) {
  if (waitMinutes <= 0) return 'in transito ora';
  if (waitMinutes === 1) return 'tra 1 minuto';
  // Sui rientri lontani "tra 154 minuti" non dice niente: meglio ore e minuti.
  if (waitMinutes >= 60) return `tra ${formatMinutes(waitMinutes)}`;
  return `tra ${waitMinutes} minuti`;
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
  const [geoMessage, setGeoMessage] = useState('');
  const [searching, setSearching] = useState(false);
  // Le posizioni registrate sul posto col GPS: sostituiscono quelle di serie,
  // che sono solo approssimative.
  const [savedPositions, setSavedPositions] = useState(() => loadSavedPositions());

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

  // Sempre una lettura fresca: una posizione in cache registrerebbe il posto
  // cambio dove eravamo mezzo minuto fa, cioe' altrove.
  function readPosition(onPosition) {
    if (!navigator.geolocation) {
      setGeoMessage('Geolocalizzazione non disponibile su questo dispositivo.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        onPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      () => setGeoMessage('Permesso posizione negato o posizione non disponibile. Seleziona il posto cambio manualmente.'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
    );
  }

  function useCurrentPosition() {
    setGeoMessage('Leggo la posizione…');
    readPosition((current) => {
      const nearest = findNearestChangePoint(current, savedPositions);
      if (!nearest || nearest.distance > GEO_MAX_DISTANCE_METERS) {
        setGeoMessage('Posizione rilevata, ma nessun posto cambio noto qui vicino. Scegli quale sei e registralo.');
        return;
      }
      runSearch({ place: nearest.code });
      setGeoMessage(`Posto cambio rilevato: ${getChangePointLabel(nearest.code)} (${Math.round(nearest.distance)} m).`);
    });
  }

  function storeCurrentPosition() {
    if (!form.place) return;
    setGeoMessage(`Leggo la posizione da registrare per ${getChangePointLabel(form.place)}…`);
    readPosition((current) => {
      setSavedPositions(saveChangePointPosition(form.place, current));
      const accuracy = Math.round(Number(current.accuracy));
      const precision = Number.isFinite(accuracy) ? ` con precisione ${accuracy} m` : '';
      const retry = Number.isFinite(accuracy) && accuracy > 150 ? ' Precisione bassa: se puoi ripeti all’aperto.' : '';
      setGeoMessage(
        `Posizione registrata per ${getChangePointLabel(form.place)}${precision}: da ora viene riconosciuto qui.${retry}`,
      );
    });
  }

  function forgetStoredPosition() {
    if (!form.place) return;
    setSavedPositions(clearChangePointPosition(form.place, undefined));
    setGeoMessage(`Posizione registrata rimossa per ${getChangePointLabel(form.place)}.`);
  }

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

    const placeLabel = getChangePointLabel(criteria.place);

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

    // Il dettaglio dei rientri successivi lo elenca la lista qui sotto.
    if (nextUpcoming) {
      return (
        <p className="result-message">
          Nessun rientro da {placeLabel} nei {formatWindow(criteria.windowMinutes)} dopo le {criteria.time}: i prossimi
          non passano prima delle {nextUpcoming.departure}.
        </p>
      );
    }

    if (!result.passages) {
      return (
        <p className="result-message">
          Dopo le {criteria.time} negli orari caricati non parte nessuna corsa da {placeLabel}. Sposta l&apos;orario di
          passaggio o scegli un altro posto cambio.
        </p>
      );
    }

    return (
      <p className="result-message">
        Nessun mezzo diretto al Gerbido da {placeLabel} dopo le {criteria.time}. Da qui{' '}
        {result.passages === 1 ? 'passa 1 mezzo' : `passano ${result.passages} mezzi`}, ma nessuno prosegue fino al
        deposito: prova un altro posto cambio.
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
                      {code} · {getChangePointLabel(code)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {others.length ? (
                <optgroup label="Senza corse negli orari caricati">
                  {others.map((code) => (
                    <option key={code} value={code}>
                      {code} · {getChangePointLabel(code)}
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
          <button className="small-button" onClick={useCurrentPosition} type="button">
            <Icon name="mapPin" size={18} />
            Usa posizione
          </button>
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
            Cerco le linee che passano da {getChangePointLabel(criteria.place) || 'qui'} e proseguono fino al Gerbido…
          </span>
        </div>
      ) : null}

      {!searching && isDirty ? (
        <p className="depot-returns-message">Criteri cambiati: premi Trova rientri per aggiornare.</p>
      ) : null}
      {geoMessage ? <p className="depot-returns-message">{geoMessage}</p> : null}

      {form.place ? (
        <div className="depot-returns-geo-save">
          <button onClick={storeCurrentPosition} type="button">
            <Icon name="mapPin" size={16} />
            Sono a {getChangePointLabel(form.place)}: registra qui
          </button>
          {savedPositions[form.place] ? (
            <button className="depot-returns-geo-forget" onClick={forgetStoredPosition} type="button">
              Cancella posizione registrata
            </button>
          ) : null}
        </div>
      ) : null}

      {!searching && criteria.place && !result.isDepot ? (
        <p className="depot-returns-summary">
          {result.matches.length
            ? `${result.matches.length} ${result.matches.length === 1 ? 'rientro' : 'rientri'} da ${getChangePointLabel(criteria.place)}`
            : `Nessun rientro da ${getChangePointLabel(criteria.place)}`}{' '}
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
                  <strong>{formatWait(item.waitMinutes)}</strong>
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
          <h3>
            {result.matches.length ? 'Rientri successivi' : 'Prossimi rientri utili'} da{' '}
            {getChangePointLabel(criteria.place)}
          </h3>
          <p>
            Le prossime linee che passano di qui e rientrano al Gerbido non passano prima delle{' '}
            {result.upcoming[0].departure}.
          </p>
          <ul>
            {result.upcoming.slice(0, UPCOMING_LIMIT).map((item) => (
              <li key={`${item.line}-${item.shift}-${item.departure}-${item.vehicleShift}`}>
                <strong>Linea {getLineDisplayName(item.line)}</strong>
                <span>
                  {item.departure} → {item.arrival}
                </span>
                <span>
                  {formatWait(item.waitMinutes)} · {item.direct ? 'diretto in deposito' : `${item.legs.length} tratti`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
