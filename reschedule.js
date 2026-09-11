'use strict';
/**
 * reschedule.js — altera o horário de publicação (publishAt) de um vídeo agendado.
 *   node reschedule.js <videoId> <publishAt-ISO>
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const videoId = process.argv[2];
const publishAt = process.argv[3];
if (!videoId || !publishAt) { console.error('uso: node reschedule.js <videoId> <publishAt-ISO>'); process.exit(1); }

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const res = await yt.videos.update({
    part: ['status'],
    // containsSyntheticMedia vai junto: videos.update(status) ZERA o que não for enviado, e
    // reagendar apagaria a declaração de conteúdo sintético (ver youtube-uploader.js, 11/09/2026)
    requestBody: { id: videoId, status: { privacyStatus: 'private', publishAt, selfDeclaredMadeForKids: false, containsSyntheticMedia: true } },
  });
  console.log(`✓ Reagendado: ${videoId} → publica em ${res.data.status.publishAt}`);
})().catch(e => { console.error('ERRO:', e?.errors?.[0]?.message || e.message); process.exit(1); });
