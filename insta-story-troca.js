'use strict';
/**
 * insta-story-troca.js — sobe de novo o PNG de stories que JÁ estão na fila e troca
 * a URL da mídia. Para quando a arte muda mas o horário e o slug continuam os mesmos.
 *
 *   node insta-story-troca.js <fila-remota.json> <lote-stories.json> <slug|prefixo>...
 *
 * ⚠️ Só mexe em item `agendado`. O que já foi publicado fica como está — republicar
 * é o erro que custou um post duplicado em 20/08.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const alvos = process.argv.slice(4).filter(a => !a.startsWith('--'));
const [filaPath, lotePath] = process.argv.slice(2, 4);
const SECO = process.argv.includes('--seco');
if (!filaPath || !lotePath || !alvos.length) {
  console.error('uso: node insta-story-troca.js <fila.json> <lote.json> <slug|prefixo>... [--seco]');
  process.exit(1);
}

const SAIDA_PNG = path.join(__dirname, 'stories', 'saida');
function sobe(arquivo) {
  const r = spawnSync(`higgsfield upload create "${arquivo}" --json`,
    { cwd: __dirname, encoding: 'utf8', shell: true, timeout: 900000 });
  const s = (r.stdout || '') + (r.stderr || '');
  const m = s.match(/https:\/\/[^\s"]+\.png/);
  if (!m) console.error('   ' + s.trim().slice(-200));
  return m ? m[0] : null;
}

const fila = JSON.parse(fs.readFileSync(filaPath, 'utf8'));
const itens = JSON.parse(fs.readFileSync(lotePath, 'utf8'))
  .filter(i => alvos.some(a => i.slug.startsWith(a)));

let n = 0;
for (const it of itens) {
  const post = fila.find(p => p.slug === it.slug);
  if (!post) { console.error(`✗ ${it.slug} — não está na fila`); continue; }
  if (post.status !== 'agendado') { console.log(`· ${it.slug} — já ${post.status}, não mexo`); continue; }
  const png = path.join(SAIDA_PNG, `${it.slug}.png`);
  if (!fs.existsSync(png)) { console.error(`✗ ${it.slug} — PNG sumiu`); continue; }

  if (SECO) { console.log(`[seco] trocaria ${it.slug}`); n++; continue; }
  process.stdout.write(`▲ ${it.slug} … `);
  const url = sobe(png);
  if (!url) { console.error('falhou'); continue; }
  post.midia = url;
  n++;
  console.log('ok');
}

if (!SECO && n) fs.writeFileSync(filaPath, JSON.stringify(fila, null, 2) + '\n', 'utf8');
console.log(`\n${n} arte(s) trocada(s)`);
