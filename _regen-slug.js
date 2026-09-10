'use strict';
/**
 * _regen-slug.js — regera TODAS as cenas de um slug sem o vício de pôster.
 * Corta do prompt a cauda de estilo cinematográfico (é ela que chama a silhueta)
 * e usa o estilo de astrofotografia. Ver memória silhueta-de-poster-nas-imagens.
 *   node _regen-slug.js <slug> [n1 n2 ...]   # sem números = todas as 7
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const axios = require('axios');

const ESTILO = ", deep space photograph, natural cosmic colour, high dynamic range, fine star detail, empty space all around the subject";

const slug = process.argv[2];
const quais = process.argv.slice(3).map(Number);
const dir = path.join('exports', slug);
const prompts = fs.readFileSync(path.join(dir, 'prompts.txt'), 'utf8').trim().split('\n');

// corta tudo depois de "tall vertical frame" — o resto é a cauda de estilo
const limpa = p => {
  const i = p.toLowerCase().indexOf('tall vertical frame');
  return (i > -1 ? p.slice(0, i + 'tall vertical frame'.length) : p) + ESTILO;
};

(async () => {
  for (let i = 0; i < prompts.length; i++) {
    const n = i + 1;
    if (quais.length && !quais.includes(n)) continue;
    const full = limpa(prompts[i]);
    const q = `"${full.replace(/"/g, '""')}"`;
    const r = spawnSync(`higgsfield generate create text2image_soul_v2 --prompt ${q} --aspect_ratio 9:16 --quality 2k --wait --wait-timeout 5m`,
      { encoding: 'utf8', timeout: 320000, shell: true });
    const out = (r.stdout || '') + (r.stderr || '');
    const m = out.match(/https?:\/\/[^\s"]+\.(jpg|jpeg|png|webp)/i);
    if (!m) { console.error(`✗ img${n}: ` + out.slice(-160)); continue; }
    const res = await axios.get(m[0], { responseType: 'arraybuffer', timeout: 90000 });
    fs.writeFileSync(path.join(dir, `img${n}.png`), res.data);
    console.log(`✓ ${slug}/img${n}.png`);
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
