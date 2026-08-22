import { DEPOT_CODE, getServiceTypes, normalizePlace } from './depotReturns.js';
import { isRientriKey, isUsciteKey } from '../parserRientri.js';

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

/* I tratti che partono dal Gerbido e non ci tornano, in tutto quello che il
   parser ha letto. Non sono le uscite del pannello, che vengono dal solo
   grafico di servizio (-> decisioni/0010): qui dentro finiscono anche le
   riprese della pagina dei turni, ed e' voluto. Contati due volte - righe lette
   e tratti distinti - perche' la distanza fra i due numeri e' quanto il parser
   sta duplicando. */
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

/* Le uscite lette dal grafico di servizio, per linea. Sono l'unica fonte dei
   trasferimenti con cui le vetture lasciano il deposito: se qui c'e' zero, il
   pannello Uscite restera' vuoto per quella linea. */
export function summarizeExits(developments = {}) {
  return Object.entries(developments || {})
    .filter(([key]) => isUsciteKey(key))
    .map(([key, segments]) => ({
      key,
      places: [...new Set((segments || []).map((segment) => normalizePlace(segment.loc_e)))].sort(),
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

  const exits = summarizeExits(developments);
  if (!exits.length) lines.push('uscite: nessuna (grafico di servizio non letto)');
  exits.forEach((item) => {
    lines.push(`${item.key} · trasferimenti ${item.segments} · verso ${item.places.join(' ') || '-'}`);
  });

  /* Le pagine che hanno i marcatori del grafico ma non ne hanno ricavato tutto.
     Sono le sole su cui si puo' intervenire, e il loro testo dice in che forma
     escono davvero le colonne: e' l'unico dato su cui correggere il parser
     senza avere il PDF sotto mano.

     Si mostrano anche quando altrove rientri e uscite si leggono. Il conto
     globale non basta: se su cento pagine le uscite si perdono in ottanta, il
     totale non e' zero e prima questo elenco restava muto proprio nel caso in
     cui serviva di piu'. */
  lines.push('--');
  if (!pages) {
    /* Senza i dati delle pagine non si sa se il PDF il grafico ce l'abbia:
       dirlo e' l'unica risposta onesta. Prima qui usciva "nessuna pagina col
       grafico", che e' un'affermazione sul PDF che il referto non puo' fare. */
    lines.push('pagine col grafico: non si sa (ricarica il PDF Orari con la diagnostica attiva)');
    return lines.join('\n');
  }

  const marked = pages.filter((page) => page.graphicMarkers?.length);
  const incomplete = pages.filter((page) => page.graphicExcerpt);

  if (!marked.length) {
    lines.push('nessuna pagina col grafico in questo PDF');
  } else if (!incomplete.length) {
    lines.push(`pagine col grafico ${marked.length}, tutte lette per intero`);
  } else {
    lines.push(`pagine col grafico ${marked.length}, incomplete ${incomplete.length}`);
    incomplete.slice(0, MAX_EXCERPTS).forEach((page) => {
      lines.push(
        `p${page.page} rientri ${page.returns ?? 0} uscite ${page.exits ?? 0} marcatori ${page.graphicMarkers.join(',')}`,
      );
      lines.push(`  ${page.graphicExcerpt}`);
    });
    if (incomplete.length > MAX_EXCERPTS) {
      lines.push(`… altre ${incomplete.length - MAX_EXCERPTS} pagine incomplete`);
    }
  }

  return lines.join('\n');
}
