import { buildNearbyStopsUrl } from './gttLinks.js';

// Una lettura recente va benissimo per sapere cosa passa intorno: pretenderne
// una nuova di zecca fa solo scadere il GPS al chiuso.
const FIRST_TRY = { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 };
const RETRY = { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 };

const PERMISSION_DENIED = 1;
const TIMEOUT = 3;

export function describeGeolocationError(error) {
  if (error?.code === PERMISSION_DENIED) {
    return 'Permesso posizione negato: va riattivato per questo sito nelle impostazioni del telefono.';
  }
  if (error?.code === TIMEOUT) {
    return 'Il GPS non ha risposto in tempo: riprova, se puoi all aperto.';
  }
  return 'Posizione non disponibile in questo momento: riprova tra qualche secondo.';
}

/**
 * Apre le fermate intorno a dove ci si trova adesso. La finestra si apre col
 * clic e non dentro la risposta del GPS, altrimenti il browser la blocca come
 * popup; se la posizione non arriva si ripiega su `fallbackUrl` quando c'e'.
 */
export function openNearbyStops({ fallbackUrl = '', onError } = {}) {
  const target = window.open('', '_blank');
  if (target) target.opener = null;

  const go = (url) => {
    if (target) target.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  const fail = (error) => {
    if (fallbackUrl) go(fallbackUrl);
    else if (target) target.close();
    onError?.(describeGeolocationError(error));
  };

  if (!navigator.geolocation) {
    fail({ code: 0 });
    return;
  }

  const success = (position) => {
    const url = buildNearbyStopsUrl({ lat: position.coords.latitude, lng: position.coords.longitude });
    if (url) go(url);
    else fail({ code: 0 });
  };

  navigator.geolocation.getCurrentPosition(
    success,
    (error) => {
      // Un timeout non e' un rifiuto: si riprova senza alta precisione.
      if (error?.code === TIMEOUT) {
        navigator.geolocation.getCurrentPosition(success, fail, RETRY);
        return;
      }
      fail(error);
    },
    FIRST_TRY,
  );
}
