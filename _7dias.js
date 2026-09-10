'use strict';
/**
 * _7dias.js — raio-X dos vídeos PUBLICADOS nos últimos 7 dias.
 *
 * Usa viewCount PÚBLICO (videos.list), não o Analytics: o Analytics atrasa
 * 24-48h e mostraria 0 view em vídeo novo (susto já registrado na memória).
 *
 * Agrupa por SLOT da grade (08h notícia · 14h aula/VSL · 18h viral) pra
 * responder a pergunta que importa: qual slot e qual formato estão puxando.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const DIAS = Number(process.argv[2] || 7);

const fmtBRT = iso => new Date(new Date(iso).getTime() - 3 * 3600e3);
const hhBRT = iso => fmtBRT(iso).getUTCHours();
const dataBRT = iso => fmtBRT(iso).toISOString().slice(0, 10);

function slotDe(h) {
  if (h >= 6 && h < 11) return '08h notícia';
  if (h >= 11 && h < 16) return '14h aula/VSL';
  if (h >= 16 && h < 21) return '18h viral';
  return `${String(h).padStart(2, '0')}h fora da grade`;
}

const med = a => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

(async () => {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const ch = await youtube.channels.list({ part: ['contentDetails', 'statistics', 'snippet'], mine: true });
  const c = ch.data.items[0];
  const uploads = c.contentDetails.relatedPlaylists.uploads;

  // pega bastante e filtra por data (uploads vem em ordem de publicação)
  const ids = [];
  let page;
  do {
    const pl = await youtube.playlistItems.list({
      part: ['contentDetails'], playlistId: uploads, maxResults: 50, pageToken: page,
    });
    (pl.data.items || []).forEach(i => ids.push(i.contentDetails.videoId));
    page = pl.data.nextPageToken;
  } while (page && ids.length < 100);

  const vids = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await youtube.videos.list({
      part: ['snippet', 'statistics', 'status', 'contentDetails'], id: ids.slice(i, i + 50),
    });
    vids.push(...(r.data.items || []));
  }

  const limite = Date.now() - DIAS * 864e5;
  const pub = vids
    .filter(v => v.status?.privacyStatus === 'public')
    .filter(v => new Date(v.snippet.publishedAt).getTime() >= limite)
    .map(v => {
      const dur = v.contentDetails?.duration || '';
      const m = dur.match(/PT(?:(\d+)M)?(?:(\d+)S)?/) || [];
      const segs = (+(m[1] || 0)) * 60 + (+(m[2] || 0));
      return {
        id: v.id,
        titulo: v.snippet.title,
        quando: v.snippet.publishedAt,
        dia: dataBRT(v.snippet.publishedAt),
        hora: hhBRT(v.snippet.publishedAt),
        slot: slotDe(hhBRT(v.snippet.publishedAt)),
        segs,
        tipo: segs > 180 ? 'LONGO' : 'short',
        views: +(v.statistics?.viewCount || 0),
        likes: +(v.statistics?.likeCount || 0),
        coment: +(v.statistics?.commentCount || 0),
      };
    })
    .sort((a, b) => b.views - a.views);

  console.log(`\n=== CANAL ===`);
  console.log(`${c.snippet.title} · ${(+c.statistics.subscriberCount).toLocaleString('pt-BR')} inscritos · ` +
    `${(+c.statistics.viewCount).toLocaleString('pt-BR')} views · ${c.statistics.videoCount} vídeos`);

  console.log(`\n=== PUBLICADOS NOS ÚLTIMOS ${DIAS} DIAS: ${pub.length} ===`);
  console.log('views  like  com  dur   slot            título');
  pub.forEach(v => {
    console.log(
      String(v.views).padStart(5) + '  ' +
      String(v.likes).padStart(4) + '  ' +
      String(v.coment).padStart(3) + '  ' +
      (String(v.segs) + 's').padStart(5) + '  ' +
      v.slot.padEnd(15) + ' ' +
      v.titulo.slice(0, 58)
    );
  });

  const porSlot = {};
  pub.forEach(v => { (porSlot[v.slot] ||= []).push(v.views); });
  console.log(`\n=== POR SLOT (mediana é o que importa, média mente com outlier) ===`);
  Object.entries(porSlot)
    .sort((a, b) => med(b[1]) - med(a[1]))
    .forEach(([s, arr]) => {
      console.log(`${s.padEnd(16)} n=${String(arr.length).padStart(2)}  mediana ${String(med(arr)).padStart(4)}  ` +
        `média ${String(Math.round(arr.reduce((x, y) => x + y, 0) / arr.length)).padStart(4)}  ` +
        `min ${Math.min(...arr)}  max ${Math.max(...arr)}`);
    });

  const faixas = { '≤30s': [], '31-45s': [], '46-60s': [], '61s+': [], 'LONGO': [] };
  pub.forEach(v => {
    if (v.tipo === 'LONGO') faixas['LONGO'].push(v.views);
    else if (v.segs <= 30) faixas['≤30s'].push(v.views);
    else if (v.segs <= 45) faixas['31-45s'].push(v.views);
    else if (v.segs <= 60) faixas['46-60s'].push(v.views);
    else faixas['61s+'].push(v.views);
  });
  console.log(`\n=== POR DURAÇÃO ===`);
  Object.entries(faixas).filter(([, a]) => a.length).forEach(([f, a]) => {
    console.log(`${f.padEnd(8)} n=${String(a.length).padStart(2)}  mediana ${String(med(a)).padStart(4)}  max ${Math.max(...a)}`);
  });

  const tot = pub.reduce((s, v) => s + v.views, 0);
  const shorts = pub.filter(v => v.tipo === 'short');
  console.log(`\n=== RESUMO ===`);
  console.log(`views somadas: ${tot}  |  por vídeo: média ${Math.round(tot / (pub.length || 1))}, mediana ${med(pub.map(v => v.views))}`);
  console.log(`shorts: ${shorts.length} (mediana ${med(shorts.map(v => v.views))})  |  longos: ${pub.length - shorts.length}`);
  const zero = pub.filter(v => v.views < 20);
  if (zero.length) {
    console.log(`\n⚠️ abaixo de 20 views (${zero.length}):`);
    zero.forEach(v => console.log(`   ${String(v.views).padStart(3)}  ${v.dia} ${String(v.hora).padStart(2)}h  ${v.titulo.slice(0, 55)}`));
  }
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
