'use strict';
/**
 * tiktok-scheduler.js — POSTA os vídeos do TikTok no horário (4/dia), com CATCH-UP:
 * se o PC estava desligado quando deu a hora, posta TUDO que venceu assim que rodar
 * (mesma filosofia do process-schedule.js do YouTube).
 *
 *   node tiktok-scheduler.js          # posta os vencidos e sai (pra cron/боot)
 *   node tiktok-scheduler.js list     # mostra a agenda e o que falta
 *   node tiktok-scheduler.js gen      # (re)gera a agenda 4/dia a partir de HOJE
 *
 * Modo: Direct Post SELF_ONLY (privado + legenda pronta) enquanto o app não é
 * auditado → você só muda "Privacidade → Todos" no app (2 toques, sem digitar).
 * Após a auditoria: TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE no .env e vira 100% auto.
 *
 * Estado: data/tiktok-schedule.json (agenda) — cada item {file, at, postedAt?, publishId?}.
 * Lock anti-execução-dupla: data/tiktok-scheduler.lock (10 min).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const LOTE = path.join(ROOT, 'tiktok-lote');
const SCHED = path.join(ROOT, 'data', 'tiktok-schedule.json');
const LOCK = path.join(ROOT, 'data', 'tiktok-scheduler.lock');

const HOURS_BRT = [8, 14, 18, 22]; // grade: notícia/aula-vsl/saga/viral
const PER_DAY = HOURS_BRT.length;

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function loadSched() { try { return JSON.parse(fs.readFileSync(SCHED, 'utf8')); } catch { return null; } }
function saveSched(s) { fs.mkdirSync(path.dirname(SCHED), { recursive: true }); fs.writeFileSync(SCHED, JSON.stringify(s, null, 2)); }

// gera agenda: DESLOCA a grade real do YouTube pra começar hoje. Preserva o slot
// por tipo (notícia 08h, aula/vsl 14h, SAGA SEMPRE 18h — a narração promete
// "amanhã às 18h" —, viral 22h) e a cadência entre os vídeos.
function generate() {
  const caps = JSON.parse(fs.readFileSync(path.join(LOTE, '_captions.json'), 'utf8'));
  const order = Object.entries(caps)
    .filter(([, v]) => v.publishAt)
    .sort((a, b) => (a[1].publishAt < b[1].publishAt ? -1 : 1))
    .map(([file, v]) => ({ file, isca: !!v.isca, yt: new Date(v.publishAt) }));
  const now = new Date();
  // shift em DIAS inteiros pra 1ª data cair hoje/futuro (mantém hora do slot)
  const first = order[0].yt;
  const dayMs = 86400e3;
  let shift = Math.ceil((now.getTime() - first.getTime()) / dayMs);
  if (shift < 0) shift = 0;
  if (first.getTime() + shift * dayMs < now.getTime()) shift++; // garante futuro
  const items = order.map(v => ({
    file: v.file, isca: v.isca,
    at: new Date(v.yt.getTime() + shift * dayMs).toISOString(),
    postedAt: null, publishId: null,
  }));
  saveSched({ generated: now.toISOString(), mode: 'direct', shiftDays: shift, items });
  log(`agenda gerada: ${items.length} vídeos (grade YT +${shift}d), ${items[0].at} → ${items[items.length - 1].at}`);
  return loadSched();
}

async function postDue() {
  // lock anti-duplo (boot + cron ao mesmo tempo)
  try {
    if (fs.existsSync(LOCK)) {
      const age = Date.now() - fs.statSync(LOCK).mtimeMs;
      if (age < 10 * 60 * 1000) { log('outra execução em andamento (lock) — saindo'); return; }
    }
    fs.mkdirSync(path.dirname(LOCK), { recursive: true });
    fs.writeFileSync(LOCK, String(process.pid));
  } catch {}

  try {
    let sched = loadSched();
    if (!sched) sched = generate();
    const caps = JSON.parse(fs.readFileSync(path.join(LOTE, '_captions.json'), 'utf8'));
    const now = Date.now();
    const due = sched.items.filter(i => !i.postedAt && new Date(i.at).getTime() <= now);
    if (!due.length) {
      const next = sched.items.find(i => !i.postedAt);
      log(`nada vencido. próximo: ${next ? next.file + ' @ ' + next.at : '— fila vazia 🎉'}`);
      return;
    }
    log(`CATCH-UP: ${due.length} vencido(s) pra postar agora`);
    const { uploadVideo } = require('./tiktok-api');
    for (const item of due) {
      const p = path.join(LOTE, item.file);
      if (!fs.existsSync(p)) { log(`  ⚠️ ${item.file}: arquivo sumiu — marcando pra não travar fila`); item.postedAt = 'MISSING'; saveSched(sched); continue; }
      const caption = (caps[item.file] && caps[item.file].caption) || '';
      process.stdout.write(`  → ${item.file} ... `);
      try {
        const r = await uploadVideo(p, { mode: 'direct', caption });
        item.postedAt = new Date().toISOString();
        item.publishId = r.publish_id;
        saveSched(sched);
        console.log(`✓ ${r.status}`);
        await new Promise(res => setTimeout(res, 30000)); // respiro anti-spam entre posts
      } catch (e) {
        const msg = (e.response && JSON.stringify(e.response.data)) || e.message;
        console.log('✗ ' + msg.slice(0, 300));
        if (/token|scope|auth/i.test(msg)) { log('  → problema de token/scope: rode node tiktok-login.js e re-autorize. Parando.'); break; }
        if (/spam|rate|limit|frequen/i.test(msg)) { log('  → rate limit do TikTok: o resto fica pra próxima rodada (30 min).'); break; }
        // erro pontual: tenta o próximo na próxima rodada (não marca)
        break;
      }
    }
    const left = sched.items.filter(i => !i.postedAt).length;
    log(`fim da rodada. faltam ${left} na fila.`);
  } finally {
    try { fs.unlinkSync(LOCK); } catch {}
  }
}

(async () => {
  const arg = process.argv[2];
  if (arg === 'gen') { generate(); return; }
  if (arg === 'list') {
    const s = loadSched() || generate();
    const BRT = d => new Date(new Date(d).getTime() - 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ') + ' BRT';
    console.log(`\n=== AGENDA TIKTOK (${s.items.filter(i => !i.postedAt).length} pendentes) ===`);
    s.items.forEach(i => console.log(` ${i.postedAt ? '✓' : '·'} ${BRT(i.at)}  ${i.file}${i.isca ? '  [COSMOS]' : ''}`));
    return;
  }
  await postDue();
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
