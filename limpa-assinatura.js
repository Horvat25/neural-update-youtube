'use strict';
/**
 * limpa-assinatura.js — remove a ASSINATURA FALSA e o EMBLEMA que o Soul V2 crava
 * nos cantos INFERIORES da imagem, mesmo com negative prompt.
 *
 * Descoberto 26/07/2026: o negative ("no text, no words, no watermark, no signature")
 * matou a garatuja de pseudo-latim NO MEIO da imagem, mas o modelo continua assinando
 * o rodapé — rabisco de assinatura na esquerda e um emblema/logo na direita.
 * Negative nenhum resolve isso. A cura é CORTAR, mantendo o 16:9 exato.
 *
 * Corta ~10% da altura pelo RODAPÉ (onde ficam as marcas) e a largura proporcional,
 * ancorado no TOPO — o assunto das nossas imagens fica no centro/terço superior,
 * então não se perde composição.
 *
 * Uso: node limpa-assinatura.js <dir> [pct]     (pct padrão = 10)
 */
const fs = require('fs');
const path = require('path');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');

const DIR = process.argv[2];
const PCT = parseFloat(process.argv[3] || '10') / 100;
if (!DIR || !fs.existsSync(DIR)) { console.error('uso: node limpa-assinatura.js <dir> [pct]'); process.exit(1); }

function dimensoes(f) {
  const p = spawnSync(ffmpeg, ['-i', f], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/,\s(\d{2,5})x(\d{2,5})[\s,]/);
  return m ? { w: +m[1], h: +m[2] } : null;
}

const arquivos = fs.readdirSync(DIR).filter(f => /^img\d+\.png$/i.test(f))
  .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]));
if (!arquivos.length) { console.error('nenhuma imgN.png em', DIR); process.exit(1); }

let ok = 0, pulou = 0;
for (const nome of arquivos) {
  const src = path.join(DIR, nome);
  const d = dimensoes(src);
  if (!d) { console.warn('  ? nao li as dimensoes de', nome); pulou++; continue; }
  // altura nova = corta PCT pelo rodape; largura acompanha pra manter o MESMO aspect
  const hNova = Math.round(d.h * (1 - PCT) / 2) * 2;
  const wNova = Math.round((hNova * d.w / d.h) / 2) * 2;
  const x = Math.round((d.w - wNova) / 2);
  const tmp = path.join(DIR, '_tmp_' + nome);
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', src,
    '-vf', `crop=${wNova}:${hNova}:${x}:0`, '-y', tmp], { timeout: 60000 });
  if (r.status === 0 && fs.existsSync(tmp) && fs.statSync(tmp).size > 10000) {
    fs.renameSync(tmp, src); ok++;
    process.stdout.write('.');
  } else {
    try { fs.unlinkSync(tmp); } catch {}
    console.warn('\n  x falhou em', nome); pulou++;
  }
}
console.log(`\n[limpa] ${ok} imagem(ns) limpa(s)${pulou ? ', ' + pulou + ' pulada(s)' : ''} (cortado ${(PCT * 100).toFixed(0)}% do rodape)`);
