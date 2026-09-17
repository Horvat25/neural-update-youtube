'use strict';
/**
 * insta-reels-semana.js — hospeda os mp4 de um lote e gera os itens de Reels da fila do Insta,
 * com a legenda escrita à mão (protocolo aprovado em 13/09) de lotes/insta-legendas-*.json.
 * Cacheia a URL em data/insta-urls.json: rodar de novo não re-sobe o que já subiu.
 *
 *   node insta-reels-semana.js lotes/grade-18-24set.json lotes/insta-legendas-18-24set.json
 * Saída: data/_reels-novos.json (juntar na fila com um worktree limpo do origin/main).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const [lote, legs] = process.argv.slice(2);
const itens = JSON.parse(fs.readFileSync(lote, 'utf8'));
const legendas = JSON.parse(fs.readFileSync(legs, 'utf8'));
const CACHE = path.join(__dirname, 'data', 'insta-urls.json');
const urls = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const out = [];
for (const it of itens) {
  if (!legendas[it.slug]) { console.error(`✗ ${it.slug} sem legenda`); process.exitCode = 1; continue; }
  if (!urls[it.slug]) {
    const mp4 = path.join(__dirname, 'exports', it.slug, `${it.slug}.mp4`);
    const r = spawnSync(`higgsfield upload create "${mp4}" --json`, { encoding: 'utf8', shell: true, timeout: 900000 });
    const m = ((r.stdout || '') + (r.stderr || '')).match(/https:\/\/[^\s"]+\.mp4/);
    if (!m) { console.error(`✗ ${it.slug} upload falhou`); process.exitCode = 1; continue; }
    urls[it.slug] = m[0];
    fs.writeFileSync(CACHE, JSON.stringify(urls, null, 2));
  }
  console.log(`✓ ${it.publishAt.slice(0, 16)} ${it.slug}`);
  out.push({ quando: it.publishAt, tipo: 'reels', midia: urls[it.slug], legenda: legendas[it.slug], slug: it.slug, status: 'agendado' });
}
fs.writeFileSync(path.join(__dirname, 'data', '_reels-novos.json'), JSON.stringify(out, null, 2));
console.log(`${out.length} itens em data/_reels-novos.json`);
