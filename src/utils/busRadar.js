import {
  getChangePointLabel,
  getChangePointPosition,
  normalizeChangePoint,
} from '../constants/changePoints.js';
import { getLineDisplayName, normalizeLineCode } from '../constants/depotGerbido.js';

/**
 * BusRadar e' l'altra applicazione di chi usa questa: la mappa dei mezzi GTT in
 * tempo reale, pubblicata su GitHub Pages come questa. Qui dentro non si legge
 * nessun feed e non si chiama nessuna API: si costruisce solo l'indirizzo da
 * dare a BusRadar, che il turno lo mostra con la sua mappa dentro un riquadro.
 */
const BUS_RADAR_BASE_URL = 'https://trailpress.github.io/BusRadar/';

/**
 * Il numero di vettura che l'autista scrive nello sviluppo e' la matricola che
 * il mezzo porta scritta addosso, da una a quattro cifre. E' la stessa chiave
 * che BusRadar chiama `fleetNumber` e mostra come "Vettura 1234": nel feed
 * GTFS-RT di GTT il campo del veicolo porta proprio quel numero.
 */
function parseFleetNumbers(value) {
  if (Array.isArray(value)) {
    return dedupe(value.flatMap((item) => parseFleetNumbers(item)));
  }
  return dedupe(
    String(value ?? '')
      .split(/[\s,;/-]+/)
      .map((part) => part.replace(/\D/g, '').slice(0, 4))
      .filter(Boolean),
  );
}

function dedupe(list) {
  return Array.from(new Set(list)).slice(0, 8);
}

/**
 * Il turno vettura e' il giro che una vettura fa in giornata, e negli orari sta
 * scritto a volte da solo ("6") a volte preceduto dalla linea ("71 6"). Qui
 * serve il numero, perche' la linea la portiamo gia' per conto suo.
 */
export function normalizeVehicleShift(value = '') {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  const [, shift] = normalized.split(/\s+/);
  return shift || normalized;
}

function buildUrl(params, { embedded }) {
  const query = new URLSearchParams();
  /* Il riquadro dentro Turni Smart non ha spazio per la barra di navigazione di
     BusRadar: `embed` glielo dice, e chi apre BusRadar da solo la rivede. */
  if (embedded) query.set('embed', 'turni-smart');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value != null) query.set(key, String(value));
  });
  const search = query.toString();
  return search ? `${BUS_RADAR_BASE_URL}?${search}` : BUS_RADAR_BASE_URL;
}

/**
 * Dove guardare su BusRadar per un tratto di sviluppo turno.
 *
 * Una cosa va detta chiara, perche' decide tutto il resto: **il turno vettura
 * non sta nel feed realtime di GTT**. Il feed porta la matricola del mezzo e la
 * linea, e nel caso di GTT il `tripId` arriva perfino vuoto. Quale vettura stia
 * facendo il turno vettura 6 oggi non lo sa nessuna macchina: lo sa chi e' in
 * deposito, ed e' esattamente il motivo per cui lo sviluppo turno ha la
 * casella delle quattro cifre.
 *
 * Da qui i due casi, e nessuno dei due e' un ripiego dell'altro:
 *
 * - la matricola c'e' → si punta quel mezzo, ed e' il punto esatto;
 * - la matricola non c'e' → si mostra la linea sul posto cambio da cui il
 *   tratto parte, che risponde a "dov'e' adesso la mia linea" ma non dice quale
 *   di quei mezzi sia il tuo. Chi guarda deve saperlo.
 *
 * Senza linea e senza matricola non c'e' niente da puntare, e il bottone non ha
 * ragione di esistere: si ritorna `null`.
 */
export function buildBusRadarTarget({
  direction = '',
  line = '',
  place = '',
  vehicleNumber = '',
  vehicleShift = '',
} = {}) {
  const rawLine = String(line ?? '').trim();
  const lineCode = normalizeLineCode(rawLine) || rawLine;
  const fleetNumbers = parseFleetNumbers(vehicleNumber);
  if (!lineCode && !fleetNumbers.length) return null;

  const placeCode = normalizeChangePoint(place);
  const position = placeCode ? getChangePointPosition(placeCode, { direction, line: lineCode }) : null;
  const lineLabel = lineCode ? getLineDisplayName(lineCode) : '';
  const shift = normalizeVehicleShift(vehicleShift);
  /* Il nome del posto cambio si dice solo se la mappa ci va davvero. Il
     Deposito Gerbido, per dirne uno, una palina non ce l'ha: scrivere "intorno
     al Deposito Gerbido" sopra una mappa inquadrata altrove sarebbe una
     didascalia che smentisce quello che si vede. */
  const placeLabel = position && placeCode ? getChangePointLabel(placeCode) : '';

  const params = {
    linea: lineCode,
    vettura: fleetNumbers.join(','),
    /* Il punto del posto cambio serve solo a inquadrare la mappa quando la
       vettura non si sa: con la matricola in mano BusRadar centra il mezzo, che
       nel frattempo si e' mosso. */
    ...(fleetNumbers.length || !position
      ? {}
      : { lat: position.lat.toFixed(6), lon: position.lng.toFixed(6) }),
  };

  return {
    fleetNumbers,
    hasVehicle: fleetNumbers.length > 0,
    line: lineLabel,
    placeLabel,
    vehicleShift: shift,
    /* L'indirizzo del riquadro e quello del bottone "apri in BusRadar" sono lo
       stesso posto: cambia solo che fuori dal riquadro BusRadar resta intero. */
    url: buildUrl(params, { embedded: true }),
    externalUrl: buildUrl(params, { embedded: false }),
    title: buildTitle({ fleetNumbers, lineLabel, placeLabel, shift }),
  };
}

function buildTitle({ fleetNumbers, lineLabel, placeLabel, shift }) {
  if (fleetNumbers.length) {
    const vehicles = fleetNumbers.join(', ');
    return `Mostra su BusRadar dov'e' adesso la ${fleetNumbers.length > 1 ? 'vetture' : 'vettura'} ${vehicles}`;
  }
  const parts = [`Mostra su BusRadar i mezzi della linea ${lineLabel}`];
  if (placeLabel) parts.push(`intorno a ${placeLabel}`);
  if (shift) parts.push(`(turno vettura ${shift}: la matricola non e' ancora stata scritta)`);
  return parts.join(' ');
}

/**
 * La riga sotto la mappa, che dice cosa si sta guardando davvero. E' la
 * differenza fra "questo e' il tuo mezzo" e "questi sono i mezzi della tua
 * linea", e va scritta ogni volta: sulla mappa i due casi si somigliano.
 */
export function describeBusRadarTarget(target) {
  if (!target) return '';
  if (target.hasVehicle) {
    const vehicles = target.fleetNumbers.join(', ');
    return target.fleetNumbers.length > 1
      ? `BusRadar cerca nel feed GTT le vetture ${vehicles}. Compaiono solo se stanno trasmettendo.`
      : `BusRadar cerca nel feed GTT la vettura ${vehicles}. Compare solo se sta trasmettendo.`;
  }
  const shift = target.vehicleShift ? `Il turno vettura ${target.vehicleShift}` : 'Il turno vettura';
  return `${shift} non e' un dato che GTT trasmette: la mappa mostra i mezzi della linea ${target.line}${
    target.placeLabel ? ` intorno a ${target.placeLabel}` : ''
  }. Scrivi la matricola nelle caselle "Vetture" per puntare il mezzo esatto.`;
}
