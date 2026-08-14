import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { describeBusRadarTarget } from '../utils/busRadar.js';
import { AssetIcon, Icon } from './Icon.jsx';

/**
 * La mappa di BusRadar dentro Turni Smart, in un riquadro.
 *
 * Non e' una mappa nostra: e' BusRadar per intero, caricato in un frame. Le due
 * applicazioni restano due, ognuna con i suoi dati e i suoi aggiornamenti, e
 * questo riquadro e' l'unico punto in cui si toccano. Chi guarda il turno non
 * deve uscire dall'app per sapere dov'e' il mezzo, ed e' tutto qui il senso.
 */
export function BusRadarModal({ onClose, subtitle, target, title }) {
  const [isLoading, setIsLoading] = useState(true);
  const closeRef = useRef(null);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  /* Il riquadro copre lo schermo: se sotto la pagina continua a scorrere, il
     dito che trascina la mappa porta via il turno insieme a lei. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!target) return null;

  /* Il riquadro esce dalla card e va appeso al `body`.
     La card dello sviluppo turno si gira con una `transform`, e un antenato
     trasformato diventa il riferimento di `position: fixed`: dentro la card il
     riquadro nasceva storto e tagliato in fondo, con i bottoni fuori schermo.
     Il portale e' l'unico modo di non ereditare quel riferimento. */
  return createPortal(
    <div className="busradar-modal" role="dialog" aria-modal="true" aria-label={title || 'Mappa BusRadar'}>
      <div className="busradar-modal__panel">
        <div className="busradar-modal__header">
          <div>
            <span>
              <AssetIcon name="busMark" size={20} />
              BusRadar
            </span>
            <h4>{title}</h4>
            {subtitle ? <small>{subtitle}</small> : null}
          </div>
          <button aria-label="Chiudi la mappa" onClick={() => onClose?.()} ref={closeRef} type="button">
            ×
          </button>
        </div>

        <div className="busradar-modal__map">
          {isLoading ? (
            <p className="busradar-modal__loading" role="status">
              Carico la mappa di BusRadar...
            </p>
          ) : null}
          {/* `allow="geolocation"` serve al bottone "dove sono" di BusRadar:
              dentro un frame di un altro sito il permesso va delegato, o quel
              bottone resta li' a non fare niente. */}
          <iframe
            allow="geolocation"
            className="busradar-modal__frame"
            loading="lazy"
            onLoad={() => setIsLoading(false)}
            referrerPolicy="no-referrer"
            src={target.url}
            title={title || 'Mappa BusRadar'}
          />
        </div>

        <p className="busradar-modal__note">{describeBusRadarTarget(target)}</p>

        <div className="busradar-modal__actions">
          <a
            className="inline-action inline-action--gtt"
            href={target.externalUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon name="mapPin" size={18} />
            Apri in BusRadar
          </a>
          <button className="inline-action" onClick={() => onClose?.()} type="button">
            Torna al turno
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Il chip del turno vettura, che adesso si puo' premere. Resta un chip: chi non
 * cerca la mappa deve continuare a leggerlo come prima, e chi la cerca deve
 * capire che si apre qualcosa - da qui l'icona.
 */
export function VehicleShiftButton({ className = '', label, onOpen, target }) {
  if (!label) return null;
  if (!target) return <small className={className}>{label}</small>;

  return (
    <button
      className={`${className} segment-vehicle--map`.trim()}
      onClick={onOpen}
      title={target.title}
      type="button"
    >
      <Icon name="mapPin" size={12} />
      {label}
    </button>
  );
}
