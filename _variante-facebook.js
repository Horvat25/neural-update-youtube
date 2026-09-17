'use strict';
/**
 * _variante-facebook.js — gera uma cópia levemente diferente de cada vídeo pra postar no
 * Facebook, SEM gastar crédito nenhum (só ffmpeg local, 0cr).
 *
 * POR QUE (17/09/2026): os Reels do Facebook eram bytes IDÊNTICOS ao Reel que já tinha saído
 * no Insta minutos antes, na mesma URL. Pesquisa com "gurus" de growth + doc oficial da Meta
 * apontam conteúdo repostado/idêntico entre redes como fator que reduz distribuição orgânica.
 * O conserto do bug de visualização zero (publicar.mjs) resolve o teto artificial; isso aqui
 * ataca o segundo fator: nunca mandar pro Facebook o arquivo byte-a-byte igual ao do Insta.
 *
 * O QUE FAZ: zoom/crop sutil (6%) + corta 0,25s do início — muda o hash e o enquadramento,
 * sem cortar legenda nem logo (testado visualmente), sem re-narrar nem gerar cena nova.
 *
 *   node _variante-facebook.js <slug>              # 1 vídeo
 *   node _variante-facebook.js --lote <lote.json>   # todo slug do lote
 *
 * Saída: exports/<slug>/<slug>-fb.mp4
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('./node_modules/ffmpeg-static');

function variar(slug) {
  const dir = path.join('exports', slug);
  const src = path.join(dir, `${slug}.mp4`);
  const out = path.join(dir, `${slug}-fb.mp4`);
  if (!fs.existsSync(src)) { console.error(`✗ ${slug} — falta ${src}`); return null; }
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) {
    console.log(`· ${slug} — variante já existe`); return out;
  }
  const r = spawnSync(ffmpeg, ['-v', 'error', '-y', '-ss', '0.25', '-i', src,
    '-vf', 'crop=iw*0.94:ih*0.94:iw*0.03:ih*0.03,scale=1080:1920,setsar=1',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '192k', out],
    { encoding: 'utf8' });
  if (r.status !== 0) { console.error(`✗ ${slug}: ${(r.stderr || '').slice(-300)}`); return null; }
  console.log(`✓ ${slug} → ${out}`);
  return out;
}

const args = process.argv.slice(2);
const slugs = args[0] === '--lote'
  ? JSON.parse(fs.readFileSync(args[1], 'utf8')).map(x => x.slug)
  : args;
if (!slugs.length) { console.error('uso: node _variante-facebook.js <slug> | --lote <lote.json>'); process.exit(1); }
for (const s of slugs) variar(s);
