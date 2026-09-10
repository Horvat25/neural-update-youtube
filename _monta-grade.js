'use strict';
/**
 * _monta-grade.js — monta os .mp4 lendo voz e TRILHA do próprio lote.
 *
 * POR QUE: em 09/09/2026 o Marcelo pediu para parar de usar a mesma trilha em todo
 * vídeo. A trilha agora vive no campo `track` do spec e varia por slot:
 *   08h notícia = news-rising-tide · 14h aula = cosmic-ice-flow / cosmic-ambient-espacial
 *   18h viral  = dark-some-amount-of-evil / dark-tension-pixabay
 * Passar trilha na mão foi o que fez a `quantum-investigations` (hoje BANIDA por
 * Content ID) sair em 5 vídeos seguidos. Aqui a fonte é o lote, sempre.
 *
 *   node _monta-grade.js lotes/aulas-11-17set.json [outro.json ...] [--so slug1,slug2]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BANIDAS = new Set(['cosmic-the-descent.mp3', 'cosmic-infinite-perspective.mp3',
  'dark-bump-in-the-night.mp3', 'quantum-investigations.mp3', 'tech-pixelland.mp3']);

const iSo = process.argv.indexOf('--so');
const so = iSo > -1 ? new Set((process.argv[iSo + 1] || '').split(',').filter(Boolean)) : null;
const arquivos = process.argv.slice(2).filter((a, i) => !a.startsWith('--') && (iSo === -1 || process.argv.indexOf(a) !== iSo + 1));

const itens = arquivos.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
let feitos = 0, pulados = 0;

for (const it of itens) {
  if (so && !so.has(it.slug)) continue;
  const dir = path.join('exports', it.slug);
  const mp4 = path.join(dir, `${it.slug}.mp4`);

  const imgs = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^img\d+\.png$/i.test(f)) : [];
  if (imgs.length < 7) { console.log(`· ${it.slug} — só ${imgs.length}/7 imagens, pulando`); pulados++; continue; }
  if (BANIDAS.has(it.track)) { console.error(`✗ ${it.slug} — trilha BANIDA: ${it.track}`); pulados++; continue; }
  if (fs.existsSync(mp4)) { console.log(`· ${it.slug} — mp4 já existe`); continue; }

  const env = { ...process.env };
  if ((it.voice || '').toLowerCase() === 'female') env.SHORTS_VOICE = 'female';

  const r = spawnSync(process.execPath,
    ['make-short-img-flex.js', dir, mp4, it.topic || 'space', it.track],
    { encoding: 'utf8', env, timeout: 900000 });
  const saida = (r.stdout || '') + (r.stderr || '');
  const dur = (saida.match(/\[flex\] final ([\d.]+)s/) || [])[1];
  const trilha = (saida.match(/\[flex\] trilha: (\S+)/) || [])[1];
  if (!dur) { console.error(`✗ ${it.slug}: ${saida.trim().slice(-220)}`); pulados++; continue; }
  console.log(`✓ ${it.slug.padEnd(38)} ${dur}s  ${trilha}  ${(it.voice || 'male')}`);
  feitos++;
}
console.log(`\n${feitos} montado(s) · ${pulados} pendente(s)`);
