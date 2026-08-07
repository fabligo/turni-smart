import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/* Una versione passata dell'app registrava un service worker. Non c'e' piu'
   (e nemmeno il suo file), ma su chi l'aveva installata resta li' a servire
   file vecchi finche' qualcuno non lo toglie: questa e' quella pulizia.
   Va tenuta finche' e' plausibile che qualche dispositivo se lo porti dietro.
   La stessa cosa, in forma manuale, sta in public/reset-cache.html. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    window.caches?.keys().then((keys) => {
      keys.filter((key) => key.startsWith('turni-smart')).forEach((key) => window.caches.delete(key));
    });
  });
}
