import { useEffect, useMemo, useState } from 'react';
import { getLineDisplayName } from '../constants/depotGerbido.js';
import {
  ANY_PLACE,
  formatClock,
  MAX_RIDE_MINUTES,
  RETURN_WINDOW_MINUTES,
  searchReturns,
  withDistance,
} from '../utils/depotReturns.js';
import {
  readChangePointDirectionsUrl,
  readDepotDirectionsUrl,
  readDepotMapsDirectionsUrl,
  readMoovitWebUrl,
  readNearbyStopsUrl,
  readPosition,
} from '../utils/nearbyStops.js';
import { getChangePointLabel, getChangePointStop } from '../constants/changePoints.js';
import { formatMinutes } from '../utils/timeUtils.js';
import { Icon } from './Icon.jsx';

// La ricerca e' istantanea: la barra resta visibile il minimo che basta a
// vedere che qualcosa e' partito, altrimenti premere Trova sembra inutile.
const SEARCH_FEEDBACK_MS = 520;

const UPCOMING_LIMIT = 5;

// Oltre questo si smette di aspettare il GPS e si dice che la posizione non c'e'.
const GEO_DEADLINE_MS = 12000;

// Il deposito e' sempre lo stesso: sulle schede basta il nome corto.
const DEPOT_LABEL = 'Gerbido';

const WINDOW_OPTIONS = [30, 60, 90, 120];

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

/**
 * Quanto dista il posto da cui parte, e se ci si arriva prima che passi. Senza
 * posizione non si dice niente: e' l'unica risposta onesta quando il GPS tace o
 * quel capolinea non ha una palina da cui ricavarne il punto.
 */
function formatDistance(item) {
  if (!Number.isFinite(item.meters)) return '';
  const distanza = item.meters >= 1000 ? `${(item.meters / 1000).toFixed(1)} km` : `${item.meters} m`;
  if (item.reachable === false) return `a ${distanza}, ${item.walkMinutes} min a piedi: non ci arrivi`;
  return `a ${distanza} · ${item.walkMinutes} min a piedi`;
}

function formatWindow(windowMinutes) {
  if (windowMinutes < 60) return `${windowMinutes} minuti`;
  const hours = windowMinutes / 60;
  return hours === 1 ? '1 ora' : `${hours} ore`;
}

export function DepotReturnsPanel({ developments = {}, places = {}, staleParse = false }) {
  /* I codici di quattro lettere sono roba interna al documento: GORX e NEGR
     non li ha mai sentiti nessuno. La legenda degli Orari li traduce nel posto
     vero, e quando manca resta la tabella dei posti cambio raccolta a mano. */
  function placeLabel(code) {
    return places?.[String(code || '').toUpperCase()]?.label || getChangePointLabel(code);
  }

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
  /* Dove si e' adesso, per misurare quanto dista ogni rientro. Si legge insieme
     alla ricerca e non la blocca: se il GPS tace i rientri escono lo stesso. */
  const [here, setHere] = useState(null);
  /* Che fine ha fatto la lettura della posizione. Il solo risultato non basta a
     raccontarlo: senza uno stato, un GPS che non risponde e un GPS mai chiesto
     si vedono uguali, cioe' non si vedono. */
  const [geoState, setGeoState] = useState('idle');

  // Due link diversi, uno solo alla volta: le fermate intorno, oppure il
  // percorso in mezzi fino al deposito calcolato sulla rete GTT vera.
  function openWithPosition(reader, kind) {
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
    setGeoState('reading');

    /* Il GPS puo' anche non rispondere mai: sul telefono capita al chiuso e
       quando il permesso resta in sospeso. Senza una scadenza nostra il
       pannello direbbe "cerco dove sei" per sempre, che e' peggio di dire che
       la posizione non c'e'. */
    let settled = false;
    const giveUp = setTimeout(() => {
      if (settled) return;
      settled = true;
      setHere(null);
      setGeoState('off');
    }, GEO_DEADLINE_MS);

    readPosition()
      .then((position) => {
        if (settled) return;
        settled = true;
        clearTimeout(giveUp);
        setHere(position);
        setGeoState('ok');
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(giveUp);
        setHere(null);
        setGeoState('off');
      });
  }

  useEffect(() => {
    if (!searching) return undefined;
    const timer = setTimeout(() => setSearching(false), SEARCH_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [criteria, searching]);

  // Le linee che stanno rientrando, in ordine di arrivo: e' la risposta corta
  // alla domanda "quale linea prendo per tornare al Gerbido".
  /* Prima chi si fa in tempo a prendere, e fra quelli chi porta in deposito
     prima. Un rientro che parte fra sei minuti da un capolinea a tre chilometri
     non e' un rientro: e' un orario stampato. */
  const matches = useMemo(() => {
    const measured = withDistance(result.matches, here);
    if (!here) return measured;
    return measured.slice().sort((a, b) => {
      if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
      return (a.meters ?? Infinity) - (b.meters ?? Infinity) || a.totalMinutes - b.totalMinutes;
    });
  }, [here, result.matches]);

  const returningLines = [...new Set(matches.map((item) => getLineDisplayName(item.line)))];
  const nextUpcoming = result.upcoming[0];
  const otherServices = Object.entries(result.passagesByService).filter(
    ([service, count]) => service !== result.service && count > 0,
  );

  function renderEmptyState() {
    // I rientri stanno solo sul grafico di servizio. Senza quella pagina non
    // c'e' niente da cercare, e va detto: la pagina dei turni ha le riprese
    // intere, che rientri non sono. Ma prima di dare la colpa al PDF va escluso
    // il caso piu' comune, cioe' che gli Orari in uso siano stati letti da una
    // versione dell'app che il grafico non lo leggeva ancora.
    if (!result.graphicLoaded) {
      if (staleParse) {
        return (
          <p className="result-message">
            Gli orari in uso sono stati letti da una versione precedente dell&apos;app, che non ricavava i rientri.
            Ricarica il PDF degli orari e i rientri compaiono.
          </p>
        );
      }
      return (
        <p className="result-message">
          Negli orari caricati manca il grafico di servizio, la pagina con le ultime corse e gli ingressi in deposito.
          Senza quella i rientri non si possono calcolare: usa Come arrivo al Gerbido qui sotto.
        </p>
      );
    }

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
    // va, l'altro che ci si va ma solo restando su tutta la ripresa. Negli
    // orari una riga e' la ripresa intera di un turno, non la singola corsa:
    // chiamarla "viaggio" faceva sembrare rotto il calcolo.
    if (result.longRides) {
      return (
        <p className="result-message">
          Dopo le {criteria.time} {passages}:{' '}
          {result.longRides === 1 ? 'uno chiude in deposito ' : `${result.longRides} chiudono in deposito `}
          {result.shortestLongRide ? formatMinutes(result.shortestLongRide) : `piu di ${MAX_RIDE_MINUTES} minuti`} dopo
          la presa, {result.longRides === 1 ? "e' una ripresa intera" : 'sono riprese intere'}, non un passaggio verso
          il Gerbido.
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
        <h2 id="depot-returns-title">Cosa mi riporta al Gerbido</h2>
        <p>
          Le corse che passano dopo l&apos;orario indicato e finiscono in deposito. Con la posizione attiva sono in
          ordine di vicinanza, con quanto dista ognuna da dove sei.
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
        </div>

        <div className="depot-returns-actions">
          <button className="depot-returns-search" type="submit">
            <Icon name="mapPin" size={18} />
            {geoState === 'reading' ? 'Leggo la posizione…' : 'Trova rientri da qui'}
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
              onClick={() => openWithPosition(readNearbyStopsUrl, 'stops')}
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
              onClick={() => openWithPosition(readDepotDirectionsUrl, 'depot')}
              title="Linee, orari e cambi per arrivare al deposito da dove sei adesso, nell'app Moovit"
              type="button"
            >
              <Icon name="route" size={18} />
              {geoBusy === 'depot' ? 'Leggo la posizione…' : 'Come arrivo al Gerbido'}
            </button>
          )}
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
        <p className="depot-returns-message">Criteri cambiati: premi Trova rientri da qui per aggiornare.</p>
      ) : null}

      {/* Cosa ha fatto il GPS, detto sempre: e' l'unica cosa che spiega perche'
          un elenco e' ordinato per vicinanza e un altro no. Anche l'attesa va
          detta, perche' il telefono ci mette qualche secondo e nel frattempo
          l'elenco e' gia' li', solo non ancora in ordine di vicinanza. */}
      {!searching && geoState === 'reading' ? (
        <p className="depot-returns-geo depot-returns-geo--off">
          <Icon name="mapPin" size={14} />
          Cerco dove sei…
        </p>
      ) : null}
      {!searching && geoState === 'ok' ? (
        <p className="depot-returns-geo depot-returns-geo--on">
          <Icon name="mapPin" size={14} />
          Posizione trovata: i rientri sono in ordine di vicinanza, dal piu&apos; comodo da raggiungere.
        </p>
      ) : null}
      {!searching && geoState === 'off' ? (
        <p className="depot-returns-geo depot-returns-geo--off">
          <Icon name="mapPin" size={14} />
          Posizione non disponibile: i rientri ci sono lo stesso, ma senza distanza ne&apos; ordine di vicinanza.
        </p>
      ) : null}
      {/* Finestra e servizio scelti stanno gia' nei selettori qui sopra: qui
          basta il conto e l'orario di partenza della ricerca. Il servizio si
          dice solo quando l'ha dedotto l'app al posto di chi cerca. */}
      {!searching ? (
        <p className="depot-returns-summary">
          {matches.length
            ? `${matches.length} ${matches.length === 1 ? 'rientro' : 'rientri'}`
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
        {searching ? null : matches.length ? (
          matches.map((item) => {
            const stop = getChangePointStop(item.from, { line: item.line });
            return (
              <article
                className={`depot-return-card${item.reachable === false ? ' depot-return-card--far' : ''}`}
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
                      {placeLabel(item.from)}
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
                    formatDistance(item),
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
                    Apri il percorso fino a {placeLabel(item.from)}
                  </a>
                ) : (
                  <button
                    className="depot-returns-maps-link"
                    disabled={Boolean(geoBusy)}
                    onClick={() => openWithPosition(() => readChangePointDirectionsUrl(item.from), `to-${item.from}`)}
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

      {!searching && !matches.length ? (
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
              onClick={() => openWithPosition(readDepotDirectionsUrl, 'depot')}
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
              onClick={() => openWithPosition(readDepotMapsDirectionsUrl, 'maps')}
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
              onClick={() => openWithPosition(readMoovitWebUrl, 'moovitWeb')}
              type="button"
            >
              {geoBusy === 'moovitWeb' ? 'Leggo la posizione…' : 'oppure Moovit nel browser'}
            </button>
          )}
        </div>
      ) : null}

      {!searching && result.upcoming.length ? (
        <div className="depot-returns-upcoming">
          <h3>{matches.length ? 'Rientri successivi' : 'Prossimi rientri'}</h3>
          <ul>
            {result.upcoming.slice(0, UPCOMING_LIMIT).map((item) => (
              <li key={`${item.line}-${item.from}-${item.shift}-${item.departure}-${item.vehicleShift}`}>
                <strong>
                  {getLineDisplayName(item.line)}
                  {item.direct ? '' : ` · ${item.legs.length} tratti`}
                </strong>
                <span>
                  {item.departure} da {placeLabel(item.from)}
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
