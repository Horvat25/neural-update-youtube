'use strict';
/**
 * insta-troca-midia.js — troca o arquivo de um post que já está NA FILA do Insta,
 * mas ainda NÃO foi publicado.
 *
 * Diferente do YouTube: aqui não existe "substituir vídeo publicado". A fila é só
 * um JSON com uma URL; trocar a URL basta, e não há nada pra excluir. O mp4 antigo
 * fica órfão no CloudFront, sem custo nem efeito.
 *
 * ⚠️ A VERDADE DA FILA É O `origin/main`, nunca a cópia local: o workflow reescreve
 * o arquivo a cada rodada. Este script exige que você passe a fila remota já baixada.
 *
 *   git -C ../instagram fetch origin
 *   git -C ../instagram show origin/main:publicador/fila.json > <tmp>/fila.json
 *   node insta-troca-midia.js <tmp>/fila.json lotes/_trilha6.json
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [filaPath, specPath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const SECO = process.argv.includes('--seco');
if (!filaPath || !specPath) { console.error('uso: node insta-troca-midia.js <fila-remota.json> <spec.json> [--seco]'); process.exit(1); }

function sobeCloudFront(mp4) {
  const r = spawnSync(`higgsfield upload create "${mp4}" --json`,
    { cwd: __dirname, encoding: 'utf8', shell: true, timeout: 900000 });
  const saida = (r.stdout || '') + (r.stderr || '');
  const m = saida.match(/https:\/\/[^\s"]+\.mp4/);
  if (!m) console.error('   ' + saida.trim().slice(-200));
  return m ? m[0] : null;
}

const fila = JSON.parse(fs.readFileSync(filaPath, 'utf8'));
const itens = JSON.parse(fs.readFileSync(specPath, 'utf8'));
let n = 0;

for (const it of itens) {
  const post = fila.find(p => p.slug === it.slug);
  if (!post) { console.error(`✗ ${it.slug} — não está na fila`); continue; }
  if (post.status !== 'agendado') { console.error(`✗ ${it.slug} — status "${post.status}", não mexo`); continue; }

  const mp4 = path.join(__dirname, 'exports', it.slug, `${it.slug}.mp4`);
  if (!fs.existsSync(mp4)) { console.error(`✗ ${it.slug} — mp4 sumiu`); continue; }

  if (SECO) { console.log(`[seco] ${it.slug} (${it.track})`); n++; continue; }

  process.stdout.write(`▲ ${it.slug} … `);
  const url = sobeCloudFront(mp4);
  if (!url) { console.error('falhou o upload'); continue; }
  const antiga = post.midia;
  post.midia = url;
  n++;
  console.log('ok');
  console.log(`   antes: ...${antiga.slice(-24)}`);
  console.log(`   agora: ...${url.slice(-24)}`);
}

if (!SECO && n) fs.writeFileSync(filaPath, JSON.stringify(fila, null, 2) + '\n', 'utf8');
console.log(`\n${n} mídia(s) trocada(s) · fila com ${fila.length} itens`);
if (!SECO && n) console.log('agora: commitar essa fila no origin/main (worktree) — sem push o Actions não enxerga');
