'use strict';
/**
 * cta.js — CTA inteligente de inscrição.
 * Busca inscritos REAIS do canal, calcula a meta (próxima redonda) e decide,
 * por um contador persistente, se o próximo vídeo leva o CTA (1 a cada N).
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const COUNTER_FILE = path.join(__dirname, 'data', 'cta-counter.json');
const CTA_EVERY = 3; // 1 CTA a cada 3 vídeos

async function getSubscribers() {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const res = await yt.channels.list({ part: ['statistics'], mine: true });
  return parseInt(res.data?.items?.[0]?.statistics?.subscriberCount, 10) || 0;
}

// próxima meta "redonda" acima dos inscritos atuais (100, 200... ou milhares)
function goalFor(subs) {
  if (subs < 100) return 100;
  if (subs < 1000) return Math.ceil((subs + 1) / 100) * 100;
  return Math.ceil((subs + 1) / 1000) * 1000;
}

function ctaTexts(subs, goal) {
  const remaining = Math.max(goal - subs, 1);
  return {
    bar: `${subs} / ${goal}`,
    label: 'INSCREVA-SE',
    progress: Math.min(subs / goal, 1),
    narration: `Faltam ${remaining} pra bater ${goal} inscritos, se inscreve aí! Abraço do Neural Update!`,
  };
}

function loadCount() { try { return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8')).count || 0; } catch { return 0; } }
function saveCount(c) { fs.mkdirSync(path.dirname(COUNTER_FILE), { recursive: true }); fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count: c }, null, 2)); }

/** Planeja o próximo vídeo. commit=true incrementa o contador (chamar ao postar). */
async function planCta({ commit = false, force = null } = {}) {
  const count = loadCount();
  const next = count + 1;
  const hasCta = force !== null ? force : (next % CTA_EVERY === 0);
  let data = null;
  if (hasCta) {
    const subs = await getSubscribers();
    const goal = goalFor(subs);
    data = { subs, goal, ...ctaTexts(subs, goal) };
  }
  if (commit) saveCount(next);
  return { videoNumber: next, hasCta, every: CTA_EVERY, cta: data };
}

module.exports = { getSubscribers, goalFor, ctaTexts, planCta, loadCount, saveCount };

// CLI de diagnóstico: node cta.js
if (require.main === module) {
  (async () => {
    const subs = await getSubscribers();
    const goal = goalFor(subs);
    const count = loadCount();
    const t = ctaTexts(subs, goal);
    console.log(`Inscritos AGORA: ${subs} | Meta: ${goal} | Faltam: ${goal - subs}`);
    console.log(`Barra: ${t.bar} (${Math.round(t.progress * 100)}%)`);
    console.log(`Narração CTA: "${t.narration}"`);
    console.log(`Contador: ${count} | Próximo (#${count + 1}) tem CTA? ${(count + 1) % CTA_EVERY === 0 ? 'SIM' : 'não'} (1 a cada ${CTA_EVERY})`);
  })().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
}
