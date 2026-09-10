'use strict';
// lista os vídeos LONGOS (>180s) com id, duração, views e minutos assistidos
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const s2 = d => { const m = (d || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []; return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)); };

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const ya = google.youtubeAnalytics({ version: 'v2', auth });
  const ch = await yt.channels.list({ part: ['contentDetails'], mine: true });
  const up = ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  const ids = []; let p;
  do {
    const pl = await yt.playlistItems.list({ part: ['contentDetails'], playlistId: up, maxResults: 50, pageToken: p });
    (pl.data.items || []).forEach(i => ids.push(i.contentDetails.videoId));
    p = pl.data.nextPageToken;
  } while (p && ids.length < 300);

  const vids = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await yt.videos.list({ part: ['snippet', 'statistics', 'status', 'contentDetails'], id: ids.slice(i, i + 50) });
    vids.push(...(r.data.items || []));
  }
  const longos = vids.filter(v => s2(v.contentDetails?.duration) > 180 && v.status?.privacyStatus === 'public');

  let an = {};
  try {
    const r = await ya.reports.query({
      ids: 'channel==MINE', startDate: '2026-06-01', endDate: new Date().toISOString().slice(0, 10),
      metrics: 'views,estimatedMinutesWatched,averageViewPercentage,averageViewDuration,subscribersGained',
      dimensions: 'video', filters: 'video==' + longos.map(v => v.id).join(','), maxResults: 50,
    });
    (r.data.rows || []).forEach(x => an[x[0]] = { v: x[1], min: x[2], pct: x[3], dur: x[4], subs: x[5] });
  } catch (e) { console.log('(analytics: ' + e.message + ')'); }

  console.log(`\n${longos.length} LONGOS públicos\n`);
  let totalMin = 0;
  for (const v of longos.sort((a, b) => new Date(a.snippet.publishedAt) - new Date(b.snippet.publishedAt))) {
    const d = s2(v.contentDetails.duration), a = an[v.id] || {};
    totalMin += a.min || 0;
    console.log(`${v.id}  ${v.snippet.publishedAt.slice(0, 10)}  ${Math.floor(d / 60)}m${String(d % 60).padStart(2, '0')}  ${String(v.statistics.viewCount).padStart(4)} views  ${String(Math.round(a.min || 0)).padStart(4)} min assistidos  ${a.pct ? a.pct.toFixed(0) + '%' : '—'}  +${a.subs || 0} subs`);
    console.log(`   ${v.snippet.title}`);
  }
  console.log(`\nTOTAL de minutos assistidos em longo: ${Math.round(totalMin)} min = ${(totalMin / 60).toFixed(1)}h de 4000h (${(totalMin / 60 / 4000 * 100).toFixed(2)}%)`);
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
