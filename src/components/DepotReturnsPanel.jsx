import { useMemo, useState } from 'react';
import { CHANGE_POINTS, getChangePointLabel } from '../constants/changePoints.js';
import { getLineDisplayName } from '../constants/depotGerbido.js';
import {
  buildReturnMatches,
  DEPOT_CODE,
  formatClock,
  normalizePlace,
  RETURN_WINDOW_MINUTES,
} from '../utils/depotReturns.js';
import { Icon } from './Icon.jsx';

const GEO_MAX_DISTANCE_METERS = 900;

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

function findNearestChangePoint(position) {
  const current = { lat: position.coords.latitude, lng: position.coords.longitude };
  return Object.entries(CHANGE_POINTS)
    .map(([code, item]) => {
      if (!item.coordinates) return null;
      return {
        code,
        distance: haversineMeters(current, item.coordinates),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)[0];
}

function getAvailableChangePoints(developments = {}) {
  const codes = new Set(Object.keys(CHANGE_POINTS));
  Object.values(developments).forEach((segments) => {
    if (!Array.isArray(segments)) return;
    segments.forEach((segment) => {
      if (normalizePlace(segment.loc_s)) codes.add(normalizePlace(segment.loc_s));
      if (normalizePlace(segment.loc_e)) codes.add(normalizePlace(segment.loc_e));
    });
  });
  return [...codes].sort((a, b) => getChangePointLabel(a).localeCompare(getChangePointLabel(b), 'it'));
}

function formatWait(waitMinutes) {
  if (waitMinutes <= 0) return 'in transito ora';
  if (waitMinutes === 1) return 'tra 1 minuto';
  return `tra ${waitMinutes} minuti`;
}

export function DepotReturnsPanel({ developments = {} }) {
  const changePoints = useMemo(() => getAvailableChangePoints(developments), [developments]);
  const [selectedPlace, setSelectedPlace] = useState(() => changePoints.find((code) => code !== DEPOT_CODE) || '');
  const [passageTime, setPassageTime] = useState(() => clockFromNow(0));
  const [geoMessage, setGeoMessage] = useState('');
  const matches = useMemo(
    () => buildReturnMatches(developments, selectedPlace, { time: passageTime }),
    [developments, passageTime, selectedPlace],
  );

  function useCurrentPosition() {
    setGeoMessage('');
    if (!navigator.geolocation) {
      setGeoMessage('Geolocalizzazione non disponibile su questo dispositivo.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = findNearestChangePoint(position);
        if (!nearest || nearest.distance > GEO_MAX_DISTANCE_METERS) {
          setGeoMessage('Posizione rilevata, ma nessun posto cambio censito vicino. Selezionalo manualmente.');
          return;
        }
        setSelectedPlace(nearest.code);
        setGeoMessage(`Posto cambio rilevato: ${getChangePointLabel(nearest.code)} (${Math.round(nearest.distance)} m).`);
      },
      () => setGeoMessage('Permesso posizione negato o posizione non disponibile. Seleziona il posto cambio manualmente.'),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 9000 },
    );
  }

  const isDepotSelected = selectedPlace === DEPOT_CODE;

  return (
    <section className="depot-returns-panel dc" aria-labelledby="depot-returns-title">
      <div className="depot-returns-panel__header">
        <span className="section-kicker">
          <Icon name="dockReturns" size={22} />
          Rientri deposito
        </span>
        <h2 id="depot-returns-title">Come rientro al Gerbido</h2>
        <p>
          Mezzi che transitano dal posto cambio nei {RETURN_WINDOW_MINUTES} minuti successivi all&apos;orario indicato e
          proseguono fino al Gerbido, anche quando il deposito non e il capolinea della corsa.
        </p>
      </div>

      <div className="depot-returns-controls">
        <button className="small-button" onClick={useCurrentPosition} type="button">
          <Icon name="mapPin" size={18} />
          Usa posizione
        </button>
        <label>
          <span>Posto cambio</span>
          <select onChange={(event) => setSelectedPlace(event.target.value)} value={selectedPlace}>
            {changePoints.map((code) => (
              <option key={code} value={code}>
                {code} · {getChangePointLabel(code)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Passo di qui alle</span>
          <input
            aria-label="Orario di passaggio dal posto cambio"
            onChange={(event) => setPassageTime(event.target.value)}
            type="time"
            value={passageTime}
          />
        </label>
      </div>

      <div className="depot-returns-quick">
        <button onClick={() => setPassageTime(clockFromNow(0))} type="button">
          Adesso
        </button>
        <button onClick={() => setPassageTime(clockFromNow(15))} type="button">
          Tra 15 min
        </button>
        <button onClick={() => setPassageTime(clockFromNow(30))} type="button">
          Tra 30 min
        </button>
      </div>

      {geoMessage ? <p className="depot-returns-message">{geoMessage}</p> : null}

      <div className="depot-returns-results" aria-live="polite">
        {isDepotSelected ? (
          <p className="result-message">Sei gia al deposito Gerbido: nessun rientro da cercare.</p>
        ) : matches.length ? (
          matches.map((item) => (
            <article className="depot-return-card" key={`${item.line}-${item.shift}-${item.departure}-${item.vehicleShift}`}>
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
          <p className="result-message">
            Nessun mezzo diretto al Gerbido da {selectedPlace || 'questo posto'} tra le {passageTime} e i{' '}
            {RETURN_WINDOW_MINUTES} minuti successivi. Prova a spostare avanti l&apos;orario di passaggio.
          </p>
        )}
      </div>
    </section>
  );
}
