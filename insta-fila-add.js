'use strict';
/**
 * insta-fila-add.js — põe os Shorts de um lote na fila do Instagram.
 *
 * O Instagram agora é GitHub Actions: a fila é o arquivo versionado
 * `instagram/publicador/fila.json` e quem publica é o workflow. Este script
 * substitui a parte do `distribui-lote.js` que gerava INSERT pro Supabase da
 * Lovable (morto desde 10/ago).
 *
 * REGRA DE ESPELHAMENTO: o Instagram é cópia do YouTube — mesmo vídeo, mesmo
 * dia, mesma hora. Por isso `quando` = o `publishAt` do próprio spec, sem
 * deslocamento. (O slot das 22h BRT é reservado pro que atrasou; não se usa
 * aqui.) Isso não é estética: as AULAS anunciam a data da próxima DENTRO do
 * vídeo — se o Insta postar em outro dia, o vídeo se contradiz.
 *
 * Só entra SHORT (9:16). Vídeo longo é 16:9 e não vira Reels.
 *
 *   node insta-fila-add.js lotes/14-16-ago.json lotes/17-20-ago.json
 *   node insta-fila-add.js lotes/*.json --seco    # só mostra o que faria
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SECO = process.argv.includes('--seco');
const arquivos = process.argv.slice(2).filter(a => !a.startsWith('--'));
const FILA = path.join(__dirname, '..', 'instagram', 'publicador', 'fila.json');
const ISCA_IG = '📩 Comenta COSMOS que eu te mando o PDF grátis com 5 fenômenos do universo.';

if (!arquivos.length) { console.error('uso: node insta-fila-add.js <lote.json> [...]'); process.exit(1); }

// ⚠️ ARRAY de args + shell:true não funciona no Windows: o shell concatena e o
// caminho "D:\Neural Update\..." quebra no espaço. Tem que ser UMA string com
// o caminho entre aspas.
function sobeCloudFront(mp4) {
  const r = spawnSync(`higgsfield upload create "${mp4}" --json`,
    { cwd: __dirname, encoding: 'utf8', shell: true, timeout: 900000 });
  const saida = (r.stdout || '') + (r.stderr || '');
  const m = saida.match(/https:\/\/[^\s"]+\.mp4/);
  if (!m) console.error('   ' + saida.trim().slice(-200));
  return m ? m[0] : null;
}

// 17/09/2026: o Facebook não distribui bem um Reel que é bytes IDÊNTICOS ao que acabou de sair
// no Insta. Cada item ganha uma 2ª URL (midia_facebook) com zoom/crop sutil, 0 crédito
// (_variante-facebook.js). O publicar.mjs (repo instagram) usa midia_facebook quando existir.

const fila = JSON.parse(fs.readFileSync(FILA, 'utf8'));
const jaTem = new Set(fila.map(i => i.slug).filter(Boolean));
const itens = arquivos.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));

let novos = 0;
for (const it of itens) {
  if (jaTem.has(it.slug)) { console.log(`· ${it.slug} — já está na fila`); continue; }
  const mp4 = path.join(__dirname, 'exports', it.slug, `${it.slug}.mp4`);
  if (!fs.existsSync(mp4)) { console.error(`✗ ${it.slug} — mp4 não existe`); continue; }

  const legenda = [
    it.desc1,
    it.isca ? ISCA_IG : null,
    (it.hashtags || []).join(' '),
  ].filter(Boolean).join('\n\n');

  if (SECO) { console.log(`[seco] ${it.publishAt} ${it.slug}`); novos++; continue; }

  process.stdout.write(`▲ ${it.slug} … `);
  const url = sobeCloudFront(mp4);
  if (!url) { console.error('falhou o upload'); continue; }

  const fbMp4 = path.join(__dirname, 'exports', it.slug, `${it.slug}-fb.mp4`);
  if (!fs.existsSync(fbMp4)) {
    spawnSync(process.execPath, [path.join(__dirname, '_variante-facebook.js'), it.slug], { cwd: __dirname, stdio: 'inherit' });
  }
  const urlFb = fs.existsSync(fbMp4) ? sobeCloudFront(fbMp4) : null;
  if (!urlFb) console.error(`   ⚠ sem variante pro Facebook (${it.slug}) — vai usar o mesmo arquivo do Insta`);

  fila.push({ quando: it.publishAt, tipo: 'reels', midia: url, ...(urlFb ? { midia_facebook: urlFb } : {}), legenda, slug: it.slug, status: 'agendado' });
  novos++;
  console.log('ok');
}

fila.sort((a, b) => new Date(a.quando) - new Date(b.quando));
if (!SECO && novos) fs.writeFileSync(FILA, JSON.stringify(fila, null, 2) + '\n', 'utf8');
console.log(`\n${novos} item(ns) novo(s) · fila com ${fila.length}`);
if (!SECO && novos) console.log('agora: commit + push no repo instagram/ — sem push o Actions não enxerga');
