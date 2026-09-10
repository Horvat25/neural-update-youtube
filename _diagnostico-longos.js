'use strict';
/**
 * _diagnostico-longos.js — a autópsia completa dos vídeos LONGOS do canal.
 *
 * Responde as 4 perguntas que o Marcelo fez em 20/08/2026, na ordem em que
 * elas decidem o próximo vídeo:
 *   1. quais bombaram e quais não, e quanto cada um rendeu de HORA
 *   2. é miniatura? (muita impressão e pouco clique) ou é distribuição? (sem impressão)
 *   3. onde exatamente a pessoa SAI do vídeo (curva de retenção)
 *   4. de onde vem a view de cada um
 *
 * ⚠️ Impressão e CTR: a doc antiga dizia que a API não expõe. Expõe sim, como
 * `impressions` e `impressionClickThroughRate` — mas só em algumas combinações de
 * dimensão. Se der erro, o script avisa em vez de mentir zero.
 *
 *   node _diagnostico-longos.js [dias]
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const DIAS = parseInt(process.argv[2] || '400', 10);
const hoje = new Date();
const ini = new Date(hoje.getTime() - DIAS * 86400000).toISOString().slice(0, 10);
const fim = hoje.toISOString().slice(0, 10);

const dur = d => { const m = (d || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []; return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)); };
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const ya = google.youtubeAnalytics({ version: 'v2', auth });

  // 1) todos os vídeos do canal, separando longo de Short pela DURAÇÃO
  const ch = await yt.channels.list({ part: ['contentDetails'], mine: true });
  const up = ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  let ids = [], page;
  do {
    const pl = await yt.playlistItems.list({ part: ['contentDetails'], playlistId: up, maxResults: 50, pageToken: page });
    (pl.data.items || []).forEach(i => ids.push(i.contentDetails.videoId));
    page = pl.data.nextPageToken;
  } while (page);

  const longos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const v = await yt.videos.list({ part: ['snippet', 'contentDetails', 'status'], id: ids.slice(i, i + 50) });
    for (const x of v.data.items) {
      const seg = dur(x.contentDetails.duration);
      if (seg <= 185 || /#Shorts/i.test(x.snippet.title)) continue;  // Short vai até 3 min em 2026
      if (x.status.privacyStatus !== "public") continue;
      if (longos.some(y => y.id === x.id)) continue;   // a playlist de uploads às vezes repete
      longos.push({ id: x.id, titulo: x.snippet.title, seg, publicado: x.snippet.publishedAt.slice(0, 10) });
    }
  }
  longos.sort((a, b) => a.publicado.localeCompare(b.publicado));
  console.log(`${ids.length} vídeos no canal · ${longos.length} LONGOS públicos (>62s)\n`);

  const pede = async (p) => { try { const r = await ya.reports.query(p); return r.data; } catch (e) { return { _erro: e.message }; } };

  // 2) desempenho de cada longo
  const linhas = [];
  for (const L of longos) {
    const m = await pede({
      ids: 'channel==MINE', startDate: ini, endDate: fim, filters: `video==${L.id}`,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares',
    });
    const r = m.rows?.[0] || [];
    L.views = r[0] || 0; L.min = r[1] || 0; L.avgSeg = r[2] || 0; L.avgPct = r[3] || 0;
    L.subs = r[4] || 0; L.likes = r[5] || 0; L.coments = r[6] || 0; L.shares = r[7] || 0;
    L.horas = (L.min / 60);

    // impressão e CTR — o dado que separa "capa ruim" de "sem distribuição"
    const imp = await pede({
      ids: 'channel==MINE', startDate: ini, endDate: fim, filters: `video==${L.id}`,
      metrics: 'impressions,impressionClickThroughRate',
    });
    if (imp._erro) { L.impErro = imp._erro.slice(0, 60); }
    else { L.imp = imp.rows?.[0]?.[0] || 0; L.ctr = imp.rows?.[0]?.[1] || 0; }
    linhas.push(L);
  }

  console.log('═══ DESEMPENHO (ordenado por HORA gerada, que é o que vale pra meta) ═══');
  console.log('horas  views  dur    %vis  min/view  impressões  CTR    subs  título');
  [...linhas].sort((a, b) => b.horas - a.horas).forEach(L => {
    const mpv = L.views ? (L.min / L.views) : 0;
    console.log(
      String(L.horas.toFixed(1)).padStart(5),
      String(L.views).padStart(6),
      mmss(L.seg).padStart(6),
      String(L.avgPct.toFixed(0) + '%').padStart(5),
      String(mpv.toFixed(1)).padStart(9),
      String(L.imp ?? '—').padStart(11),
      String(L.ctr != null ? L.ctr.toFixed(1) + '%' : '—').padStart(6),
      String(L.subs).padStart(5),
      ' ' + L.titulo.slice(0, 46));
  });
  if (linhas.some(L => L.impErro)) console.log('\n⚠️ impressões/CTR indisponíveis: ' + linhas.find(L => L.impErro).impErro);

  // 3) ONDE a pessoa sai — curva de retenção dos 3 mais vistos
  console.log('\n═══ ONDE A PESSOA SAI (curva de retenção) ═══');
  const top = [...linhas].sort((a, b) => b.views - a.views).slice(0, 3);
  for (const L of top) {
    const c = await pede({
      ids: 'channel==MINE', startDate: ini, endDate: fim, filters: `video==${L.id};audienceType==ORGANIC`,
      metrics: 'audienceWatchRatio,relativeRetentionPerformance', dimensions: 'elapsedVideoTimeRatio',
    });
    if (c._erro || !c.rows) { console.log(`\n${L.titulo.slice(0, 50)} — sem curva (${(c._erro || 'sem dados').slice(0, 50)})`); continue; }
    console.log(`\n▬ ${L.titulo.slice(0, 56)}  (${mmss(L.seg)} · ${L.views} views)`);
    // amostra a cada 10% + acha a maior queda
    let anterior = null, maiorQueda = { de: 0, queda: 0 };
    const amostra = [];
    for (const [ratio, wr] of c.rows) {
      if (anterior !== null) {
        const q = anterior.wr - wr;
        if (q > maiorQueda.queda) maiorQueda = { de: anterior.ratio, para: ratio, queda: q };
      }
      anterior = { ratio, wr };
      if (Math.abs((ratio * 100) % 10) < 0.6) amostra.push([ratio, wr]);
    }
    console.log('  ' + amostra.map(([r, w]) => `${Math.round(r * 100)}%:${(w * 100).toFixed(0)}`).join('  '));
    console.log(`  → MAIOR QUEDA entre ${Math.round(maiorQueda.de * 100)}% e ${Math.round((maiorQueda.para || 0) * 100)}% do vídeo `
      + `(${mmss(maiorQueda.de * L.seg)} → ${mmss((maiorQueda.para || 0) * L.seg)}), perdeu ${(maiorQueda.queda * 100).toFixed(0)} pontos`);
  }

  // 4) de onde vem a view
  console.log('\n═══ DE ONDE VEM A VIEW ═══');
  for (const L of top) {
    const t = await pede({
      ids: 'channel==MINE', startDate: ini, endDate: fim, filters: `video==${L.id}`,
      metrics: 'views', dimensions: 'insightTrafficSourceType', sort: '-views',
    });
    if (t._erro || !t.rows) { console.log(`${L.titulo.slice(0, 40)} — sem dado`); continue; }
    const total = t.rows.reduce((a, r) => a + r[1], 0) || 1;
    console.log(`\n▬ ${L.titulo.slice(0, 56)}`);
    t.rows.slice(0, 5).forEach(([fonte, v]) => console.log(`   ${String(v).padStart(4)} (${(v / total * 100).toFixed(0)}%)  ${fonte}`));
  }
})().catch(e => { console.error('ERRO:', e.message); process.exitCode = 1; });
