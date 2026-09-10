'use strict';
/**
 * _ponte-longo.js — monta a lista de Shorts que devem apontar "Vídeo relacionado"
 * pro longo recém-publicado.
 *
 * ⚠️ O CAMPO "Vídeo relacionado" NÃO EXISTE NA API do YouTube (nem tela final, nem
 * cards). Só dá pra setar na interface do Studio, na mão. Este script não seta
 * nada — ele só produz a LISTA pronta pra colar, com link direto pra edição.
 *
 * Dois grupos, seguindo o pedido do Marcelo:
 *   A) os 5 Shorts com mais views nas últimas 48h  → tráfego que JÁ está quente
 *   B) todos os Shorts agendados até a data do PRÓXIMO longo → o vídeo novo herda
 *      a ponte assim que sai
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const LONGO = process.argv[2] || '9JyzY3QEZTk';           // longo que recebe o tráfego
const PROX_LONGO = process.argv[3] || '2026-08-16T23:00:00.000Z'; // quando sai o próximo
const iso = d => d.toISOString().slice(0, 10);

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const ya = google.youtubeAnalytics({ version: 'v2', auth });

  const alvo = await yt.videos.list({ part: ['snippet'], id: [LONGO] });
  console.log(`\nPONTE PARA: ${alvo.data.items[0].snippet.title}`);
  console.log(`https://youtu.be/${LONGO}\n`);

  // ---- A) top 5 das últimas 48h
  const d48 = new Date(Date.now() - 2 * 86400e3);
  const rel = await ya.reports.query({
    ids: 'channel==MINE', startDate: iso(d48), endDate: iso(new Date()),
    metrics: 'views', dimensions: 'video', sort: '-views', maxResults: 20,
  });
  const topIds = (rel.data.rows || []).map(r => r[0]).slice(0, 12);
  const det = topIds.length ? await yt.videos.list({ part: ['snippet', 'contentDetails'], id: topIds }) : { data: { items: [] } };
  const dur = v => { const m = (v.contentDetails.duration || '').match(/PT(?:(\d+)M)?(?:(\d+)S)?/) || []; return (+(m[1] || 0)) * 60 + (+(m[2] || 0)); };
  const porId = Object.fromEntries((det.data.items || []).map(v => [v.id, v]));

  console.log('=== A) OS 5 MAIS VISTOS NAS ÚLTIMAS 48H (já estão quentes) ===\n');
  let n = 0;
  for (const [id, views] of (rel.data.rows || [])) {
    const v = porId[id];
    if (!v || dur(v) > 180 || id === LONGO) continue;      // só Short, e não o próprio longo
    n++;
    console.log(`${n}. ${views} views · ${v.snippet.title.slice(0, 52)}`);
    console.log(`   https://studio.youtube.com/video/${id}/edit\n`);
    if (n >= 5) break;
  }

  // ---- B) agendados até o próximo longo
  const ch = await yt.channels.list({ part: ['contentDetails'], mine: true });
  const up = ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  const ids = []; let p;
  do {
    const pl = await yt.playlistItems.list({ part: ['contentDetails'], playlistId: up, maxResults: 50, pageToken: p });
    (pl.data.items || []).forEach(i => ids.push(i.contentDetails.videoId));
    p = pl.data.nextPageToken;
  } while (p && ids.length < 200);

  const todos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await yt.videos.list({ part: ['snippet', 'status', 'contentDetails'], id: ids.slice(i, i + 50) });
    todos.push(...(r.data.items || []));
  }
  const limite = new Date(PROX_LONGO);
  const agendados = todos
    .filter(v => v.status?.privacyStatus === 'private' && v.status?.publishAt)
    .filter(v => { const q = new Date(v.status.publishAt); return q > new Date() && q <= limite; })
    .filter(v => dur(v) <= 180)
    .sort((a, b) => new Date(a.status.publishAt) - new Date(b.status.publishAt));

  console.log(`=== B) AGENDADOS ATÉ O PRÓXIMO LONGO (${PROX_LONGO.slice(0, 10)}) ===\n`);
  agendados.forEach((v, i) => {
    const q = new Date(new Date(v.status.publishAt).getTime() - 3 * 3600e3);
    console.log(`${i + 1}. ${q.toISOString().slice(5, 16).replace('T', ' ')}h BRT · ${v.snippet.title.slice(0, 46)}`);
    console.log(`   https://studio.youtube.com/video/${v.id}/edit\n`);
  });
  console.log(`total: ${n} quentes + ${agendados.length} agendados = ${n + agendados.length} vídeos pra apontar`);
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
