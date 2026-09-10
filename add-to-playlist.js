'use strict';
/**
 * add-to-playlist.js — insere um vídeo numa playlist, opcionalmente numa posição.
 *   node add-to-playlist.js <videoId> [position] [playlistId]
 * Default: playlist do curso "Universo do Zero" (PLQlXGsP6ERAs). Sem position = append.
 * Idempotente: se o vídeo já está na playlist, não duplica.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const videoId = process.argv[2];
const position = process.argv[3] !== undefined ? parseInt(process.argv[3], 10) : undefined;
const playlistId = process.argv[4] || 'PLQlXGsP6ERAs';
if (!videoId) { console.error('uso: node add-to-playlist.js <videoId> [position] [playlistId]'); process.exit(1); }

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });

  // já está?
  let pageToken;
  do {
    const r = await yt.playlistItems.list({ part: ['contentDetails'], playlistId, maxResults: 50, pageToken });
    if ((r.data.items || []).some(i => i.contentDetails.videoId === videoId)) {
      console.log(`[playlist] ${videoId} já está na playlist — nada a fazer.`);
      return;
    }
    pageToken = r.data.nextPageToken;
  } while (pageToken);

  const snippet = { playlistId, resourceId: { kind: 'youtube#video', videoId } };
  if (Number.isInteger(position)) snippet.position = position;
  await yt.playlistItems.insert({ part: ['snippet'], requestBody: { snippet } });
  console.log(`[playlist] ✓ ${videoId} adicionado${Number.isInteger(position) ? ' na posição ' + position : ' (fim)'}`);
})().catch(e => { console.error('ERRO:', e?.errors?.[0]?.message || e.message); process.exit(1); });
