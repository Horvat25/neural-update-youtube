'use strict';
/** cancel-schedule.js — cancela o agendamento de um vídeo (vira private sem publishAt). node cancel-schedule.js <videoId> */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const videoId = process.argv[2];
if (!videoId) { console.error('uso: node cancel-schedule.js <videoId>'); process.exit(1); }

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const res = await yt.videos.update({
    part: ['status'],
    requestBody: { id: videoId, status: { privacyStatus: 'private', publishAt: null, selfDeclaredMadeForKids: false } },
  });
  const pub = res.data.status.publishAt || '(nenhum)';
  console.log(`✓ ${videoId} → privacidade: ${res.data.status.privacyStatus} | publishAt: ${pub}`);
})().catch(e => { console.error('ERRO:', e?.errors?.[0]?.message || e.message); process.exit(1); });
