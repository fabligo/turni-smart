import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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

export default defineConfig({
  base: '/turni-smart/',
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp()),
  },
  plugins: [react()],
});
