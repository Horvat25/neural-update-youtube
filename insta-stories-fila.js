'use strict';
/**
 * insta-stories-fila.js — sobe os PNGs de Story pro CDN e põe na fila do Instagram.
 *
 *   git -C ../instagram fetch origin
 *   git -C ../instagram show origin/main:publicador/fila.json > <tmp>/fila.json
 *   node insta-stories-fila.js <tmp>/fila.json stories/dia-<AAAA-MM-DD>-a-<...>.json
 *
 * ⚠️ A VERDADE DA FILA É O `origin/main`, nunca a cópia local — o workflow reescreve
 * o arquivo a cada rodada. Passar a fila local aqui já republicaria post publicado.
 *
 * ⚠️ Story pela API NÃO aceita legenda, figurinha nem link. Todo o recado está
 * QUEIMADO na arte (é por isso que o molde tem o rodapé com blog + YouTube + bio).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [filaPath, lotePath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const SECO = process.argv.includes('--seco');
if (!filaPath || !lotePath) {
  console.error('uso: node insta-stories-fila.js <fila-remota.json> <lote-stories.json> [--seco]');
  process.exit(1);
}

const SAIDA_PNG = path.join(__dirname, 'stories', 'saida');

function sobeCloudFront(arquivo) {
  // Uma string só entre aspas: array + shell:true quebra no espaço de "D:\Neural Update".
  const r = spawnSync(`higgsfield upload create "${arquivo}" --json`,
    { cwd: __dirname, encoding: 'utf8', shell: true, timeout: 900000 });
  const saida = (r.stdout || '') + (r.stderr || '');
  const m = saida.match(/https:\/\/[^\s"]+\.png/);
  if (!m) console.error('   ' + saida.trim().slice(-200));
  return m ? m[0] : null;
}

const fila = JSON.parse(fs.readFileSync(filaPath, 'utf8'));
const itens = JSON.parse(fs.readFileSync(lotePath, 'utf8'));
const jaTem = new Set(fila.map(i => i.slug).filter(Boolean));

let novos = 0;
for (const it of itens) {
  if (jaTem.has(it.slug)) { console.log(`· ${it.slug} — já está na fila`); continue; }
  const png = path.join(SAIDA_PNG, `${it.slug}.png`);
  if (!fs.existsSync(png)) { console.error(`✗ ${it.slug} — PNG não existe`); continue; }
  if (!it.quando) { console.error(`✗ ${it.slug} — sem horário`); continue; }

  if (SECO) { console.log(`[seco] ${it.quando} ${it.tipo} ${it.slug}`); novos++; continue; }

  process.stdout.write(`▲ ${it.slug} … `);
  const url = sobeCloudFront(png);
  if (!url) { console.error('falhou o upload'); continue; }
  // `legenda` fica vazia de propósito: a API ignora em STORIES.
  fila.push({ quando: it.quando, tipo: 'story', midia: url, legenda: '', slug: it.slug, status: 'agendado' });
  novos++;
  console.log('ok');
}

fila.sort((a, b) => new Date(a.quando) - new Date(b.quando));
if (!SECO && novos) fs.writeFileSync(filaPath, JSON.stringify(fila, null, 2) + '\n', 'utf8');
console.log(`\n${novos} story(ies) novo(s) · fila com ${fila.length}`);
if (!SECO && novos) console.log('agora: commitar essa fila no origin/main pelo worktree');
