'use strict';
/**
 * tiktok-plano.js — monta o PLANO do TikTok até onde o Insta e o YouTube já têm conteúdo.
 *
 * DECISÃO DO MARCELO (11/09/2026): o TikTok acompanha o Insta e o YouTube, semana a semana,
 * 3 por dia no MESMO dia:
 *   12:17 notícia · 17:07 campeão antigo (no lugar da aula — aula não vai) · 20:23 viral
 * O plano só vai até a última data que já tem notícia/viral produzido. A cada lote novo da
 * semana, rodar de novo: ele estende com os dias novos e puxa os PRÓXIMOS campeões da fila
 * `data/tiktok-campeoes.json` (sem repetir os já usados).
 *
 *   node tiktok-plano.js          # monta versões, hospeda e grava tiktok-plano.json
 *
 * Roda no PC (precisa de ffmpeg, voz e do `higgsfield upload`). Quem põe no Buffer é o
 * tiktok-fila-nuvem.js (GitHub Actions, a cada 6h), lendo o tiktok-plano.json do cofre.
 *
 * O que já saiu no TikTok vem do PRÓPRIO Buffer (posts enviados, pela 1ª linha do texto), não
 * de registro local: em 11/09 os tornados saíram antes da hora por "Publicar agora" e o
 * registro local ainda dizia 20:23 — confiar nele reagendaria o vídeo em dobro.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const V = require('./tiktok-versao');

const ROOT = __dirname;
const PLANO = path.join(ROOT, 'tiktok-plano.json');
const CAMPEOES = path.join(ROOT, 'data', 'tiktok-campeoes.json');
const HORA_UTC = { news: '15:17', campeao: '20:07', viral: '23:23' }; // 12:17 · 17:07 · 20:23 em Brasília

const lerJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const diaBRT = iso => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10);
const primeiraLinha = t => String(t || '').split('\n')[0].trim();

async function jaPublicadosNoTikTok() {
  const gql = async query => {
    const r = await fetch('https://api.buffer.com', { method: 'POST',
      headers: { Authorization: `Bearer ${process.env.BUFFER_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300)); return j.data;
  };
  const org = (await gql('query { account { organizations { id } } }')).account.organizations[0].id;
  const p = await gql(`query { posts(input: { organizationId: ${JSON.stringify(org)}, filter: { status: [sent, sending] } }) { edges { node { text } } } }`);
  return new Set(p.posts.edges.map(e => primeiraLinha(e.node.text)));
}

function hospeda(mp4) {
  const cache = mp4.replace(/\.mp4$/, '.url');
  if (fs.existsSync(cache) && fs.statSync(cache).mtimeMs >= fs.statSync(mp4).mtimeMs) return fs.readFileSync(cache, 'utf8').trim();
  const r = spawnSync(`higgsfield upload create "${mp4}" --json`, { cwd: ROOT, encoding: 'utf8', shell: true, timeout: 900000 });
  const m = ((r.stdout || '') + (r.stderr || '')).match(/https:\/\/[^\s"]+\.mp4/);
  if (!m) throw new Error('upload falhou: ' + ((r.stdout || '') + (r.stderr || '')).trim().slice(-200));
  fs.writeFileSync(cache, m[0]);
  return m[0];
}

function pronto(it, tipo, dueAt) {
  const mp4 = V.monta(it);
  if (!mp4) throw new Error(`${it.slug}: não consegui montar a versão do TikTok`);
  const texto = fs.readFileSync(mp4.replace(/\.mp4$/, '.legenda.txt'), 'utf8').trim();
  return { slug: it.slug, tipo, dueAt, url: hospeda(mp4), titulo: primeiraLinha(texto).slice(0, 90), texto };
}

(async () => {
  const antigo = lerJSON(PLANO, { itens: [] });
  const noTikTok = await jaPublicadosNoTikTok();
  const jaNoPlano = new Set(antigo.itens.map(i => i.slug));
  const usadosCampeoes = new Set(antigo.itens.filter(i => i.tipo === 'campeao').map(i => i.slug));
  const filaCampeoes = lerJSON(CAMPEOES, { lista: [] }).lista.map(l => l.slug).filter(s => !usadosCampeoes.has(s));

  const hoje = diaBRT(new Date().toISOString());
  const grade = V.grade().filter(it => V.vaiProTikTok(it) && ['news', 'viral'].includes(it.stream) && diaBRT(it.publishAt) >= hoje);
  // ⭐ 14/09/2026 (Marcelo): a partir do lote de 18/09 os 3 vídeos do dia vão pras 4 redes — a AULA
  // (slot 14h, inclusive a série "A morte das estrelas") ocupa as 17:07 no lugar do campeão antigo.
  // Sem aula no dia (ou já publicada), o campeão continua cobrindo o horário.
  const aulas = V.grade().filter(it => it.stream === 'aula' && it.publishAt >= '2026-09-18' && !/^2099/.test(it.publishAt) && diaBRT(it.publishAt) >= hoje);
  if (!grade.length) { console.log('nada novo na grade do Insta/YouTube a partir de hoje'); return; }
  const ate = grade.map(it => diaBRT(it.publishAt)).sort().pop();

  const itens = antigo.itens.filter(i => i.dueAt > new Date().toISOString()); // o que já passou sai do plano
  const ocupado = new Set(itens.map(i => i.dueAt));
  const novos = [];
  // ⚠️ 12/09/2026: o plano esquece o que já passou, então é o BUFFER que diz qual campeão já
  // saiu — sem isso o Marte (11/09) voltaria na semana seguinte.
  const proximoCampeao = () => {
    while (filaCampeoes.length) {
      const s = filaCampeoes.shift();
      const it = V.itemDoExport(s) || V.grade().find(g => g.slug === s);
      if (it && !noTikTok.has(primeiraLinha(V.legenda(it)))) return it;
    }
    return null;
  };
  for (let d = hoje; d <= ate; d = new Date(Date.parse(d) + 864e5).toISOString().slice(0, 10)) {
    for (const tipo of ['news', 'campeao', 'viral']) {
      const dueAt = `${d}T${HORA_UTC[tipo]}:00.000Z`;
      // 15 min = a mesma margem do tiktok-fila-nuvem.js (post mais em cima da hora ele não agenda)
      if (dueAt <= new Date(Date.now() + 15 * 60e3).toISOString() || ocupado.has(dueAt)) continue;
      let it = null, noLugarDe = null;
      if (tipo === 'campeao') {
        const aula = aulas.find(g => diaBRT(g.publishAt) === d);
        if (aula && jaNoPlano.has(aula.slug)) continue;
        if (aula && !noTikTok.has(primeiraLinha(V.legenda(aula)))) {
          try { novos.push(pronto(aula, 'aula', dueAt)); console.log(`✓ ${d} aula    ${aula.slug}`); }
          catch (e) { console.error(`✗ ${d} aula ${aula.slug}: ${e.message}`); }
          continue;
        }
      }
      if (tipo !== 'campeao') {
        it = grade.find(g => g.stream === tipo && diaBRT(g.publishAt) === d) || null;
        if (it && jaNoPlano.has(it.slug)) continue;
        // ⚠️ 12/09/2026: antes o horário ficava VAZIO quando o vídeo do dia já tinha saído (os
        // tornados saíram no teste de 11/09 e as 12:17 de 12/09 ficaram sem post). A regra do
        // Marcelo é 3 por dia: horário sem vídeo novo recebe um campeão antigo.
        if (it && noTikTok.has(primeiraLinha(V.legenda(it)))) { console.log(`· ${d} ${tipo} ${it.slug} — já saiu no TikTok, vai um campeão no lugar`); it = null; }
        if (!it) noLugarDe = tipo;
      }
      if (!it) it = proximoCampeao();
      if (!it) { console.log(`· ${d} ${HORA_UTC[tipo]}Z — acabaram os campeões antigos`); continue; }
      const tipoFinal = noLugarDe ? 'campeao' : tipo;
      try { novos.push({ ...pronto(it, tipoFinal, dueAt), ...(noLugarDe ? { noLugarDe } : {}) }); console.log(`✓ ${d} ${tipoFinal.padEnd(7)} ${it.slug}${noLugarDe ? ` (no lugar da ${noLugarDe})` : ''}`); }
      catch (e) { console.error(`✗ ${d} ${tipoFinal} ${it.slug}: ${e.message}`); }
    }
  }
  const plano = { _leiame: 'Plano do TikTok (gerado por tiktok-plano.js no PC). O tiktok-fila-nuvem.js mantém no Buffer os 10 próximos. Não editar à mão.',
    geradoEm: new Date().toISOString(), ate, itens: [...itens, ...novos].sort((a, b) => a.dueAt < b.dueAt ? -1 : 1) };
  fs.writeFileSync(PLANO, JSON.stringify(plano, null, 1));
  console.log(`\nplano até ${ate}: ${plano.itens.length} posts (${novos.length} novos) · campeões ainda guardados: ${filaCampeoes.length}`);
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
