'use strict';
/**
 * ctr-thumbs.js — impressões x cliques por vídeo (o diagnóstico da thumbnail).
 *
 * CTR de impressão = quantos cliques o YouTube ganhou de cada 100 vezes que
 * MOSTROU a miniatura. É a métrica que julga título+capa, e é o gargalo do
 * longo no nosso canal (a distribuição morre no teste inicial de CTR).
 *
 * ⚠️ Short e longo NÃO se comparam: no Short a "impressão" é o feed rolando,
 * então o CTR sai artificialmente alto/baixo por mecânica diferente. Por isso
 * o relatório separa os dois.
 *
 * 🚨 29/07/2026 — NÃO FUNCIONA PELA API. A YouTube Analytics API v2 responde
 * "Unknown identifier (impressions)": as métricas `impressions` e
 * `impressionsClickThroughRate` NÃO são expostas pela API — são exclusivas da
 * interface do YouTube Studio (aba Alcance) e dos relatórios em massa.
 * → Pra ler CTR, abrir o Studio no navegador: Analytics → Conteúdo → Alcance.
 * Deixei o script aqui só como registro pra ninguém tentar de novo.
 *
 * Uso: node ctr-thumbs.js [dias]   (default 90)
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const DIAS = Number(process.argv[2] || 90);

const iso2s = d => {
  const m = (d || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
  return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
};
const med = a => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

(async () => {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const yta = google.youtubeAnalytics({ version: 'v2', auth });

  const fim = new Date().toISOString().slice(0, 10);
  const ini = new Date(Date.now() - DIAS * 864e5).toISOString().slice(0, 10);

  // relatório de alcance por vídeo
  const r = await yta.reports.query({
    ids: 'channel==MINE',
    startDate: ini, endDate: fim,
    metrics: 'views,impressions,impressionsClickThroughRate,averageViewDuration',
    dimensions: 'video',
    sort: '-impressions',
    maxResults: 200,
  });

  const rows = r.data.rows || [];
  if (!rows.length) { console.log('sem dado de impressões no período'); return; }

  const ids = rows.map(x => x[0]);
  const meta = {};
  for (let i = 0; i < ids.length; i += 50) {
    const v = await youtube.videos.list({ part: ['snippet', 'contentDetails'], id: ids.slice(i, i + 50) });
    (v.data.items || []).forEach(x => {
      meta[x.id] = { titulo: x.snippet.title, dur: iso2s(x.contentDetails.duration) };
    });
  }

  const dados = rows.map(([id, views, imp, ctr, avd]) => ({
    id, views: +views, imp: +imp, ctr: +ctr, avd: +avd,
    titulo: meta[id]?.titulo || id,
    dur: meta[id]?.dur || 0,
  })).filter(d => d.imp > 0);

  const longos = dados.filter(d => d.dur > 180);
  const shorts = dados.filter(d => d.dur <= 180);

  const mostra = (lista, rotulo) => {
    if (!lista.length) return;
    console.log(`\n=== ${rotulo} ===`);
    console.log(' impressões  cliques   CTR%   título');
    lista.sort((a, b) => b.imp - a.imp).forEach(d => {
      const cliques = Math.round(d.imp * d.ctr / 100);
      const alerta = d.dur > 180 ? (d.ctr < 2 ? ' 🔴' : d.ctr < 4 ? ' 🟡' : ' 🟢') : '';
      console.log(
        String(d.imp).padStart(10) + '  ' +
        String(cliques).padStart(7) + '  ' +
        d.ctr.toFixed(2).padStart(5) + '  ' +
        d.titulo.slice(0, 52) + alerta
      );
    });
    const impT = lista.reduce((s, d) => s + d.imp, 0);
    const cliT = lista.reduce((s, d) => s + d.imp * d.ctr / 100, 0);
    console.log(`  TOTAL: ${impT.toLocaleString('pt-BR')} impressões → ${Math.round(cliT).toLocaleString('pt-BR')} cliques ` +
      `= CTR agregado ${(cliT / impT * 100).toFixed(2)}%  |  mediana ${med(lista.map(d => d.ctr)).toFixed(2)}%`);
  };

  mostra(longos, `VÍDEOS LONGOS (aqui a thumbnail decide) — últimos ${DIAS} dias`);
  mostra(shorts, `SHORTS (mecânica diferente: impressão = feed rolando)`);

  console.log(`\n=== RÉGUA DO MERCADO (CTR de impressão, vídeo longo) ===`);
  console.log(`   abaixo de 2%   capa/título não estão funcionando`);
  console.log(`   2% a 4%        abaixo da média — a maioria dos canais pequenos vive aqui`);
  console.log(`   4% a 6%        média do YouTube`);
  console.log(`   6% a 10%       bom`);
  console.log(`   acima de 10%   excelente (ou audiência muito fiel / amostra pequena)`);
  if (longos.length) {
    const m = med(longos.map(d => d.ctr));
    const veredito = m < 2 ? 'ABAIXO DO PISO — é o gargalo' : m < 4 ? 'abaixo da média do mercado'
      : m < 6 ? 'na média do mercado' : 'acima da média';
    console.log(`\n   👉 nossa mediana em longo: ${m.toFixed(2)}% → ${veredito}`);
  }
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
