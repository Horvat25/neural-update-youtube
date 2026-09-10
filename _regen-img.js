'use strict';
/**
 * _regen-img.js — regera UMA cena fugindo do vício de pôster.
 *
 * POR QUE (04/09/2026): o CINEMA_STYLE do higgsfield-images.js pede "epic
 * atmosphere + volumetric god rays + cinematic teal and orange grade". Esse
 * conjunto é exatamente a receita do pôster de cinema — e o modelo completa a
 * composição com a SILHUETA SOLITÁRIA olhando a paisagem, mais assinatura
 * rabiscada e logo falso no rodapé. Aconteceu em 3 de 7 cenas do telescópio e
 * 3 de 7 do cometa.
 *
 * Listar "no people" no prompt NÃO resolve: o modelo lê o token e desenha.
 * O que resolve é tirar o gatilho (o estilo de pôster) e afirmar no POSITIVO
 * que a cena é vazia — "unmanned", "pure astrophotography".
 *
 *   node _regen-img.js <slug> <n> "<prompt sem observador>"
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const axios = require('axios');

const ESTILO = ", deep space photograph, natural cosmic colour, high dynamic range, fine star detail, empty space all around the subject";

const [slug, n, prompt] = process.argv.slice(2);
if (!slug || !n || !prompt) { console.error('uso: node _regen-img.js <slug> <n> "<prompt>"'); process.exit(1); }

const full = prompt + ESTILO;
const q = `"${full.replace(/"/g, '""')}"`;
const r = spawnSync(
  `higgsfield generate create text2image_soul_v2 --prompt ${q} --aspect_ratio 9:16 --quality 2k --wait --wait-timeout 5m`,
  { encoding: 'utf8', timeout: 320000, shell: true }
);
const out = (r.stdout || '') + (r.stderr || '');
const m = out.match(/https?:\/\/[^\s"]+\.(jpg|jpeg|png|webp)/i);
if (!m) { console.error('sem URL:', out.slice(-300)); process.exit(1); }

axios.get(m[0], { responseType: 'arraybuffer', timeout: 90000 }).then(res => {
  const dest = path.join('exports', slug, `img${n}.png`);
  fs.writeFileSync(dest, res.data);
  console.log(`✓ ${dest}`);
});
