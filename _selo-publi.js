'use strict';
/**
 * _selo-publi.js — queima o selo "Publicidade · link de afiliado" no vídeo.
 *
 * POR QUE: a partir de 10/09/2026 alguns vídeos anunciam o projetor astronauta (Shopee,
 * link de afiliado). Anúncio tem que se identificar como anúncio (CONAR). A legenda do
 * Insta e a descrição do YouTube já dizem, mas quem só assiste não lê descrição.
 *
 *   node _selo-publi.js <video.mp4>              # selo do começo ao fim (VSL)
 *   node _selo-publi.js <video.mp4> --final 7    # só nos últimos 7s (CTA no fim do vídeo)
 *
 * Reescreve o próprio arquivo (re-encoda o vídeo, copia o áudio). Se o selo já estiver
 * aplicado (marca em <video>.selo), não faz nada — rodar duas vezes não empilha selo.
 */
const fs = require('fs');
const { spawnSync } = require('child_process');
const ffmpeg = require('./node_modules/ffmpeg-static');

const mp4 = process.argv[2];
const iF = process.argv.indexOf('--final');
const final = iF > -1 ? Number(process.argv[iF + 1]) : null;
if (!mp4 || !fs.existsSync(mp4)) { console.error('uso: node _selo-publi.js <video.mp4> [--final N]'); process.exit(1); }

const marca = mp4 + '.selo';
if (fs.existsSync(marca) && fs.statSync(marca).mtimeMs >= fs.statSync(mp4).mtimeMs - 5000) {
  console.log(`· ${mp4} — selo já aplicado`); process.exit(0);
}

const info = spawnSync(ffmpeg, ['-i', mp4], { encoding: 'utf8' }).stderr;
const m = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
if (!m) { console.error('não li a duração'); process.exit(1); }
const dur = +m[1] * 3600 + +m[2] * 60 + +m[3];
const inicio = final ? Math.max(0, dur - final) : 0;

// mesmo formato de fonte que o make-short-img-flex usa (o "C:" escapado dentro do filtro)
// 10/09/2026: o Marcelo não gostou de "Publicidade · link de afiliado" na tela. Ficou o
// "#publi" discreto — é o padrão que o público brasileiro já reconhece, e o aviso por extenso
// continua na legenda do Insta e na descrição do YouTube.
const selo = `drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='#publi':` +
  `fontcolor=white@0.75:fontsize=26:x=(w-text_w)/2:y=h-150:box=1:boxcolor=black@0.35:boxborderw=10` +
  `:enable='gte(t,${inicio.toFixed(2)})'`;

const tmp = mp4.replace(/\.mp4$/i, '._selo.mp4');
const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', mp4, '-vf', selo,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy',
  '-movflags', '+faststart', tmp], { encoding: 'utf8' });
if (r.status !== 0 || !fs.existsSync(tmp)) { console.error('ffmpeg falhou:', (r.stderr || '').slice(-300)); process.exit(1); }
fs.renameSync(tmp, mp4);
fs.writeFileSync(marca, new Date().toISOString());
console.log(`✓ ${mp4} — selo ${final ? `nos últimos ${final}s (a partir de ${inicio.toFixed(1)}s)` : 'no vídeo inteiro'}`);
