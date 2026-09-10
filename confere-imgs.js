'use strict';
/**
 * confere-imgs.js — varre as pastas de um lote e APAGA imagem PNG truncada.
 *
 *   node confere-imgs.js <arquivo-de-spec.js>
 *
 * PNG válido termina no chunk IEND. Download cortado deixa o arquivo pela
 * metade: o ffmpeg quebra com "Invalid data found when processing input" e o
 * vídeo inteiro falha DEPOIS de a imagem já ter sido paga.
 *
 * Depois de rodar isto, rodar o build-lote de novo: o gen-imgs regera só o que
 * foi apagado (0,12cr cada) e o resto é pulado.
 */
const fs = require('fs');
const path = require('path');

const spec = require(path.join(__dirname, process.argv[2] || 'lote-31jul-07ago.js'));
const EXPORTS = path.join(__dirname, 'exports');

// ⚠️ 30/07/2026 — ERRO CARO, NÃO REPETIR: a versão anterior lia os últimos 8
// bytes e procurava 'IEND' em slice(4,8). Os 12 bytes finais de um PNG são
// [tamanho:4][IEND:4][CRC:4] — então nos últimos 8 bytes o 'IEND' está em
// slice(0,4) e o que estava sendo comparado era o CRC. Resultado: reprovou 33
// imagens ÍNTEGRAS e já pagas, e eu as apaguei. Confere os 12 finais agora.
const temIEND = f => {
  try {
    const fd = fs.openSync(f, 'r');
    const tam = fs.fstatSync(fd).size;
    if (tam < 12) { fs.closeSync(fd); return false; }
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, tam - 12);
    fs.closeSync(fd);
    return buf.slice(4, 8).toString('latin1') === 'IEND';
  } catch { return false; }
};

let ruins = 0, ok = 0, faltando = 0;

for (const v of spec) {
  const dir = path.join(EXPORTS, v.slug);
  if (!fs.existsSync(dir)) continue;
  const esperadas = (v.bank || []).length + (v.prompts || []).length;
  const imgs = fs.readdirSync(dir).filter(f => /^img\d+\.png$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));

  const quebradas = [];
  for (const im of imgs) {
    const f = path.join(dir, im);
    if (temIEND(f)) { ok++; continue; }
    fs.unlinkSync(f);
    quebradas.push(im);
    ruins++;
  }
  const agora = fs.readdirSync(dir).filter(f => /^img\d+\.png$/.test(f)).length;
  if (agora < esperadas) faltando += esperadas - agora;

  if (quebradas.length || agora < esperadas) {
    console.log(`${v.slug}: ${quebradas.length ? 'apagadas ' + quebradas.join(', ') + ' · ' : ''}` +
      `${agora}/${esperadas} cenas`);
  }
}

console.log(`\nímagens íntegras: ${ok} · truncadas apagadas: ${ruins} · faltando gerar: ${faltando}`);
if (ruins || faltando) console.log(`→ rodar: node build-lote.js ${process.argv[2] || 'lote-31jul-07ago.js'}`);
