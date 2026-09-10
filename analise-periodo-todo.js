'use strict';
/**
 * analise-periodo-todo.js — raio-X do canal desde o PRIMEIRO vídeo.
 * 1) trajetória semana a semana  2) concentração (quantos vídeos fazem as views)
 * 3) a "morte aos 7 dias" testada em VÁRIAS janelas, não só uma
 * Uso: node analise-periodo-todo.js
 */
const { google, getAuthorizedClient } = require('./youtube-auth');
const pad = (s, n) => String(s).padEnd(n).slice(0, n);

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const ya = google.youtubeAnalytics({ version: 'v2', auth });

  const ch = await yt.channels.list({ part: 'contentDetails,statistics', mine: true });
  const up = ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  const st = ch.data.items[0].statistics;

  const ids = []; let pt;
  do {
    const pl = await yt.playlistItems.list({ part: 'contentDetails', playlistId: up, maxResults: 50, pageToken: pt });
    pl.data.items.forEach(i => ids.push(i.contentDetails.videoId));
    pt = pl.data.nextPageToken;
  } while (pt);

  const V = {};
  for (let i = 0; i < ids.length; i += 50) {
    const d = await yt.videos.list({ part: 'snippet,statistics,status,contentDetails', id: ids.slice(i, i + 50).join(',') });
    d.data.items.forEach(v => {
      if (v.status.publishAt) return; // ignora agendado / estacionado em 2099
      const m = (v.contentDetails.duration || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const seg = m ? ((+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0))) : 0;
      V[v.id] = { t: v.snippet.title, p: new Date(v.snippet.publishedAt), views: +(v.statistics.viewCount || 0), seg };
    });
  }

  const lista = Object.values(V).sort((a, b) => a.p - b.p);
  const primeiro = lista[0].p;
  const dias = Math.round((Date.now() - primeiro) / 864e5);
  const ini = primeiro.toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

  console.log('\n== CANAL ==');
  console.log('Primeiro video:', ini, ' (' + dias + ' dias atras)');
  console.log('Videos publicados:', lista.length, '| inscritos:', st.subscriberCount, '| views totais:', st.viewCount);
  const longos = lista.filter(v => v.seg > 90);
  console.log('Shorts:', lista.length - longos.length, '| longos:', longos.length);

  console.log('\n== 1. TRAJETORIA SEMANA A SEMANA ==');
  const dia = await ya.reports.query({
    ids: 'channel==MINE', startDate: ini, endDate: ontem,
    metrics: 'views,estimatedMinutesWatched,subscribersGained', dimensions: 'day',
  });
  const sem = {};
  (dia.data.rows || []).forEach(([d, v, min, sub]) => {
    const dt = new Date(d); const dow = (dt.getUTCDay() + 6) % 7;
    dt.setUTCDate(dt.getUTCDate() - dow);
    const k = dt.toISOString().slice(0, 10);
    if (!sem[k]) sem[k] = { v: 0, min: 0, sub: 0, d: 0 };
    sem[k].v += v; sem[k].min += min; sem[k].sub += sub; sem[k].d++;
  });
  console.log('SEMANA        dias   views   min.assist  inscritos+  views/dia');
  Object.entries(sem).sort().forEach(([k, x]) => console.log(
    pad(k, 13), String(x.d).padStart(4), String(x.v).padStart(8),
    String(x.min).padStart(11), String(x.sub).padStart(11), String(Math.round(x.v / x.d)).padStart(10)));
  const tv = Object.values(sem).reduce((s, x) => s + x.v, 0);
  const tm = Object.values(sem).reduce((s, x) => s + x.min, 0);
  const ts = Object.values(sem).reduce((s, x) => s + x.sub, 0);
  console.log('TOTAL: ' + tv + ' views | ' + tm + ' min assistidos (' + Math.round(tm / 60) + 'h) | +' + ts + ' inscritos');

  console.log('\n== 2. CONCENTRACAO: quantos videos fazem as views? ==');
  const ord = [...lista].sort((a, b) => b.views - a.views);
  const total = ord.reduce((s, v) => s + v.views, 0);
  [1, 5, 10, 20, 50].forEach(n => {
    const s = ord.slice(0, n).reduce((x, v) => x + v.views, 0);
    console.log('top ' + String(n).padStart(3) + ' videos (' + String((n / ord.length * 100).toFixed(0)).padStart(2) +
      '% do acervo) = ' + String(s).padStart(6) + ' views = ' + (s / total * 100).toFixed(1) + '% de tudo');
  });
  const fracos = ord.filter(v => v.views < 50).length;
  const medianaV = ord[Math.floor(ord.length / 2)].views;
  console.log('mediana de views por video (vida inteira): ' + medianaV);
  console.log('videos com menos de 50 views na VIDA inteira: ' + fracos + ' de ' + ord.length +
    ' (' + (fracos / ord.length * 100).toFixed(0) + '%)');

  console.log('\n== 3. A MORTE AOS 7 DIAS, testada em janelas separadas ==');
  console.log('(idade do video calculada no MEIO de cada janela)');
  const janelas = [
    ['2026-06-04', '2026-06-15'], ['2026-06-16', '2026-06-30'],
    ['2026-07-01', '2026-07-13'], ['2026-07-14', '2026-07-23'],
  ];
  console.log('JANELA                total    0-7d     8-14d    15-29d   30+d');
  for (const [a, b] of janelas) {
    const t = await ya.reports.query({ ids: 'channel==MINE', startDate: a, endDate: b, metrics: 'views' });
    const tot = (t.data.rows && t.data.rows[0] && t.data.rows[0][0]) || 0;
    if (!tot) { console.log(pad(a + ' a ' + b.slice(5), 22), 'sem dado'); continue; }
    const r = await ya.reports.query({ ids: 'channel==MINE', startDate: a, endDate: b, metrics: 'views', dimensions: 'video', sort: '-views', maxResults: 200 });
    const meio = new Date((new Date(a).getTime() + new Date(b).getTime()) / 2);
    const f = { a: 0, b: 0, c: 0, d: 0 };
    let cobertas = 0;
    (r.data.rows || []).forEach(x => {
      const v = V[x[0]]; if (!v) return; const n = +x[1]; cobertas += n;
      const idade = Math.round((meio - v.p) / 864e5);
      if (idade <= 7) f.a += n; else if (idade <= 14) f.b += n; else if (idade < 30) f.c += n; else f.d += n;
    });
    const pc = x => (x / cobertas * 100).toFixed(1) + '%';
    console.log(pad(a + ' a ' + b.slice(5), 22), String(tot).padStart(6),
      pad(pc(f.a), 9), pad(pc(f.b), 9), pad(pc(f.c), 9), pc(f.d),
      ' (cobertura ' + (cobertas / tot * 100).toFixed(0) + '%)');
  }
  console.log('');
})().catch(e => console.error('ERRO', e.message));
