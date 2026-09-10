'use strict';
/**
 * raiox.js — comparação HONESTA entre a remessa dos últimos 10 dias e a anterior.
 *
 * O truque: views brutas mentem (vídeo de ontem nunca ganha do de 15 dias).
 * Então medimos "views nas primeiras 72h" de cada vídeo via Analytics — mesma
 * régua pra todo mundo. Vídeo com menos de 72h completas fica marcado (parcial)
 * e é excluído das medianas.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const JANELA = 3;              // dias de vida medidos
const DIAS_TOTAL = 24;         // quanto histórico puxar

const iso = d => d.toISOString().slice(0, 10);
const brt = s => new Date(new Date(s).getTime() - 3 * 3600e3);
const med = a => { if (!a.length) return 0; const s=[...a].sort((x,y)=>x-y); const m=s.length>>1;
  return s.length%2 ? s[m] : Math.round((s[m-1]+s[m])/2); };

function slotDe(h) {
  if (h >= 6 && h < 11) return '08h noticia';
  if (h >= 11 && h < 16) return '14h aula/VSL';
  if (h >= 16 && h < 21) return '18h saga';
  if (h >= 21 || h < 3)  return '22h viral';
  return `${h}h avulso`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const ya = google.youtubeAnalytics({ version: 'v2', auth });

  const ch = await youtube.channels.list({ part: ['contentDetails','statistics','snippet'], mine: true });
  const uploads = ch.data.items[0].contentDetails.relatedPlaylists.uploads;

  const ids = [];
  let page;
  do {
    const pl = await youtube.playlistItems.list({ part:['contentDetails'], playlistId: uploads, maxResults:50, pageToken: page });
    (pl.data.items||[]).forEach(i => { const id = i.contentDetails.videoId; if (!ids.includes(id)) ids.push(id); });
    page = pl.data.nextPageToken;
  } while (page && ids.length < 120);

  const agendados = [];
  const corte = Date.now() - DIAS_TOTAL * 864e5;
  const vids = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await youtube.videos.list({ part:['snippet','statistics','contentDetails','status'], id: ids.slice(i, i+50) });
    for (const v of r.data.items) {
      const t = new Date(v.snippet.publishedAt).getTime();
      if (t < corte) continue;
      // vídeo AGENDADO ainda não estreou: publishedAt é a data do upload, não da
      // estreia. Contar como publicado dá "0 view" e envenena as medianas.
      if (v.status.privacyStatus !== 'public') { agendados.push(v.snippet.title); continue; }
      const dur = v.contentDetails.duration;
      const mm = /PT(?:(\d+)M)?(?:(\d+)S)?/.exec(dur) || [];
      const segs = (+mm[1]||0)*60 + (+mm[2]||0);
      vids.push({
        id: v.id, title: v.snippet.title, pub: v.snippet.publishedAt, t, segs,
        views: +v.statistics.viewCount||0, likes: +v.statistics.likeCount||0,
        idadeDias: (Date.now()-t)/864e5,
        slot: slotDe(brt(v.snippet.publishedAt).getUTCHours()),
      });
    }
  }
  vids.sort((a,b) => b.t - a.t);

  if (agendados.length) console.log(`(ignorados ${agendados.length} agendados/privados que ainda não estrearam)`);
  console.log(`Vídeos nos últimos ${DIAS_TOTAL} dias: ${vids.length}\nMedindo primeiras ${JANELA*24}h de cada um...\n`);

  for (const v of vids) {
    const d0 = new Date(v.t);
    const d1 = new Date(v.t + JANELA * 864e5);
    v.parcial = v.idadeDias < JANELA;
    try {
      const r = await ya.reports.query({
        ids: 'channel==MINE', startDate: iso(d0), endDate: iso(d1),
        metrics: 'views,averageViewPercentage,averageViewDuration,subscribersGained,likes,shares',
        filters: `video==${v.id}`,
      });
      const row = (r.data.rows||[])[0] || [];
      v.v72 = row[0]||0; v.avp = row[1]||0; v.avd = row[2]||0;
      v.subs = row[3]||0; v.lk = row[4]||0; v.sh = row[5]||0;
    } catch (e) { v.err = e.message; }
    try {
      const r2 = await ya.reports.query({
        ids: 'channel==MINE', startDate: iso(d0), endDate: iso(d1),
        metrics: 'views', dimensions: 'insightTrafficSourceType', filters: `video==${v.id}`,
      });
      v.traf = Object.fromEntries((r2.data.rows||[]).map(x => [x[0], x[1]]));
    } catch (e) { v.traf = {}; }
    await sleep(120);
  }

  const linha = v => [
    String(v.v72).padStart(5),
    (v.avp ? v.avp.toFixed(0)+'%' : '  -').padStart(5),
    (v.avd ? v.avd+'s' : '  -').padStart(5),
    String(v.subs).padStart(4),
    String(v.segs+'s').padStart(5),
    v.slot.padEnd(13),
    iso(brt(v.pub)),
    (v.parcial ? '~' : ' ') + v.title.slice(0, 46),
  ].join(' ');

  const recente = vids.filter(v => v.idadeDias <= 10);
  const anterior = vids.filter(v => v.idadeDias > 10 && v.idadeDias <= 20);

  for (const [nome, grupo] of [['ULTIMOS 10 DIAS', recente], ['10 DIAS ANTERIORES', anterior]]) {
    console.log(`\n===== ${nome} (n=${grupo.length}) =====`);
    console.log(' v72   ret%   avd subs   dur slot          data       titulo   (~ = ainda nao fechou 72h)');
    grupo.forEach(v => console.log(linha(v)));
    const fech = grupo.filter(v => !v.parcial);
    console.log(`-> mediana v72 (só fechados, n=${fech.length}): ${med(fech.map(v=>v.v72))}` +
      ` | ret% mediana ${med(fech.map(v=>Math.round(v.avp)))}` +
      ` | subs total ${grupo.reduce((s,v)=>s+v.subs,0)}`);
  }

  console.log('\n===== POR SLOT (v72, só fechados) =====');
  const fechados = vids.filter(v => !v.parcial);
  const slots = [...new Set(fechados.map(v=>v.slot))];
  for (const s of slots) {
    const a = fechados.filter(v=>v.slot===s);
    const r = a.filter(v=>v.idadeDias<=10), p = a.filter(v=>v.idadeDias>10&&v.idadeDias<=20);
    console.log(`${s.padEnd(14)} geral n=${String(a.length).padStart(2)} med ${String(med(a.map(v=>v.v72))).padStart(4)}` +
      ` | 10d n=${String(r.length).padStart(2)} med ${String(med(r.map(v=>v.v72))).padStart(4)}` +
      ` | anterior n=${String(p.length).padStart(2)} med ${String(med(p.map(v=>v.v72))).padStart(4)}` +
      ` | ret% ${med(a.map(v=>Math.round(v.avp)))}`);
  }

  console.log('\n===== DURACAO x DESEMPENHO (v72, só fechados) =====');
  const faixas = [[0,35,'ate 35s'],[36,42,'36-42s'],[43,48,'43-48s'],[49,60,'49-60s'],[61,9999,'longo']];
  for (const [a,b,nome] of faixas) {
    const g = fechados.filter(v=>v.segs>=a&&v.segs<=b);
    if (!g.length) continue;
    console.log(`${nome.padEnd(8)} n=${String(g.length).padStart(2)} med ${String(med(g.map(v=>v.v72))).padStart(4)} | ret% ${med(g.map(v=>Math.round(v.avp)))}`);
  }

  console.log('\n===== TOP 8 (v72) =====');
  [...fechados].sort((a,b)=>b.v72-a.v72).slice(0,8).forEach(v =>
    console.log(String(v.v72).padStart(5)+`  ret ${String(Math.round(v.avp)).padStart(3)}%  +${String(v.subs).padStart(2)}sub  ${v.title.slice(0,58)}`));
  console.log('\n===== PIORES 8 (v72) =====');
  [...fechados].sort((a,b)=>a.v72-b.v72).slice(0,8).forEach(v =>
    console.log(String(v.v72).padStart(5)+`  ret ${String(Math.round(v.avp)).padStart(3)}%  +${String(v.subs).padStart(2)}sub  ${v.title.slice(0,58)}`));

  console.log('\n===== TRAFEGO (soma 72h, últimos 10 dias) =====');
  const tr = {};
  recente.forEach(v => Object.entries(v.traf||{}).forEach(([k,n]) => tr[k]=(tr[k]||0)+n));
  const tot = Object.values(tr).reduce((a,b)=>a+b,0)||1;
  Object.entries(tr).sort((a,b)=>b[1]-a[1]).forEach(([k,n]) =>
    console.log(`${k.padEnd(24)} ${String(n).padStart(6)}  ${(n/tot*100).toFixed(1)}%`));

  require('fs').writeFileSync(
    'C:/Users/MATEUS~1/AppData/Local/Temp/claude/D--Neural-Update/31e309e3-fcc0-4760-9fd9-748c88c33b1a/scratchpad/raiox.json',
    JSON.stringify(vids, null, 1));
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
