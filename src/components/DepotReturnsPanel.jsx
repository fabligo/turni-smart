import { useMemo, useState } from 'react';
import { CHANGE_POINTS, getChangePointLabel } from '../constants/changePoints.js';
import { getLineDisplayName } from '../constants/depotGerbido.js';
import { timeToMinutes } from '../utils/timeUtils.js';
import { AssetIcon, Icon } from './Icon.jsx';

const WINDOW_MINUTES = 90;
const GEO_MAX_DISTANCE_METERS = 900;

function normalizePlace(value = '') {
  return String(value || '').trim().toUpperCase();
}

function getShiftParts(key = '') {
  const [line = '', shift = ''] = String(key).split(/\s+/);
  return { line, shift };
}

function getServiceType(value = '') {
  const service = String(value || '').toUpperCase();
  if (service.includes('SAB')) return 'sabato';
  if (service.includes('FEST') || service.includes('DOM')) return 'festivi';
  if (service.includes('LUN') || service.includes('VEN') || service.includes('FERIALE') || service.includes('FERIALI')) return 'feriali';
  return 'feriali';
}

function getTodayServiceType(date = new Date()) {
  const day = date.getDay();
  if (day === 0) return 'festivi';
  if (day === 6) return 'sabato';
  return 'feriali';
}

function minutesFromNow(start, targetMinutes) {
  let startMinutes = timeToMinutes(start);
  if (startMinutes < targetMinutes - 720) startMinutes += 1440;
  return startMinutes - targetMinutes;
}

function formatTargetTime(offsetMinutes) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + offsetMinutes);
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
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

function buildReturnMatches(developments = {}, selectedPlace, offsetMinutes) {
  const place = normalizePlace(selectedPlace);
  if (!place) return [];

  const targetDate = new Date();
  targetDate.setMinutes(targetDate.getMinutes() + offsetMinutes);
  const targetMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const service = getTodayServiceType(targetDate);
  const seen = new Set();
  const matches = [];

  Object.entries(developments).forEach(([key, segments]) => {
    if (!Array.isArray(segments)) return;
    const { line: keyLine, shift } = getShiftParts(key);

    segments.forEach((segment) => {
      if (normalizePlace(segment.loc_s) !== place) return;
      if (normalizePlace(segment.loc_e) !== 'GERB') return;
      if (getServiceType(segment.gt) !== service) return;

      const waitMinutes = minutesFromNow(segment.start, targetMinutes);
      if (waitMinutes < 0 || waitMinutes > WINDOW_MINUTES) return;

      const line = segment.lineaNorm || segment.ln || keyLine;
      const vehicleShift = segment.vett || segment.turnoVettura || '';
      const identity = [key, segment.start, segment.end, segment.loc_s, segment.loc_e, vehicleShift].join('|');
      if (seen.has(identity)) return;
      seen.add(identity);

      matches.push({
        end: segment.end,
        line,
        route: `${segment.loc_s} → ${segment.loc_e}`,
        service,
        shift,
        start: segment.start,
        vehicleShift,
        waitMinutes,
      });
    });
  });

  return matches.sort((a, b) => a.waitMinutes - b.waitMinutes || timeToMinutes(a.start) - timeToMinutes(b.start));
}

export function DepotReturnsPanel({ developments = {} }) {
  const changePoints = useMemo(() => getAvailableChangePoints(developments), [developments]);
  const [selectedPlace, setSelectedPlace] = useState(changePoints[0] || '');
  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const [geoMessage, setGeoMessage] = useState('');
  const matches = useMemo(() => buildReturnMatches(developments, selectedPlace, offsetMinutes), [developments, offsetMinutes, selectedPlace]);

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

  return (
    <section className="depot-returns-panel dc" aria-labelledby="depot-returns-title">
      <div className="depot-returns-panel__header">
        <span className="section-kicker">
          <AssetIcon name="busMark" size={22} />
          Rientri deposito
        </span>
        <h2 id="depot-returns-title">Turni in rientro da qui</h2>
        <p>Controlla gli Orari Linee e mostra i turni che partono dal posto cambio selezionato verso GERB nei prossimi {WINDOW_MINUTES} minuti.</p>
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
          <span>Quando</span>
          <select onChange={(event) => setOffsetMinutes(Number(event.target.value))} value={offsetMinutes}>
            <option value={0}>Adesso ({formatTargetTime(0)})</option>
            <option value={15}>Tra 15 minuti</option>
            <option value={30}>Tra 30 minuti</option>
          </select>
        </label>
      </div>

      {geoMessage ? <p className="depot-returns-message">{geoMessage}</p> : null}

      <div className="depot-returns-results" aria-live="polite">
        {matches.length ? (
          matches.map((item) => (
            <article className="depot-return-card" key={`${item.line}-${item.shift}-${item.start}-${item.vehicleShift}`}>
              <div>
                <strong>Linea {getLineDisplayName(item.line)}</strong>
                <span>Turno {item.shift}</span>
              </div>
              <div>
                <strong>{item.start} → {item.end}</strong>
                <span>{item.route}</span>
              </div>
              <div>
                <strong>{item.waitMinutes === 0 ? 'ora' : `tra ${item.waitMinutes} min`}</strong>
                <span>{item.vehicleShift ? `Turno vettura ${item.vehicleShift}` : 'Turno vettura non indicato'}</span>
              </div>
            </article>
          ))
        ) : (
          <p className="result-message">Nessun rientro in deposito trovato da {selectedPlace || 'questo posto'} nella finestra controllata.</p>
        )}
      </div>
    </section>
  );
}
