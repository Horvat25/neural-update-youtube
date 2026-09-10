'use strict';
/**
 * _ebook-15d.js — tudo que dá pra medir do funil do ebook pelo lado do YouTube,
 * nos últimos 15 dias.
 *
 * ⚠️ O QUE O YOUTUBE **NÃO** ENTREGA: clique em link de descrição. A API não expõe
 * isso de jeito nenhum (nem o Studio). Então "quantas pessoas foram do vídeo pra
 * página de vendas" só existe do lado do GA4/Clarity, não daqui.
 * O que dá pra medir aqui é o TOPO: quanta gente viu o vídeo que vende, e quanto
 * dela ficou até o fim — porque o CTA do ebook está no fim.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const iso = d => d.toISOString().slice(0, 10);
const hoje = new Date();
const desde = new Date(Date.now() - 15 * 86400e3);

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const ya = google.youtubeAnalytics({ version: 'v2', auth });

  const ch = await yt.channels.list({ part: ['contentDetails', 'statistics'], mine: true });
  const up = ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  const ids = []; let p;
  do {
    const pl = await yt.playlistItems.list({ part: ['contentDetails'], playlistId: up, maxResults: 50, pageToken: p });
    (pl.data.items || []).forEach(i => ids.push(i.contentDetails.videoId));
    p = pl.data.nextPageToken;
  } while (p && ids.length < 300);

  const vids = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await yt.videos.list({ part: ['snippet', 'statistics', 'status'], id: ids.slice(i, i + 50) });
    vids.push(...(r.data.items || []));
  }

  // vídeo de VENDA = os que carregam o CTA do ebook (📕 no título, stream vsl)
  const vendas = vids.filter(v => v.status?.privacyStatus === 'public'
    && new Date(v.snippet.publishedAt) >= desde
    && /📕/.test(v.snippet.title));

  const rel = await ya.reports.query({
    ids: 'channel==MINE', startDate: iso(desde), endDate: iso(hoje),
    metrics: 'views,estimatedMinutesWatched,averageViewPercentage,subscribersGained',
    dimensions: 'video', sort: '-views', maxResults: 200,
  });
  const porId = Object.fromEntries((rel.data.rows || []).map(r => [r[0], r]));

  console.log(`\n=== VÍDEOS DE VENDA DO EBOOK — últimos 15 dias (${iso(desde)} a ${iso(hoje)}) ===\n`);
  let vv = 0, vmin = 0;
  console.log('views   ret%   +subs   título');
  for (const v of vendas.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt))) {
    const r = porId[v.id];
    const views = r ? r[1] : 0, pct = r ? r[3] : 0, subs = r ? r[4] : 0;
    vv += views; vmin += r ? r[2] : 0;
    console.log(`${String(views).padStart(5)}  ${pct.toFixed(0).padStart(4)}%  ${String(subs).padStart(5)}   ${v.snippet.title.slice(0, 52)}`);
  }
  console.log(`\n${vendas.length} vídeos de venda · ${vv} views somadas · ${(vmin / 60).toFixed(1)}h assistidas`);

  // canal inteiro no período, pra dar proporção
  const tot = await ya.reports.query({
    ids: 'channel==MINE', startDate: iso(desde), endDate: iso(hoje),
    metrics: 'views,estimatedMinutesWatched,subscribersGained',
  });
  const [tv, tmin, tsubs] = (tot.data.rows || [[0, 0, 0]])[0];
  console.log(`canal no mesmo período: ${tv} views · ${(tmin / 60).toFixed(1)}h · +${tsubs} inscritos`);
  console.log(`os vídeos de venda são ${(vv / Math.max(1, tv) * 100).toFixed(1)}% das views do período`);

  // de onde vem a audiência desses vídeos
  console.log('\n=== DE ONDE VEIO A VIEW DOS VÍDEOS DE VENDA ===');
  const FONTE = { SUBSCRIBER: 'feed de inscrito', YT_SEARCH: 'busca', RELATED_VIDEO: 'sugerido', SHORTS: 'feed de Shorts', NO_LINK_OTHER: 'direto', YT_CHANNEL: 'página do canal', NOTIFICATION: 'notificação' };
  const somaFonte = {};
  for (const v of vendas) {
    const r = await ya.reports.query({
      ids: 'channel==MINE', startDate: iso(desde), endDate: iso(hoje),
      metrics: 'views', dimensions: 'insightTrafficSourceType', filters: `video==${v.id}`,
    });
    (r.data.rows || []).forEach(([f, n]) => { somaFonte[f] = (somaFonte[f] || 0) + n; });
  }
  Object.entries(somaFonte).sort((a, b) => b[1] - a[1])
    .forEach(([f, n]) => console.log(`  ${String(n).padStart(6)}  ${FONTE[f] || f}`));

  console.log(`\ninscritos hoje: ${ch.data.items[0].statistics.subscriberCount}`);
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
