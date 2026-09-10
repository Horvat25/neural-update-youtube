'use strict';
/**
 * _publico.js — QUEM assiste o canal, com dado do YouTube Analytics.
 *
 * Existe porque a escolha de produto de afiliado estava sendo feita por
 * intuição ("espaço, então luminária de lua"). Antes de escolher produto é
 * preciso saber idade, gênero, país e dispositivo de quem realmente assiste —
 * essas quatro coisas mudam completamente o que faz sentido anunciar.
 *
 * ⚠️ `viewerPercentage` só existe com as dimensões ageGroup/gender e NÃO aceita
 * outras métricas na mesma chamada. Misturar com `views` devolve 400.
 *
 * uso: node _publico.js [dias]   (padrão 90)
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const DIAS = Number(process.argv[2] || 90);
const iso = d => d.toISOString().slice(0, 10);
const desde = iso(new Date(Date.now() - DIAS * 86400e3));
const ate = iso(new Date());

const barra = (pct, max) => '█'.repeat(Math.max(0, Math.round((pct / max) * 34)));

(async () => {
  const auth = await getAuthorizedClient();
  const ya = google.youtubeAnalytics({ version: 'v2', auth });
  const yt = google.youtube({ version: 'v3', auth });

  const q = o => ya.reports.query({ ids: 'channel==MINE', startDate: desde, endDate: ate, ...o });

  console.log(`\n╔═══ QUEM ASSISTE O NEURAL UPDATE — ${desde} a ${ate} (${DIAS} dias) ═══\n`);

  // ---------- idade + gênero ----------
  let demo = null;
  try {
    demo = await q({ metrics: 'viewerPercentage', dimensions: 'ageGroup,gender' });
  } catch (e) {
    console.log(`(demografia indisponível: ${e.message})\n`);
  }

  if (demo?.data.rows?.length) {
    const idade = {}, genero = {};
    for (const [faixa, gen, pct] of demo.data.rows) {
      idade[faixa] = (idade[faixa] || 0) + pct;
      genero[gen] = (genero[gen] || 0) + pct;
    }
    const maxI = Math.max(...Object.values(idade));
    console.log('── IDADE ──');
    Object.entries(idade).sort().forEach(([f, p]) =>
      console.log(`  ${f.replace('age', '').padEnd(7)} ${p.toFixed(1).padStart(5)}%  ${barra(p, maxI)}`));

    console.log('\n── GÊNERO ──');
    Object.entries(genero).sort((a, b) => b[1] - a[1]).forEach(([g, p]) =>
      console.log(`  ${g.padEnd(7)} ${p.toFixed(1).padStart(5)}%  ${barra(p, Math.max(...Object.values(genero)))}`));

    // faixa dominante = onde mira o produto
    const top = Object.entries(idade).sort((a, b) => b[1] - a[1])[0];
    console.log(`\n  → núcleo: ${top[0].replace('age', '')} anos (${top[1].toFixed(1)}% das visualizações)`);
  }

  // ---------- país ----------
  const pais = await q({ metrics: 'views', dimensions: 'country', sort: '-views', maxResults: 8 });
  const totalP = (pais.data.rows || []).reduce((s, r) => s + r[1], 0);
  console.log('\n── PAÍS ──');
  (pais.data.rows || []).forEach(([c, v]) =>
    console.log(`  ${c}  ${String(v).padStart(6)}  ${(v / totalP * 100).toFixed(1).padStart(5)}%`));

  // ---------- dispositivo: define se dá pra comprar no mesmo aparelho ----------
  const disp = await q({ metrics: 'views', dimensions: 'deviceType', sort: '-views' });
  const totalD = (disp.data.rows || []).reduce((s, r) => s + r[1], 0);
  console.log('\n── DISPOSITIVO ──');
  (disp.data.rows || []).forEach(([d, v]) =>
    console.log(`  ${d.padEnd(8)} ${String(v).padStart(6)}  ${(v / totalD * 100).toFixed(1).padStart(5)}%`));

  // ---------- o que eles assistem: top 15 com título ----------
  const top = await q({ metrics: 'views,averageViewPercentage,subscribersGained', dimensions: 'video', sort: '-views', maxResults: 15 });
  const ids = (top.data.rows || []).map(r => r[0]);
  const det = ids.length ? await yt.videos.list({ part: ['snippet', 'contentDetails'], id: ids }) : { data: { items: [] } };
  const porId = Object.fromEntries((det.data.items || []).map(v => [v.id, v.snippet.title]));

  console.log('\n── OS 15 MAIS VISTOS (o que essa audiência escolhe) ──');
  console.log('  views   ret%  +subs  título');
  (top.data.rows || []).forEach(([id, v, ret, subs]) =>
    console.log(`  ${String(v).padStart(6)} ${ret.toFixed(0).padStart(5)}% ${String(subs).padStart(5)}  ${(porId[id] || id).slice(0, 60)}`));

  const [tv] = ((await q({ metrics: 'views,estimatedMinutesWatched,subscribersGained' })).data.rows || [[0]])[0];
  console.log(`\n  total do período: ${tv} views`);
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
