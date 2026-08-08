import { DEPOT_CODE, getServiceType, normalizePlace } from './depotReturns.js';

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
    seen.add([getServiceType(segment.gt), line, segment.start, segment.end, to].join('|'));
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
      if (!byGt.has(gt)) byGt.set(gt, { gt, segments: [], service: getServiceType(gt) });
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
        service: getServiceType(page.gt),
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

const MAX_RUNS = 24;

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

  return lines.join('\n');
}
