'use strict';
/**
 * process-schedule.js — verificador autônomo da FILA do YouTube (catch-up).
 * Roda pelo Agendador do Windows / pasta de Inicialização, SEM depender do painel aberto.
 *
 * Política (igual TikTok): ao rodar, se houver agendados VENCIDOS (inclusive os que
 * perderam a hora porque o PC estava desligado), posta só 1 (o mais antigo) e
 * REAGENDA os demais vencidos pro futuro, espaçados 3h — pra não despejar tudo de uma vez.
 *
 *   node process-schedule.js          → posta 1 vencido + reagenda o resto
 *   node process-schedule.js --dry    → só mostra o que faria (não posta)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const { runDailyPost } = require('./auto-agent');

const DRY = process.argv.includes('--dry');
const SCHEDULE_FILE = path.join(__dirname, 'data', 'schedule.json');
const RESCHEDULE_GAP_MS = 3 * 60 * 60 * 1000; // 3h entre os reagendados

function load() { try { return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')); } catch { return []; } }
function save(a) { fs.mkdirSync(path.dirname(SCHEDULE_FILE), { recursive: true }); fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(a, null, 2)); }

const AGENT_URL = process.env.IMAGE_AGENT_URL || 'http://localhost:3030';
const AGENT_DIR = process.env.IMAGE_AGENT_DIR || path.join(__dirname, '..', 'neural-image-agent');
async function isAgentUp() { try { await axios.get(AGENT_URL + '/', { timeout: 2500 }); return true; } catch (e) { return !!(e.response && e.response.status); } }
async function ensureImageAgent() {
  if (await isAgentUp()) return true;
  try { const c = spawn(process.execPath, ['src/index.js'], { cwd: AGENT_DIR, detached: true, stdio: 'ignore', windowsHide: true }); c.unref(); } catch {}
  for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 2000)); if (await isAgentUp()) return true; }
  return false;
}

(async () => {
  const now = Date.now();
  let arr = load();
  const overdue = arr
    .filter(s => s.status === 'pending' && new Date(s.when).getTime() <= now)
    .sort((a, b) => new Date(a.when) - new Date(b.when));

  const pendingCount = arr.filter(s => s.status === 'pending').length;
  if (!overdue.length) { console.log(`[process-schedule] nada vencido (pendentes futuros: ${pendingCount}).`); return; }

  const [first, ...rest] = overdue;
  console.log(`[process-schedule] ${overdue.length} vencido(s). Posto 1 (${first.format || 'rotação'}, era ${first.when}) e reagendo ${rest.length}.`);

  // Reagenda os demais vencidos pro futuro (3h, 6h, 9h...) a partir de agora
  let base = now;
  for (const s of rest) {
    base += RESCHEDULE_GAP_MS;
    const i = arr.findIndex(x => x.id === s.id);
    if (i >= 0) arr[i].when = new Date(base).toISOString();
  }

  if (DRY) {
    console.log(`[dry] postaria agora: ${first.id} (${first.format || 'rotação'})`);
    rest.forEach(s => console.log(`[dry] reagendaria: ${s.id} -> ${arr.find(x => x.id === s.id).when}`));
    return;
  }

  // Marca o escolhido como running + salva (já com os reagendamentos) p/ não duplicar
  const fi = arr.findIndex(x => x.id === first.id);
  if (fi >= 0) arr[fi].status = 'running';
  save(arr);

  await ensureImageAgent();
  let r;
  try { r = await runDailyPost({ format: first.format || undefined, privacyStatus: first.privacyStatus || undefined }); }
  catch (e) { r = { ok: false, reason: e.message }; }

  arr = load(); // recarrega caso algo tenha mudado durante o post
  const j = arr.findIndex(x => x.id === first.id);
  if (j >= 0) {
    arr[j].status = (r && r.ok) ? 'done' : 'error';
    arr[j].result = r && (r.youtube ? r.youtube.url : r.reason);
    save(arr);
    console.log(`[process-schedule] ${arr[j].status}: ${arr[j].result || ''}`);
  }
})().catch(e => { console.error('[process-schedule] fatal:', e.message); process.exit(1); });
