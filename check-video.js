'use strict';
/** check-video.js — mostra status/agendamento de vídeos. node check-video.js <id1> <id2> ... */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const ids = process.argv.slice(2);
if (!ids.length) { console.error('uso: node check-video.js <id1> <id2> ...'); process.exit(1); }

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const res = await yt.videos.list({ part: ['snippet', 'status'], id: ids });
  for (const v of res.data.items || []) {
    const pub = v.status.publishAt ? new Date(v.status.publishAt).toLocaleString('pt-BR') : '(imediato)';
    console.log(`${v.id} | ${v.status.privacyStatus.toUpperCase()} | publica: ${pub} | ${v.snippet.title.slice(0, 45)}`);
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
