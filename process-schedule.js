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
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { runDailyPost } = require('./auto-agent');

const DRY = process.argv.includes('--dry');
const SCHEDULE_FILE = path.join(__dirname, 'data', 'schedule.json');
const RESCHEDULE_GAP_MS = 3 * 60 * 60 * 1000; // 3h entre os reagendados

function load() { try { return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')); } catch { return []; } }
function save(a) { fs.mkdirSync(path.dirname(SCHEDULE_FILE), { recursive: true }); fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(a, null, 2)); }

(async () => {
  const now = Date.now();

  // Guarda de horário: não postar entre 00h-07h (hora local).
  // Shorts recebem boost nas primeiras 1-2h — madrugada = zero engajamento inicial.
  const hourNow = new Date().getHours();
  if (hourNow >= 0 && hourNow < 7) {
    console.log(`[process-schedule] ${hourNow}h — fora da janela de publicação (00h-07h). Aguardando próximo slot.`);
    return;
  }

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
