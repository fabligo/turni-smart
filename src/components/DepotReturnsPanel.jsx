import { useEffect, useMemo, useState } from 'react';
import { getLineDisplayName } from '../constants/depotGerbido.js';
import {
  ANY_PLACE,
  formatClock,
  MAX_RIDE_MINUTES,
  RETURN_WINDOW_MINUTES,
  searchReturns,
} from '../utils/depotReturns.js';
import {
  readChangePointDirectionsUrl,
  readDepotDirectionsUrl,
  readDepotMapsDirectionsUrl,
  readMoovitWebUrl,
  readNearbyStopsUrl,
} from '../utils/nearbyStops.js';
import { getChangePointLabel, getChangePointStop } from '../constants/changePoints.js';
import { formatMinutes } from '../utils/timeUtils.js';
import { Icon } from './Icon.jsx';

// La ricerca e' istantanea: la barra resta visibile il minimo che basta a
// vedere che qualcosa e' partito, altrimenti premere Trova sembra inutile.
const SEARCH_FEEDBACK_MS = 520;

const UPCOMING_LIMIT = 5;

// Il deposito e' sempre lo stesso: sulle schede basta il nome corto.
const DEPOT_LABEL = 'Gerbido';

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

/**
 * Gli orari di partenza e arrivo sono sempre scritti per esteso: qui serve solo
 * quanto si aspetta, che e' la cosa che quegli orari non dicono. E' un'attesa
 * contata dall'orario cercato, non da adesso, quindi va detta come attesa e non
 * come conto alla rovescia.
 */
function formatSpan(minutes) {
  return minutes >= 60 ? formatMinutes(minutes) : `${minutes} min`;
}

function formatWaitShort(waitMinutes) {
  return waitMinutes <= 0 ? 'in transito' : `attesa ${formatSpan(waitMinutes)}`;
}

function formatWindow(windowMinutes) {
  if (windowMinutes < 60) return `${windowMinutes} minuti`;
  const hours = windowMinutes / 60;
  return hours === 1 ? '1 ora' : `${hours} ore`;
}

export function DepotReturnsPanel({ developments = {} }) {
  const [form, setForm] = useState(() => ({
    service: '',
    time: clockFromNow(0),
    windowMinutes: RETURN_WINDOW_MINUTES,
  }));
  // I criteri confermati restano separati dal form: la ricerca parte quando si
  // preme Trova, non a ogni tasto premuto.
  const [criteria, setCriteria] = useState(form);
  const [searching, setSearching] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');
  const [geoBusy, setGeoBusy] = useState('');
  // Il link si prepara prima e si apre con un tocco a parte: aprire una scheda
  // in attesa del GPS la lascia bianca su iOS.
  const [positionLink, setPositionLink] = useState(null);

  // Due link diversi, uno solo alla volta: le fermate intorno, oppure il
  // percorso in mezzi fino al deposito calcolato sulla rete GTT vera.
  function readPosition(reader, kind) {
    setGeoMessage('');
    setPositionLink(null);
    setGeoBusy(kind);
    reader()
      .then((url) => setPositionLink({ kind, url }))
      .catch((error) => setGeoMessage(error.message))
      .finally(() => setGeoBusy(''));
  }

  const result = useMemo(
    () =>
      // Sempre tutti i posti cambio: il punto di partenza e' dove si e' adesso,
      // non un codice scelto da un elenco.
      searchReturns(developments, ANY_PLACE, {
        service: criteria.service,
        time: criteria.time,
        windowMinutes: criteria.windowMinutes,
      }),
    [criteria, developments],
  );

  const isDirty =
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

  // Le linee che stanno rientrando, in ordine di arrivo: e' la risposta corta
  // alla domanda "quale linea prendo per tornare al Gerbido".
  const returningLines = [...new Set(result.matches.map((item) => getLineDisplayName(item.line)))];
  const nextUpcoming = result.upcoming[0];
  const otherServices = Object.entries(result.passagesByService).filter(
    ([service, count]) => service !== result.service && count > 0,
  );

  function renderEmptyState() {
    if (!result.placeKnown) {
      return (
        <p className="result-message">
          Negli orari caricati non c&apos;e nessuna corsa. Controlla di aver caricato il PDF degli orari giusto.
        </p>
      );
    }

    if (!result.passages && otherServices.length) {
      return (
        <div className="result-message">
          <p>
            Gli orari caricati hanno corse solo per il servizio{' '}
            {otherServices.map(([service]) => SERVICE_LABELS[service] || service).join(' e ')}, non per il servizio{' '}
            {SERVICE_LABELS[result.service] || result.service}.
          </p>
          <div className="depot-returns-quick">
            {otherServices.map(([service]) => (
              <button key={service} onClick={() => runSearch({ service })} type="button">
                Cerca nel servizio {SERVICE_LABELS[service] || service}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Il riepilogo sopra ha gia' detto posto, orario e finestra, e l'elenco
    // qui sotto dice quando passano i prossimi: qui non serve altro.
    if (nextUpcoming) return null;

    if (!result.passages) {
      return (
        <p className="result-message">Dopo le {criteria.time} non parte nessuna corsa. Sposta l&apos;orario.</p>
      );
    }

    const passages = result.passages === 1 ? 'passa 1 mezzo' : `passano ${result.passages} mezzi`;

    // Distinguere i due casi conta: uno dice che di qui al deposito non ci si
    // va, l'altro che ci si va ma facendo mezzo giro di linea.
    if (result.longRides) {
      return (
        <p className="result-message">
          Dopo le {criteria.time} {passages}:{' '}
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
        Dopo le {criteria.time} {passages}, ma nessuno arriva al Gerbido.
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
          Le corse di servizio che rientrano al Gerbido dopo l&apos;orario indicato, da qualsiasi posto cambio, con la
          palina da cui partono.
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
            <span>Fine servizio alle</span>
            <input
              aria-label="Orario da cui cercare i rientri"
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
          {positionLink?.kind === 'stops' ? (
            <a
              className="small-button depot-returns-nearby-link"
              href={positionLink.url}
              onClick={() => setPositionLink(null)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon name="mapPin" size={18} />
              Apri la mappa delle fermate
            </a>
          ) : (
            <button
              className="small-button"
              disabled={Boolean(geoBusy)}
              onClick={() => readPosition(readNearbyStopsUrl, 'stops')}
              title="Trova le fermate intorno a dove sei adesso, per vedere quali linee ci passano"
              type="button"
            >
              <Icon name="mapPin" size={18} />
              {geoBusy === 'stops' ? 'Leggo la posizione…' : 'Cosa passa qui vicino'}
            </button>
          )}
          {positionLink?.kind === 'depot' ? (
            <a
              className="small-button depot-returns-nearby-link"
              href={positionLink.url}
              onClick={() => setPositionLink(null)}
              rel="noopener noreferrer"
            >
              <Icon name="route" size={18} />
              Apri il percorso nell&apos;app Moovit
            </a>
          ) : (
            <button
              className="small-button"
              disabled={Boolean(geoBusy)}
              onClick={() => readPosition(readDepotDirectionsUrl, 'depot')}
              title="Linee, orari e cambi per arrivare al deposito da dove sei adesso, nell'app Moovit"
              type="button"
            >
              <Icon name="route" size={18} />
              {geoBusy === 'depot' ? 'Leggo la posizione…' : 'Come arrivo al Gerbido'}
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
            Cerco le corse che rientrano al Gerbido…
          </span>
        </div>
      ) : null}

      {geoMessage ? <p className="depot-returns-message">{geoMessage}</p> : null}

      {!searching && isDirty ? (
        <p className="depot-returns-message">Criteri cambiati: premi Trova rientri per aggiornare.</p>
      ) : null}
      {/* Finestra e servizio scelti stanno gia' nei selettori qui sopra: qui
          basta il conto e l'orario di partenza della ricerca. Il servizio si
          dice solo quando l'ha dedotto l'app al posto di chi cerca. */}
      {!searching ? (
        <p className="depot-returns-summary">
          {result.matches.length
            ? `${result.matches.length} ${result.matches.length === 1 ? 'rientro' : 'rientri'}`
            : 'Nessun rientro'}{' '}
          dalle {criteria.time}
          {criteria.service ? '' : ` · servizio ${SERVICE_LABELS[result.service] || result.service}`}
        </p>
      ) : null}

      {/* Con una sola linea le pillole ripeterebbero la scheda qui sotto. */}
      {!searching && returningLines.length > 1 ? (
        <p className="depot-returns-lines">
          <span>Linee in rientro</span>
          {returningLines.map((line) => (
            <strong key={line}>{line}</strong>
          ))}
        </p>
      ) : null}

      <div className="depot-returns-results" aria-live="polite">
        {searching ? null : result.matches.length ? (
          result.matches.map((item) => {
            const stop = getChangePointStop(item.from, { line: item.line });
            return (
              <article
                className="depot-return-card"
                key={`${item.line}-${item.from}-${item.shift}-${item.departure}-${item.vehicleShift}`}
              >
                <p className="depot-return-card__head" title={item.route}>
                  <strong>{getLineDisplayName(item.line)}</strong>
                  {item.direct ? 'diretto' : `${item.legs.length} tratti`}
                </p>
                {/* I due orari sono l'uno il passaggio alla palina dove si sale
                    e l'altro l'arrivo in deposito: senza scriverlo sotto
                    ciascuno, il primo si legge come partenza dal capolinea. */}
                <p className="depot-return-card__times">
                  <span className="depot-return-card__stop">
                    <strong>{item.departure}</strong>
                    <small>
                      {stop ? `palina ${stop} · ` : ''}
                      {getChangePointLabel(item.from)}
                    </small>
                  </span>
                  <i aria-hidden="true">→</i>
                  <span className="depot-return-card__stop">
                    <strong>{item.arrival}</strong>
                    <small>{DEPOT_LABEL}</small>
                  </span>
                </p>
                <p className="depot-return-card__meta">
                  {[
                    formatWaitShort(item.waitMinutes),
                    // Su un rientro a piu' tratti dentro ci sta anche il
                    // recupero a capolinea fra un tratto e l'altro: e' tempo
                    // passato sul mezzo, non viaggio.
                    `a bordo ${formatSpan(item.rideMinutes)}`,
                    item.vehicleShift ? `vettura ${item.vehicleShift}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {positionLink?.kind === `to-${item.from}` ? (
                  <a
                    className="depot-returns-maps-link"
                    href={positionLink.url}
                    onClick={() => setPositionLink(null)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Apri il percorso fino a {getChangePointLabel(item.from)}
                  </a>
                ) : (
                  <button
                    className="depot-returns-maps-link"
                    disabled={Boolean(geoBusy)}
                    onClick={() => readPosition(() => readChangePointDirectionsUrl(item.from), `to-${item.from}`)}
                    type="button"
                  >
                    {geoBusy === `to-${item.from}` ? 'Leggo la posizione…' : 'ci arrivo in tempo?'}
                  </button>
                )}
              </article>
            );
          })
        ) : (
          renderEmptyState()
        )}
      </div>

      {!searching && !result.matches.length ? (
        <div className="depot-returns-fallback">
          <p>
            Nessun mezzo di servizio ti riporta in deposito adesso. Moovit parte da dove sei, prende la fermata piu
            vicina e ti da linee, orari di passaggio e cambi fino al Gerbido.
          </p>
          {positionLink?.kind === 'depot' ? (
            <a
              className="depot-returns-search"
              href={positionLink.url}
              onClick={() => setPositionLink(null)}
              rel="noopener noreferrer"
            >
              <Icon name="route" size={18} />
              Apri il percorso nell&apos;app Moovit
            </a>
          ) : (
            <button
              className="depot-returns-search"
              disabled={Boolean(geoBusy)}
              onClick={() => readPosition(readDepotDirectionsUrl, 'depot')}
              type="button"
            >
              <Icon name="route" size={18} />
              {geoBusy === 'depot' ? 'Leggo la posizione…' : 'Come arrivo al Gerbido da qui'}
            </button>
          )}
          {/* Riserva: se Moovit non risponde come deve, la mappa fa lo stesso. */}
          {positionLink?.kind === 'maps' ? (
            <a
              className="depot-returns-maps-link"
              href={positionLink.url}
              onClick={() => setPositionLink(null)}
              rel="noopener noreferrer"
              target="_blank"
            >
              Apri lo stesso percorso su Google Maps
            </a>
          ) : (
            <button
              className="depot-returns-maps-link"
              disabled={Boolean(geoBusy)}
              onClick={() => readPosition(readDepotMapsDirectionsUrl, 'maps')}
              type="button"
            >
              {geoBusy === 'maps' ? 'Leggo la posizione…' : 'oppure con Google Maps'}
            </button>
          )}
          {positionLink?.kind === 'moovitWeb' ? (
            <a
              className="depot-returns-maps-link"
              href={positionLink.url}
              onClick={() => setPositionLink(null)}
              rel="noopener noreferrer"
              target="_blank"
            >
              Apri Moovit nel browser
            </a>
          ) : (
            <button
              className="depot-returns-maps-link"
              disabled={Boolean(geoBusy)}
              onClick={() => readPosition(readMoovitWebUrl, 'moovitWeb')}
              type="button"
            >
              {geoBusy === 'moovitWeb' ? 'Leggo la posizione…' : 'oppure Moovit nel browser'}
            </button>
          )}
        </div>
      ) : null}

      {!searching && result.upcoming.length ? (
        <div className="depot-returns-upcoming">
          <h3>{result.matches.length ? 'Rientri successivi' : 'Prossimi rientri'}</h3>
          <ul>
            {result.upcoming.slice(0, UPCOMING_LIMIT).map((item) => (
              <li key={`${item.line}-${item.from}-${item.shift}-${item.departure}-${item.vehicleShift}`}>
                <strong>
                  {getLineDisplayName(item.line)}
                  {item.direct ? '' : ` · ${item.legs.length} tratti`}
                </strong>
                <span>
                  {item.departure} da {getChangePointLabel(item.from)}
                </span>
                <span>
                  {item.arrival} al {DEPOT_LABEL}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
