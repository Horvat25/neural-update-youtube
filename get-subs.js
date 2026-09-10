'use strict';
/** get-subs.js — busca estatísticas reais do canal (inscritos, views, vídeos). */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const res = await yt.channels.list({ part: ['statistics', 'snippet'], mine: true });
  const ch = res.data.items && res.data.items[0];
  if (!ch) { console.error('Canal não encontrado'); process.exit(1); }
  const s = ch.statistics || {};
  console.log(`Canal: ${ch.snippet.title}`);
  console.log(`Inscritos: ${s.subscriberCount}`);
  console.log(`Views totais: ${s.viewCount}`);
  console.log(`Vídeos: ${s.videoCount}`);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
