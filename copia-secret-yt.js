'use strict';
/**
 * copia-secret-yt.js — põe UMA credencial do YouTube no clipboard do Windows,
 * pra colar nos Secrets do GitHub sem que o valor apareça em lugar nenhum.
 *
 * POR QUE ASSIM: o valor não vai pro chat, não vai pro log e não vira arquivo
 * novo no disco. Ele sai do arquivo onde já mora e vai direto pro Ctrl+V.
 *
 *   node copia-secret-yt.js id       → YT_CLIENT_ID
 *   node copia-secret-yt.js secret   → YT_CLIENT_SECRET
 *   node copia-secret-yt.js refresh  → YT_REFRESH_TOKEN
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const qual = (process.argv[2] || '').toLowerCase();
const MAPA = {
  id: { nome: 'YT_CLIENT_ID', de: 'env', chave: 'YT_CLIENT_ID' },
  secret: { nome: 'YT_CLIENT_SECRET', de: 'env', chave: 'YT_CLIENT_SECRET' },
  refresh: { nome: 'YT_REFRESH_TOKEN', de: 'token', chave: 'refresh_token' },
};

const alvo = MAPA[qual];
if (!alvo) {
  console.log('uso: node copia-secret-yt.js <id|secret|refresh>');
  console.log('  id      → YT_CLIENT_ID');
  console.log('  secret  → YT_CLIENT_SECRET');
  console.log('  refresh → YT_REFRESH_TOKEN');
  process.exit(1);
}

let valor;
if (alvo.de === 'env') {
  const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const m = env.match(new RegExp(`^${alvo.chave}\\s*=\\s*(.+)$`, 'm'));
  valor = m && m[1].trim().replace(/^["']|["']$/g, '');
} else {
  const t = JSON.parse(fs.readFileSync(path.join(__dirname, '.yt-tokens.json'), 'utf8'));
  valor = t[alvo.chave];
}

if (!valor) { console.error(`não achei ${alvo.nome}`); process.exit(1); }

// `clip` é nativo do Windows. O valor entra por stdin e nunca é impresso.
const r = spawnSync('clip', { input: valor, shell: true });
if (r.status !== 0) { console.error('falhou ao copiar pro clipboard'); process.exit(1); }

console.log(`✓ ${alvo.nome} está no seu clipboard (${valor.length} caracteres).`);
console.log('  Cola no GitHub e roda o próximo.');
