import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { classifyPrecache, computeVersion, renderServiceWorker } from './scripts/service-worker-build.mjs';

/* Il sito e' una pagina sola: index.html resta nella cache del browser anche
   quando il resto e' gia' cambiato, e da fuori non c'e' modo di capire quale
   versione si sta guardando. Questa marca lo dice a chi apre l'app. */
function buildStamp() {
  let commit = '';
  try {
    commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    // Fuori da un checkout git resta la sola data: meglio parziale che assente.
  }
  return [new Date().toISOString().slice(0, 16).replace('T', ' '), commit].filter(Boolean).join(' · ');
}

/* Prende `src/sw.js`, ci scrive dentro l'elenco dei file di questa build e lo
   pubblica come `dist/sw.js`. Solo in build: in `npm run dev` un service
   worker che serve file dalla cache nasconde le modifiche appena fatte. */
function serviceWorkerPlugin() {
  let config;

  return {
    name: 'turni-smart-service-worker',
    apply: 'build',
    /* Dopo tutti gli altri: index.html viene creato dal plugin HTML di Vite
       dentro `generateBundle`, e senza `post` l'elenco lo perderebbe — cioe'
       si conserverebbe tutto tranne la pagina da aprire. */
    enforce: 'post',
    configResolved(resolved) {
      config = resolved;
    },
    generateBundle(_options, bundle) {
      const base = config.base;
      const publicFileNames = listFiles(config.publicDir);
      const { core, immutable, optional } = classifyPrecache({
        base,
        bundleFileNames: Object.keys(bundle),
        publicFileNames,
        assetsDir: config.build.assetsDir,
      });

      const readFileSource = (url) => {
        const fileName = url.slice(base.length);
        const emitted = bundle[fileName];
        if (emitted) return Buffer.from(emitted.type === 'chunk' ? emitted.code : emitted.source);
        return readFileSync(path.join(config.publicDir, fileName));
      };

      const source = renderServiceWorker({
        template: readFileSync(path.resolve(config.root, 'src/sw.js'), 'utf8'),
        base,
        version: computeVersion({ core, immutable, optional, readFileSource }),
        core,
        immutable,
        optional,
      });

      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

/* Percorsi relativi alla cartella, con lo slash avanti come li scrive Vite. */
function listFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(path.join(directory, entry.name), name) : [name];
  });
}

export default defineConfig({
  base: '/turni-smart/',
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp()),
  },
  plugins: [react(), serviceWorkerPlugin()],
});
