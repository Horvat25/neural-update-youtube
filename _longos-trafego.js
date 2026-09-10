'use strict';
/**
 * _longos-trafego.js — DE ONDE vem a view de cada vídeo longo, e quanto cada
 * minuto-por-view rende. É o diagnóstico que decide a estratégia das 4.000h.
 *
 * A conta que importa:  horas = nº de longos × views por longo × min por view
 * Como view é o recurso escasso (CTR é o gargalo), o multiplicador mais barato
 * é o MINUTO POR VIEW — ou seja, a duração do vídeo — desde que a retenção
 * segure. Este relatório mostra os dois lados lado a lado.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const s2 = d => { const m = (d || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []; return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)); };
const FONTE = {
  SUBSCRIBER: 'feed de inscrito', YT_SEARCH: 'BUSCA', RELATED_VIDEO: 'SUGERIDO',
  NO_LINK_OTHER: 'direto', EXT_URL: 'link externo', PLAYLIST: 'playlist',
  YT_CHANNEL: 'página do canal', NOTIFICATION: 'notificação', SHORTS: 'feed de Shorts',
  END_SCREEN: 'tela final', ANNOTATION: 'card', HASHTAGS: 'hashtag', YT_OTHER_PAGE: 'outra página',
};

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
  const longos = vids.filter(v => s2(v.contentDetails?.duration) > 180 && v.status?.privacyStatus === 'public')
    .sort((a, b) => new Date(a.snippet.publishedAt) - new Date(b.snippet.publishedAt));

  const hoje = new Date().toISOString().slice(0, 10);
  console.log('\nMIN/VIEW é o multiplicador: quanto cada view rende de hora assistida.\n');
  console.log('dur     ret%   views   min/view   horas   título');
  console.log('-'.repeat(96));
  const linhas = [];
  for (const v of longos) {
    const r = await ya.reports.query({
      ids: 'channel==MINE', startDate: v.snippet.publishedAt.slice(0, 10), endDate: hoje,
      metrics: 'views,estimatedMinutesWatched,averageViewPercentage', filters: `video==${v.id}`,
    });
    const [views, min, pct] = (r.data.rows || [[0, 0, 0]])[0];
    const d = s2(v.contentDetails.duration);
    const mpv = views ? min / views : 0;
    linhas.push({ id: v.id, d, pct, views, min, mpv, t: v.snippet.title });
    console.log(
      `${(Math.floor(d / 60) + 'm' + String(d % 60).padStart(2, '0')).padEnd(7)} ` +
      `${(pct || 0).toFixed(0).padStart(3)}%  ${String(views).padStart(5)}   ` +
      `${mpv.toFixed(2).padStart(6)}    ${(min / 60).toFixed(1).padStart(5)}h  ${v.snippet.title.slice(0, 46)}`
    );
  }

  console.log('\n=== DE ONDE VEIO A VIEW ===');
  for (const l of linhas) {
    const r = await ya.reports.query({
      ids: 'channel==MINE', startDate: '2026-06-01', endDate: hoje,
      metrics: 'views,estimatedMinutesWatched', dimensions: 'insightTrafficSourceType',
      filters: `video==${l.id}`, sort: '-views',
    });
    const fontes = (r.data.rows || []).map(([f, v2]) => `${FONTE[f] || f} ${v2}`).join(' · ');
    console.log(`\n${l.t.slice(0, 60)}\n   ${fontes || '(sem dado)'}`);
  }

  const totalMin = linhas.reduce((s, l) => s + l.min, 0);
  const mpvMedio = linhas.reduce((s, l) => s + l.mpv, 0) / linhas.length;
  console.log(`\n\n=== A CONTA DAS 4.000 HORAS ===`);
  console.log(`hoje: ${(totalMin / 60).toFixed(1)}h · min/view médio ${mpvMedio.toFixed(2)}`);
  const faltam = 4000 - totalMin / 60;
  console.log(`faltam ${faltam.toFixed(0)}h = ${(faltam * 60).toFixed(0)} min`);
  console.log(`\ncom o min/view de HOJE (${mpvMedio.toFixed(2)}): precisa de ${Math.round(faltam * 60 / mpvMedio).toLocaleString('pt-BR')} views em longo`);
  for (const [dur, ret] of [[12, .35], [20, .32], [25, .30], [45, .22]]) {
    const mpv = dur * ret;
    console.log(`  longo de ${String(dur).padStart(2)}min a ${(ret * 100).toFixed(0)}% = ${mpv.toFixed(1)} min/view → precisa de ${Math.round(faltam * 60 / mpv).toLocaleString('pt-BR')} views`);
  }
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
