import { useEffect, useState } from 'react';
import { applyUpdate, subscribeToUpdate } from '../serviceWorkerClient.js';

/* L'avviso di versione nuova. Non ricarica da solo: chi sta leggendo il turno
   di domani alle cinque del mattino decide lui quando e' il momento.
   Se viene chiuso senza aggiornare, la versione resta in attesa e l'avviso
   torna alla riapertura dell'app. */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => subscribeToUpdate(setReady), []);

  if (!ready || dismissed) return null;

  return (
    <div aria-live="polite" className="update-banner" role="status">
      <div className="update-banner__text">
        <strong>Versione nuova pronta</strong>
        <span>Ricarica per usarla.</span>
      </div>
      <button className="update-banner__apply" onClick={applyUpdate} type="button">
        Aggiorna
      </button>
      <button
        aria-label="Rimanda l'aggiornamento"
        className="update-banner__dismiss"
        onClick={() => setDismissed(true)}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
