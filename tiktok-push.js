'use strict';
/**
 * tiktok-push.js — envia os próximos N vídeos da grade pros RASCUNHOS do TikTok
 * (modo inbox, API oficial). Você abre o app, cola a legenda (tiktok-lote/_captions.txt)
 * e toca "Postar". Ordem = grade; estado em data/tiktok-pushed.json (não repete).
 *
 *   node tiktok-push.js            # próximos 5 pros rascunhos
 *   node tiktok-push.js 3          # próximos 3
 *   node tiktok-push.js list       # o que falta, na ordem
 *   MODE=direct node tiktok-push.js 1   # publica direto (precisa scope video.publish + auditoria p/ público)
 *
 * Sem auditoria: inbox funciona e é grátis. Com auditoria: troque MODE=direct.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const LOTE = path.join(ROOT, 'tiktok-lote');
const STATE = path.join(ROOT, 'data', 'tiktok-pushed.json');

const caps = JSON.parse(fs.readFileSync(path.join(LOTE, '_captions.json'), 'utf8'));
// ordem por publishAt (mesma cadência da grade)
const ORDER = Object.entries(caps)
  .sort((a, b) => (a[1].publishAt || '') < (b[1].publishAt || '') ? -1 : 1)
  .map(([file]) => file);

function loadState() { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return { pushed: [] }; } }
function saveState(s) { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(s, null, 2)); }

const arg = process.argv[2];
const state = loadState();
const pending = ORDER.filter(f => !state.pushed.includes(f));

if (arg === 'list') {
  console.log(`\n=== TIKTOK: ${pending.length} pendentes (ordem da grade) ===`);
  pending.forEach((f, i) => console.log(`${String(i + 1).padStart(2)}. ${f}${caps[f].isca ? '  [COSMOS]' : ''}`));
  console.log('\nRode "node tiktok-push.js" pra enviar os próximos 5 pros rascunhos.');
  process.exit(0);
}

const N = Number.isFinite(+arg) ? +arg : 5;
const MODE = process.env.MODE === 'direct' ? 'direct' : 'inbox';

(async () => {
  const { uploadVideo } = require('./tiktok-api');
  const batch = pending.slice(0, N);
  if (!batch.length) { console.log('Nada pendente — tudo já foi pros rascunhos. 👍'); return; }
  console.log(`=== enviando ${batch.length} pro TikTok (modo ${MODE}) ===\n`);
  let ok = 0;
  for (const file of batch) {
    const p = path.join(LOTE, file);
    if (!fs.existsSync(p)) { console.log(`  ⚠️ ${file}: arquivo sumiu — pulando`); continue; }
    process.stdout.write(`→ ${file}${caps[file].isca ? ' [COSMOS]' : ''} ... `);
    try {
      const r = await uploadVideo(p, { mode: MODE, caption: caps[file].caption });
      console.log(r.status === 'SEND_TO_USER_INBOX' ? '✓ no rascunho' : `✓ ${r.status}`);
      state.pushed.push(file); saveState(state); ok++;
    } catch (e) {
      const msg = (e.response && JSON.stringify(e.response.data)) || e.message;
      console.log('✗ ' + msg);
      if (/token|scope|auth/i.test(msg)) { console.log('   → rode `node tiktok-login.js`.'); break; }
    }
  }
  console.log(`\n=== ${ok}/${batch.length} nos rascunhos | faltam ${pending.length - ok} ===`);
  if (ok) console.log('Abra o TikTok → Rascunhos, cole a legenda de tiktok-lote/_captions.txt e poste. 🎬');
})();
