import { DEPOT_CODE, getServiceTypes, normalizePlace } from './depotReturns.js';
import { isRientriKey } from '../parserRientri.js';

/**
 * Un referto su cosa il parser ha capito degli Orari caricati.
 *
 * Non fa parte dell'interfaccia e non si vede usando la app: esiste per
 * rispondere a una domanda che dai dati non si legge in altro modo, cioe'
 * come le pagine del PDF sono state divise fra feriale, sabato e festivo.
 *
 * La classificazione avviene per intestazione di pagina, e quando
 * un'intestazione non viene riconosciuta la pagina eredita il tipo di quella
 * prima. Un'eredita' sbagliata al confine fra due sezioni si porta dietro
 * tutto il resto del documento senza lasciare traccia: questo referto e'
 * la traccia.
 */

/* Le uscite dal deposito con la stessa regola del pannello: un tratto che
   parte dal Gerbido e non ci torna. Contate due volte di proposito - righe
   lette e mezzi distinti - perche' la distanza fra i due numeri e' quanto il
   parser sta duplicando. */
export function countExits(segments = []) {
  const seen = new Set();
  let rows = 0;

  segments.forEach((segment) => {
    if (normalizePlace(segment?.loc_s) !== DEPOT_CODE) return;
    const to = normalizePlace(segment?.loc_e);
    if (!to || to === DEPOT_CODE) return;
    rows += 1;
    const line = segment.lineaNorm || segment.ln || '';
    seen.add([line, segment.start, segment.end, to].join('|'));
  });

  return { rows, unique: seen.size };
}

/** Cosa c'e' nei dati, raggruppato per la stringa di intestazione. */
export function summarizeByGt(developments = {}) {
  const byGt = new Map();

  Object.values(developments || {}).forEach((segments) => {
    if (!Array.isArray(segments)) return;
    segments.forEach((segment) => {
      const gt = String(segment?.gt ?? '');
      if (!byGt.has(gt)) byGt.set(gt, { gt, segments: [], service: getServiceTypes(gt).join('+') });
      byGt.get(gt).segments.push(segment);
    });
  });

  return [...byGt.values()]
    .map((item) => ({
      exits: countExits(item.segments),
      gt: item.gt,
      segments: item.segments.length,
      service: item.service,
    }))
    .sort((a, b) => b.segments - a.segments);
}

/**
 * Le pagine compattate in tratte consecutive dello stesso tipo, con quante di
 * quelle pagine il tipo se lo sono dichiarato da sole. Una tratta lunga con
 * una sola pagina riconosciuta e' un'eredita' che si e' propagata.
 */
export function summarizePages(diagnostics = []) {
  const runs = [];
  let recognized = 0;

  diagnostics.forEach((page) => {
    if (page.own) recognized += 1;
    const last = runs[runs.length - 1];
    if (last && last.gt === page.gt) {
      last.to = page.page;
      last.pages += 1;
      if (page.own) last.recognized += 1;
    } else {
      runs.push({
        from: page.page,
        gt: page.gt,
        pages: 1,
        recognized: page.own ? 1 : 0,
        service: getServiceTypes(page.gt).join('+'),
        to: page.page,
      });
    }
  });

  return {
    inherited: diagnostics.length - recognized,
    recognized,
    runs,
    total: diagnostics.length,
  };
}

/* I rientri letti dal grafico di servizio, per linea. Sono l'unica fonte delle
   ultime corse prima del deposito: se qui c'e' zero, il PDF quella pagina non
   l'ha o il testo estratto ha una forma che il parser non riconosce, e il
   pannello Rientri restera' vuoto per quella linea. */
export function summarizeReturns(developments = {}) {
  return Object.entries(developments || {})
    .filter(([key]) => isRientriKey(key))
    .map(([key, segments]) => ({
      key,
      places: [...new Set((segments || []).map((segment) => normalizePlace(segment.loc_s)))].sort(),
      segments: (segments || []).length,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

const MAX_RUNS = 24;
const MAX_EXCERPTS = 3;

/** Il referto in testo semplice, fatto per essere fotografato o incollato. */
export function buildOrariReport({ developments = {}, pages = null } = {}) {
  const lines = ['ORARI · diagnostica'];

  if (pages?.length) {
    const summary = summarizePages(pages);
    lines.push(`pagine ${summary.total} · riconosciute ${summary.recognized} · ereditate ${summary.inherited}`);
    summary.runs.slice(0, MAX_RUNS).forEach((run) => {
      const range = run.from === run.to ? `p${run.from}` : `p${run.from}-${run.to}`;
      lines.push(`${range} "${run.gt}" [${run.service}] ric ${run.recognized}/${run.pages}`);
    });
    if (summary.runs.length > MAX_RUNS) lines.push(`… altre ${summary.runs.length - MAX_RUNS} tratte`);
  } else {
    lines.push('pagine: non disponibili (ricarica il PDF Orari con la diagnostica attiva)');
  }

  lines.push('--');
  const byGt = summarizeByGt(developments);
  if (!byGt.length) lines.push('nessuno sviluppo caricato');
  byGt.forEach((item) => {
    lines.push(`"${item.gt}" [${item.service}] segm ${item.segments} · usc ${item.exits.rows} → ${item.exits.unique}`);
  });
  lines.push(`chiavi ${Object.keys(developments || {}).length}`);

  lines.push('--');
  const returns = summarizeReturns(developments);
  if (!returns.length) lines.push('rientri: nessuno (grafico di servizio non letto)');
  returns.forEach((item) => {
    lines.push(`${item.key} · ultime corse ${item.segments} · da ${item.places.join(' ') || '-'}`);
  });

  /* Quando i rientri sono zero la domanda e' una sola: il PDF quella pagina ce
     l'ha? Le pagine con i marcatori del grafico rispondono di si', e il loro
     testo dice in che forma esce, che e' l'unico dato su cui correggere il
     parser senza avere il PDF sotto mano. */
  const marked = (pages || []).filter((page) => page.graphicMarkers?.length);
  if (!returns.length) {
    if (!marked.length) {
      lines.push('nessuna pagina col grafico: carica il PDF Orari completo');
    } else {
      marked.slice(0, MAX_EXCERPTS).forEach((page) => {
        lines.push(`p${page.page} marcatori ${page.graphicMarkers.join(',')}`);
        if (page.graphicExcerpt) lines.push(`  ${page.graphicExcerpt}`);
      });
    }
  }

  return lines.join('\n');
}
