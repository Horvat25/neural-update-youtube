'use strict';
/**
 * tiktok-music-id.js — identifica QUAL trilha (assets/music-real) está dentro de
 * um vídeo, por correlação cruzada de áudio (axcorrelate). Uso:
 *   node tiktok-music-id.js <video1.mp4> [video2.mp4 ...]
 * Pra cada vídeo, correlaciona 30s do áudio com cada trilha e ranqueia por RMS.
 * (atrim NO FILTRO, nunca -t no input — ver bug do amix/hang nesta build.)
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');

const MUSIC_DIR = path.join(__dirname, 'assets', 'music-real');
const tracks = fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3'));

function corrRMS(video, track) {
  const fc =
    `[0:a]atrim=0:30,aresample=8000,aformat=channel_layouts=mono[a];` +
    `[1:a]atrim=0:30,aresample=8000,aformat=channel_layouts=mono[b];` +
    `[a][b]axcorrelate=size=8192:algo=best,astats=measure_perchannel=RMS_level:measure_overall=none`;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-nostdin',
    '-i', video, '-i', path.join(MUSIC_DIR, track),
    '-filter_complex', fc, '-f', 'null', '-'], { timeout: 60000 });
  const err = (r.stderr || Buffer.alloc(0)).toString();
  const m = err.match(/RMS level dB:\s*(-?[\d.]+|inf)/);
  return m ? parseFloat(m[1]) : -999;
}

for (const video of process.argv.slice(2)) {
  if (!fs.existsSync(video)) { console.log(`${video}: NAO EXISTE`); continue; }
  const scores = tracks.map(t => ({ t, rms: corrRMS(video, t) }))
    .sort((a, b) => b.rms - a.rms);
  const top = scores[0], second = scores[1];
  const margin = (top.rms - second.rms).toFixed(1);
  console.log(`\n${path.basename(video)}`);
  scores.slice(0, 3).forEach((s, i) => console.log(`  ${i + 1}. ${s.t.padEnd(36)} RMS ${s.rms} dB`));
  console.log(`  → melhor: ${top.t} (margem ${margin} dB${+margin < 3 ? ' — FRACA, pode ser síntese/nenhuma' : ''})`);
}
