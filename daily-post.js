'use strict';
/**
 * daily-post.js — ciclo ÚNICO (one-shot) p/ o Agendador de Tarefas do Windows.
 * Gera tema → roteiro → vídeo (Higgsfield) → publica no YouTube (BR + EN).
 *
 *   node daily-post.js              → publica (YT_PRIVACY, default unlisted)
 *   node daily-post.js --public     → público
 *   node daily-post.js --private    → privado (só você vê)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { runDailyPost } = require('./auto-agent');

const privacyStatus = process.argv.includes('--public') ? 'public'
  : process.argv.includes('--private') ? 'private'
  : process.argv.includes('--unlisted') ? 'unlisted'
  : (process.env.YT_PRIVACY || 'unlisted');

(async () => {
  const r = await runDailyPost({ privacyStatus }).catch(err => {
    console.error('[daily-post] fatal:', err.message);
    return { ok: false };
  });
  process.exit(r && r.ok ? 0 : 1);
})();
