'use strict';
/**
 * daily-post.js — ciclo ÚNICO (one-shot) p/ o Agendador de Tarefas do Windows.
 * Garante o neural-image-agent no ar (porta 3030) → gera tema → roteiro →
 * vídeo → publica no YouTube.
 *
 *   node daily-post.js              → publica (YT_PRIVACY, default unlisted)
 *   node daily-post.js --public     → público
 *   node daily-post.js --private    → privado (só você vê)
 */
require('dotenv').config();
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const { runDailyPost } = require('./auto-agent');

const privacyStatus = process.argv.includes('--public') ? 'public'
  : process.argv.includes('--private') ? 'private'
  : process.argv.includes('--unlisted') ? 'unlisted'
  : (process.env.YT_PRIVACY || 'unlisted');

const AGENT_URL = process.env.IMAGE_AGENT_URL || 'http://localhost:3030';
const AGENT_DIR = process.env.IMAGE_AGENT_DIR || path.join(__dirname, '..', 'neural-image-agent');

async function isAgentUp() {
  try { await axios.get(AGENT_URL + '/', { timeout: 2500 }); return true; }
  catch (e) { return !!(e.response && e.response.status); } // qualquer resposta HTTP = no ar
}

async function ensureImageAgent() {
  if (await isAgentUp()) { console.log('[daily-post] agente de imagens já está no ar'); return true; }
  console.log('[daily-post] subindo neural-image-agent...');
  try {
    const child = spawn(process.execPath, ['src/index.js'], {
      cwd: AGENT_DIR, detached: true, stdio: 'ignore', windowsHide: true,
    });
    child.unref();
  } catch (e) {
    console.warn('[daily-post] não consegui subir o agente:', e.message, '(seguindo com fallback Pexels)');
    return false;
  }
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 2000));
    if (await isAgentUp()) { console.log('[daily-post] agente no ar'); return true; }
  }
  console.warn('[daily-post] agente não respondeu a tempo — seguindo com fallback Pexels');
  return false;
}

(async () => {
  await ensureImageAgent();
  const r = await runDailyPost({ privacyStatus }).catch(err => {
    console.error('[daily-post] fatal:', err.message);
    return { ok: false };
  });
  process.exit(r && r.ok ? 0 : 1);
})();
