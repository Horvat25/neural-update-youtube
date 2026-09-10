'use strict';
/**
 * _skip.js — taxa de SKIP no início do vídeo (a pergunta: "pularam logo de cara?").
 *
 * Usa o relatório audienceRetention (dimension elapsedVideoTimeRatio, metric
 * audienceWatchRatio). A curva vem em % do vídeo, não em segundos — como nossos
 * vídeos têm durações diferentes, converto pra SEGUNDO ABSOLUTO por interpolação.
 * Comparar "retenção aos 10% do vídeo" entre um de 36s e um de 55s seria comparar
 * 3,6s com 5,5s: parece skip e é só duração.
 *
 * skip3s = 1 - audienceWatchRatio no segundo 3.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const JANELA = 3;
const DIAS_TOTAL = 24;
const iso = d => d.toISOString().slice(0, 10);
const brt = s => new Date(new Date(s).getTime() - 3 * 3600e3);
const med = a => { if (!a.length) return 0; const s=[...a].sort((x,y)=>x-y); const m=s.length>>1;
  return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// interpola a curva (pares [ratio, watchRatio]) no instante t segundos
function emSegundo(curva, segs, t) {
  if (!curva.length) return null;
  const alvo = t / segs;
  if (alvo > 1) return null;
  let prev = curva[0];
  for (const p of curva) {
    if (p[0] >= alvo) {
      if (p[0] === prev[0]) return p[1];
      const f = (alvo - prev[0]) / (p[0] - prev[0]);
      return prev[1] + f * (p[1] - prev[1]);
    }
    prev = p;
  }
  return prev[1];
}

(async () => {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const ya = google.youtubeAnalytics({ version: 'v2', auth });

  const ch = await youtube.channels.list({ part: ['contentDetails'], mine: true });
  const uploads = ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  const ids = []; let page;
  do {
    const pl = await youtube.playlistItems.list({ part:['contentDetails'], playlistId: uploads, maxResults:50, pageToken: page });
    (pl.data.items||[]).forEach(i => { const id=i.contentDetails.videoId; if(!ids.includes(id)) ids.push(id); });
    page = pl.data.nextPageToken;
  } while (page && ids.length < 120);

  const corte = Date.now() - DIAS_TOTAL * 864e5;
  const vids = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await youtube.videos.list({ part:['snippet','contentDetails','status'], id: ids.slice(i,i+50) });
    for (const v of r.data.items) {
      const t = new Date(v.snippet.publishedAt).getTime();
      if (t < corte || v.status.privacyStatus !== 'public') continue;
      const mm = /PT(?:(\d+)M)?(?:(\d+)S)?/.exec(v.contentDetails.duration) || [];
      const segs = (+mm[1]||0)*60 + (+mm[2]||0);
      if (segs > 60 || segs < 10) continue;                 // só Shorts
      if ((Date.now()-t)/864e5 < JANELA) continue;          // só quem fechou 72h
      vids.push({ id:v.id, title:v.snippet.title, t, segs, idadeDias:(Date.now()-t)/864e5 });
    }
  }
  vids.sort((a,b)=>b.t-a.t);
  console.log(`Shorts com 72h fechadas nos últimos ${DIAS_TOTAL} dias: ${vids.length}\nPuxando curva de retenção...\n`);

  for (const v of vids) {
    const d0 = new Date(v.t), d1 = new Date(v.t + JANELA*864e5);
    try {
      const r = await ya.reports.query({
        ids:'channel==MINE', startDate: iso(d0), endDate: iso(d1),
        metrics:'audienceWatchRatio', dimensions:'elapsedVideoTimeRatio',
        filters:`video==${v.id}`, sort:'elapsedVideoTimeRatio',
      });
      const curva = (r.data.rows||[]).map(x=>[x[0], x[1]]);
      v.curva = curva;
      v.r1 = emSegundo(curva, v.segs, 1);
      v.r3 = emSegundo(curva, v.segs, 3);
      v.r5 = emSegundo(curva, v.segs, 5);
      v.r10 = emSegundo(curva, v.segs, 10);
    } catch (e) { v.err = e.message; }
    await sleep(150);
  }

  const ok = vids.filter(v => v.curva && v.curva.length > 3 && v.r3 != null);
  const A = ok.filter(v=>v.idadeDias<=10), B = ok.filter(v=>v.idadeDias>10&&v.idadeDias<=20);
  const pct = x => x==null ? '  - ' : (x*100).toFixed(0)+'%';

  for (const [nome,g] of [['ULTIMOS 10 DIAS',A],['10 DIAS ANTERIORES',B]]) {
    console.log(`\n===== ${nome} (n=${g.length}) =====`);
    console.log(' 1s    3s    5s   10s  skip3s  dur  data       titulo');
    g.forEach(v => console.log(
      [pct(v.r1),pct(v.r3),pct(v.r5),pct(v.r10)].map(s=>s.padStart(5)).join(' ') +
      '  ' + (v.r3!=null ? ((1-v.r3)*100).toFixed(0)+'%' : '-').padStart(5) +
      '  ' + (v.segs+'s').padStart(4) + '  ' + iso(brt(new Date(v.t))) + '  ' + v.title.slice(0,42)));
    if (!g.length) continue;
    console.log(`-> MEDIANAS  1s ${pct(med(g.map(v=>v.r1).filter(x=>x!=null)))}` +
      `  3s ${pct(med(g.map(v=>v.r3)))}` +
      `  5s ${pct(med(g.map(v=>v.r5).filter(x=>x!=null)))}` +
      `  10s ${pct(med(g.map(v=>v.r10).filter(x=>x!=null)))}` +
      `  ||  SKIP nos 3s: ${((1-med(g.map(v=>v.r3)))*100).toFixed(1)}%`);
  }

  console.log('\n===== PIORES SKIP nos 3s (últimos 10 dias) =====');
  [...A].sort((a,b)=>a.r3-b.r3).slice(0,8).forEach(v =>
    console.log(`skip ${((1-v.r3)*100).toFixed(0)}%`.padStart(9) + `  ret3s ${pct(v.r3)}  ${v.segs}s  ${v.title.slice(0,52)}`));
  console.log('\n===== MELHORES (seguraram os 3s) =====');
  [...A].sort((a,b)=>b.r3-a.r3).slice(0,8).forEach(v =>
    console.log(`skip ${((1-v.r3)*100).toFixed(0)}%`.padStart(9) + `  ret3s ${pct(v.r3)}  ${v.segs}s  ${v.title.slice(0,52)}`));

  require('fs').writeFileSync(require('path').join(__dirname,'_skip.json'), JSON.stringify(vids,null,1));
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
