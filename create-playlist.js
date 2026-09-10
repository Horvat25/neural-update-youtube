'use strict';
/**
 * create-playlist.js — cria uma playlist no canal.
 *   node create-playlist.js "<título>" "<descrição>" [privacyStatus]
 * Imprime o ID da playlist criada. Idempotente por título: se já existir
 * playlist com o MESMO título no canal, só devolve o ID existente.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const title = process.argv[2];
const description = process.argv[3] || '';
const privacyStatus = process.argv[4] || 'public';
if (!title) { console.error('uso: node create-playlist.js "<título>" "<descrição>" [privacy]'); process.exit(1); }

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });

  let pageToken;
  do {
    const r = await yt.playlists.list({ part: ['snippet'], mine: true, maxResults: 50, pageToken });
    const hit = (r.data.items || []).find(p => p.snippet.title === title);
    if (hit) { console.log(`[playlist] já existe: ${hit.id}`); console.log(`PLAYLIST_ID=${hit.id}`); return; }
    pageToken = r.data.nextPageToken;
  } while (pageToken);

  const r = await yt.playlists.insert({
    part: ['snippet', 'status'],
    requestBody: { snippet: { title, description }, status: { privacyStatus } },
  });
  console.log(`[playlist] ✓ criada: ${r.data.id} ("${title}", ${privacyStatus})`);
  console.log(`PLAYLIST_ID=${r.data.id}`);
})().catch(e => { console.error('ERRO:', e?.errors?.[0]?.message || e.message); process.exit(1); });
