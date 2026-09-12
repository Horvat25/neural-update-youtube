'use strict';
/**
 * ponte-alvos.js — escolhe o LONGO de destino e os Shorts que apontam pra ele.
 * Usado pelo link-booster.js e pelo set-related-video.js (a ponte Short -> longo).
 *
 * POR QUE (11/09/2026): os dois scripts olhavam só os 50 últimos uploads. Com 3 Shorts por dia
 * e o lote de 23 agendados subido de uma vez em 10/09, o longo mais recente saiu dessa janela e
 * o booster parou com "Nenhum video longo encontrado". E a janela de 48h era pela data de
 * UPLOAD: logo depois de um lote ela só enxergava vídeo agendado (privado, 0 view).
 * Agora: pagina os uploads, só aceita vídeo PÚBLICO e mede as 48h pela data de publicação.
 * Custo: 1 unidade de quota por página de 50 uploads + 1 pelos detalhes dela.
 */
const PAGINAS_MAX = 6;    // até 300 uploads, ~3 meses de grade
const HORAS_JANELA = 48;
const TOP_N = 3;
const POOL = 30;          // Shorts públicos recentes considerados

function duracao(iso) {
  const m = String(iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0;
}
const ehShort = v => duracao(v.contentDetails?.duration) <= 60 || /#short/i.test(v.snippet?.title || '');
const noAr = v => v.status?.privacyStatus === 'public';
const publicadoEm = v => new Date(v.snippet?.publishedAt || 0).getTime();

// Percorre os uploads do mais novo pro mais velho, 50 por vez, já com os detalhes de cada vídeo.
async function* uploads(youtube) {
  const ch = await youtube.channels.list({ part: ['contentDetails'], mine: true });
  const playlistId = ch.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) throw new Error('Sem playlist de uploads.');
  let pageToken;
  for (let p = 0; p < PAGINAS_MAX; p++) {
    const pl = await youtube.playlistItems.list({ part: ['contentDetails'], playlistId, maxResults: 50, pageToken });
    const ids = (pl.data.items || []).map(i => i.contentDetails.videoId).filter(Boolean);
    if (ids.length) {
      const det = await youtube.videos.list({ part: ['snippet', 'contentDetails', 'statistics', 'status'], id: ids });
      const porId = new Map((det.data.items || []).map(v => [v.id, v]));
      yield ids.map(id => porId.get(id)).filter(Boolean);   // mantém a ordem da playlist
    }
    pageToken = pl.data.nextPageToken;
    if (!pageToken) return;
  }
}

// O longo mais recente que JÁ ESTÁ NO AR (longo agendado não serve de destino).
async function acharLongo(youtube) {
  for await (const pagina of uploads(youtube)) {
    const longo = pagina.find(v => noAr(v) && !ehShort(v));
    if (longo) return longo;
  }
  return null;
}

// Os mais vistos entre os Shorts que ENTRARAM NO AR nas últimas 48h. Se forem menos de 3,
// os mais vistos entre os 15 Shorts publicados mais recentemente.
async function topShorts(youtube, longId) {
  const pool = [];
  for await (const pagina of uploads(youtube)) {
    pool.push(...pagina.filter(v => noAr(v) && ehShort(v) && v.id !== longId));
    if (pool.length >= POOL) break;
  }
  const corte = Date.now() - HORAS_JANELA * 3600e3;
  let candidatos = pool.filter(v => publicadoEm(v) > corte);
  if (candidatos.length < TOP_N) candidatos = [...pool].sort((a, b) => publicadoEm(b) - publicadoEm(a)).slice(0, 15);
  return candidatos
    .sort((a, b) => Number(b.statistics?.viewCount || 0) - Number(a.statistics?.viewCount || 0))
    .slice(0, TOP_N);
}

module.exports = { acharLongo, topShorts };
