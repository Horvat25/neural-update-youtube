'use strict';
/** list-schedule.js — lista os uploads recentes do canal com status e agendamento. */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

// Sem limite por padrão: pagina a playlist inteira (senão agendados "antigos"
// na ordem de upload somem da lista, mesmo programados pra data futura).
const N = parseInt(process.argv[2] || '0', 10);

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const ch = await yt.channels.list({ part: ['contentDetails'], mine: true });
  const uploads = ch.data.items[0].contentDetails.relatedPlaylists.uploads;

  const ids = [];
  let pageToken;
  do {
    const pl = await yt.playlistItems.list({
      part: ['contentDetails'], playlistId: uploads,
      maxResults: 50, pageToken,
    });
    ids.push(...pl.data.items.map(i => i.contentDetails.videoId));
    pageToken = pl.data.nextPageToken;
  } while (pageToken && (!N || ids.length < N));

  const finalIds = N ? ids.slice(0, N) : ids;
  const allItems = [];
  for (let i = 0; i < finalIds.length; i += 50) {
    const batch = finalIds.slice(i, i + 50);
    const res = await yt.videos.list({ part: ['snippet', 'status'], id: batch });
    allItems.push(...res.data.items);
  }
  const rows = allItems.map(v => ({
    when: v.status.publishAt ? new Date(v.status.publishAt) : null,
    priv: v.status.privacyStatus,
    title: v.snippet.title,
    id: v.id,
  }));
  rows.sort((a, b) => (a.when ? a.when.getTime() : 9e15) - (b.when ? b.when.getTime() : 9e15));
  console.log('\n=== FILA NEURAL UPDATE ===');
  for (const r of rows) {
    const w = r.when
      ? r.when.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : (r.priv === 'public' ? 'JÁ PÚBLICO' : '(sem agendamento)');
    const tag = r.priv === 'private' && r.when ? '🕒 AGENDADO' : (r.priv === 'public' ? '✅ PÚBLICO' : `· ${r.priv}`);
    console.log(`${tag.padEnd(12)} ${String(w).padEnd(26)} ${r.title.slice(0, 50)}  [${r.id}]`);
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
