'use strict';
/**
 * retencao-longos.js — ONDE o público desiste de cada vídeo LONGO.
 *
 * Puxa o relatório de retenção de audiência (audienceWatchRatio por
 * elapsedVideoTimeRatio) de todo vídeo com mais de 3 minutos e aponta:
 *   - a queda dos primeiros 30s (a que decide tudo, lei 1 do playbook)
 *   - os maiores degraus da curva (onde a galera saiu de uma vez)
 *   - onde cruza 50% da audiência
 *
 * A ideia é achar PADRÃO entre os vídeos: se a queda acontece sempre no mesmo
 * ponto relativo, o defeito é do nosso molde, não do tema.
 *
 * Uso: node retencao-longos.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const iso2s = d => {
  const m = (d || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
  return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
};

(async () => {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const yta = google.youtubeAnalytics({ version: 'v2', auth });

  const ch = await youtube.channels.list({ part: ['contentDetails'], mine: true });
  const uploads = ch.data.items[0].contentDetails.relatedPlaylists.uploads;

  const ids = [];
  let page;
  do {
    const pl = await youtube.playlistItems.list({
      part: ['contentDetails'], playlistId: uploads, maxResults: 50, pageToken: page,
    });
    (pl.data.items || []).forEach(i => ids.push(i.contentDetails.videoId));
    page = pl.data.nextPageToken;
  } while (page && ids.length < 250);

  const vids = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await youtube.videos.list({
      part: ['snippet', 'statistics', 'status', 'contentDetails'], id: ids.slice(i, i + 50),
    });
    vids.push(...(r.data.items || []));
  }

  const longos = vids
    .filter(v => v.status?.privacyStatus === 'public')
    .map(v => ({
      id: v.id,
      titulo: v.snippet.title,
      pub: v.snippet.publishedAt.slice(0, 10),
      dur: iso2s(v.contentDetails?.duration),
      views: +(v.statistics?.viewCount || 0),
    }))
    .filter(v => v.dur > 180)
    .sort((a, b) => new Date(a.pub) - new Date(b.pub));

  console.log(`\n${longos.length} vídeos longos públicos\n`);

  const quedasIniciais = [];
  const degrausTodos = [];

  for (const v of longos) {
    let rows;
    try {
      const r = await yta.reports.query({
        ids: 'channel==MINE',
        startDate: v.pub,
        endDate: new Date().toISOString().slice(0, 10),
        metrics: 'audienceWatchRatio',
        dimensions: 'elapsedVideoTimeRatio',
        filters: `video==${v.id}`,
      });
      rows = r.data.rows;
    } catch (e) {
      console.log(`── ${v.titulo.slice(0, 52)}\n   sem dado de retenção (${e.message.slice(0, 60)})\n`);
      continue;
    }
    if (!rows || rows.length < 5) {
      console.log(`── ${v.titulo.slice(0, 52)}\n   dado insuficiente (${v.views} views)\n`);
      continue;
    }

    // rows = [[ratio 0..1, watchRatio]]
    const pts = rows.map(([r, w]) => ({ r, w, s: Math.round(r * v.dur) })).sort((a, b) => a.r - b.r);
    const inicio = pts[0].w || 1;

    const em = seg => {
      const alvo = seg / v.dur;
      let melhor = pts[0];
      for (const p of pts) if (Math.abs(p.r - alvo) < Math.abs(melhor.r - alvo)) melhor = p;
      return melhor.w;
    };

    // maior degrau entre pontos consecutivos
    const degraus = [];
    for (let i = 1; i < pts.length; i++) {
      degraus.push({ de: pts[i - 1].s, ate: pts[i].s, perda: pts[i - 1].w - pts[i].w, restou: pts[i].w });
    }
    degraus.sort((a, b) => b.perda - a.perda);

    const metade = pts.find(p => p.w <= inicio * 0.5);
    const queda30 = ((inicio - em(30)) / inicio) * 100;
    quedasIniciais.push({ t: v.titulo, q: queda30, dur: v.dur, views: v.views });

    console.log(`── ${v.titulo.slice(0, 58)}`);
    console.log(`   ${Math.floor(v.dur / 60)}min${String(v.dur % 60).padStart(2, '0')} · ${v.views} views · publicado ${v.pub}`);
    console.log(`   perdeu ${queda30.toFixed(0)}% da audiência nos primeiros 30s`);
    if (metade) console.log(`   metade da audiência tinha saído em ${metade.s}s (${(metade.r * 100).toFixed(0)}% do vídeo)`);
    else console.log(`   nunca perdeu metade da audiência (curva forte)`);
    console.log(`   maiores quedas:`);
    degraus.slice(0, 3).forEach(d => {
      const pct = ((d.perda / inicio) * 100).toFixed(0);
      console.log(`      ${String(d.de).padStart(4)}s → ${String(d.ate).padStart(4)}s  caiu ${pct.padStart(2)}pp   (${(d.ate / v.dur * 100).toFixed(0)}% do vídeo)`);
      degrausTodos.push({ pctVideo: d.ate / v.dur, perda: d.perda / inicio, t: v.titulo });
    });
    console.log('');
  }

  if (quedasIniciais.length) {
    console.log(`\n=== PADRÃO: QUEDA DOS PRIMEIROS 30 SEGUNDOS ===`);
    quedasIniciais.sort((a, b) => a.q - b.q).forEach(x =>
      console.log(`   ${x.q.toFixed(0).padStart(3)}%  ${String(x.views).padStart(4)} views  ${x.t.slice(0, 50)}`));
    const m = quedasIniciais.reduce((s, x) => s + x.q, 0) / quedasIniciais.length;
    console.log(`   média do canal: ${m.toFixed(0)}%  (benchmark: perder 50% em 30s é o "vídeo médio")`);
  }

  if (degrausTodos.length) {
    console.log(`\n=== PADRÃO: EM QUE PONTO DO VÍDEO ESTÃO AS MAIORES QUEDAS ===`);
    const faixas = { '0-10%': 0, '10-25%': 0, '25-50%': 0, '50-75%': 0, '75-100%': 0 };
    degrausTodos.forEach(d => {
      const p = d.pctVideo;
      if (p <= .10) faixas['0-10%']++;
      else if (p <= .25) faixas['10-25%']++;
      else if (p <= .50) faixas['25-50%']++;
      else if (p <= .75) faixas['50-75%']++;
      else faixas['75-100%']++;
    });
    Object.entries(faixas).forEach(([f, n]) =>
      console.log(`   ${f.padEnd(8)} ${'█'.repeat(n)} ${n}`));
  }
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
