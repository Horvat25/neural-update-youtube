'use strict';
/**
 * scheduler.js — publica automático 2x/dia no YouTube (12h e 19h BRT).
 *   node scheduler.js                 → publica conforme YT_PRIVACY (.env, default unlisted)
 *   node scheduler.js --public        → força público
 */
require('dotenv').config();
const cron = require('node-cron');
const { runDailyPost } = require('./auto-agent');

// Brasília = UTC-3 → 12:00 BRT = 15:00 UTC | 19:00 BRT = 22:00 UTC
const privacyStatus = process.argv.includes('--public') ? 'public'
  : process.argv.includes('--private') ? 'private'
  : (process.env.YT_PRIVACY || 'unlisted');

console.log('Neural Update — YouTube Scheduler iniciado.');
console.log(`Publica automático 2x/dia: 12h e 19h (BRT) | privacy: ${privacyStatus}\n`);

function cycle(tag) {
  console.log(`[scheduler] disparo ${tag} @ ${new Date().toLocaleString('pt-BR')}`);
  runDailyPost({ privacyStatus }).catch(err => console.error('[scheduler]', err.message));
}

cron.schedule('0 15 * * *', () => cycle('12h BRT'), { timezone: 'Etc/UTC' });
cron.schedule('0 22 * * *', () => cycle('19h BRT'), { timezone: 'Etc/UTC' });

process.on('SIGINT', () => { console.log('\nScheduler encerrado.'); process.exit(0); });
