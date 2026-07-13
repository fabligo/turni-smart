import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['src', 'public', '.github', 'index.html', 'vite.config.js', 'package.json', '.env.example'];
const SKIP = new Set(['scripts/check-public-secrets.mjs']);
const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.json', '.html', '.yml', '.yaml', '.env', '.example']);
const CHECKS = [
  ['chiave privata', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['token GitHub', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['chiave OpenAI', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['segreto in variabile pubblica Vite', /\bVITE_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\s*=\s*\S+/],
];

async function collect(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  try {
    const entries = await readdir(absolutePath, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map((entry) => collect(path.join(relativePath, entry.name))),
    );
    return nested.flat();
  } catch {
    return [relativePath];
  }
}

const files = (await Promise.all(TARGETS.map(collect)))
  .flat()
  .filter((file) => !SKIP.has(file) && TEXT_EXTENSIONS.has(path.extname(file)));

const findings = [];
for (const file of files) {
  const content = await readFile(path.join(ROOT, file), 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    CHECKS.forEach(([label, pattern]) => {
      if (pattern.test(line)) findings.push(`${file}:${index + 1} (${label})`);
    });
  });
}

if (findings.length) {
  console.error('Possibili credenziali pubbliche rilevate:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log('Controllo credenziali pubbliche superato.');
