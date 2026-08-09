import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { UpdateBanner } from './components/UpdateBanner.jsx';
import { startServiceWorker } from './serviceWorkerClient.js';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <UpdateBanner />
  </React.StrictMode>,
);

/* Il service worker tiene l'app leggibile senza rete: in deposito, in galleria
   e nel sottopasso i turni sono gia' nel telefono, mancava solo il programma
   per aprirli. Il ricambio delle versioni e' spiegato in `src/sw.js`. */
startServiceWorker();
