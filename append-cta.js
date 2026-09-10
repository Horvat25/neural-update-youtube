'use strict';
/**
 * append-cta.js — cola uma cena de CTA de inscrição (barra de meta + narração) no FIM de um Short.
 *   node append-cta.js <video_base.mp4> <bg_image> <out.mp4> [track.mp3]
 * Usa cta.js (inscritos/meta reais). Reutilizável pelos vídeos da regra "1 a cada 3".
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { planCta } = require('./cta');
const { generateTTSWithTimings } = require('./tts');
const { ensureMusicCached, selectTrackForTopic } = require('./music-manager');

const BASE = process.argv[2];
const BG = process.argv[3];
const OUT = process.argv[4];
const TRACK = process.argv[5] || 'cosmic-the-descent.mp3';

function durOf(f) {
  const p = spawnSync(ffmpeg, ['-i', f], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 9;
}

(async () => {
  const work = path.dirname(OUT);
  const plan = await planCta({ force: true });
  const { subs, goal, progress, narration } = plan.cta;
  console.log(`[cta] ${subs}/${goal} (${Math.round(progress * 100)}%)`);

  // 1) narração do CTA
  const narr = path.join(work, '_cta_narr.mp3');
  const { audioPath } = await generateTTSWithTimings(narration, narr, process.env.SHORTS_VOICE || 'male');
  const TEMPO = 1.25; // acelera a fala do CTA (mais ágil)
  const DUR = +(durOf(audioPath) / TEMPO + 0.45).toFixed(2);

  // 2) trilha
  const tracks = await ensureMusicCached();
  const forced = path.join(__dirname, 'assets', 'music-real', TRACK);
  const trackPath = fs.existsSync(forced) ? forced : (selectTrackForTopic('espaco', tracks) || {}).path;

  // 3) cena CTA: fundo desfocado + barra animada + INSCREVA-SE + narração + trilha
  const font = 'C\\:/Windows/Fonts/arialbd.ttf';
  const bx = 100, bw = 520, by = 690, bh = 54;
  const vf = `scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=16:2,eq=brightness=-0.34:saturation=1.06,` +
    `drawtext=fontfile='${font}':text='META DO CANAL':fontcolor=0x33ccff:fontsize=44:x=(w-text_w)/2:y=420,` +
    `drawtext=fontfile='${font}':text='INSCREVA-SE':fontcolor=white:fontsize=88:x=(w-text_w)/2:y=480:shadowcolor=black:shadowx=3:shadowy=3,` +
    `drawbox=x=${bx}:y=${by}:w=${bw}:h=${bh}:color=white@0.20:t=fill,` +
    `drawbox=x=${bx}:y=${by}:w='${bw}*min(t/1.4\\,${progress.toFixed(3)})':h=${bh}:color=0x33ccff@0.95:t=fill,` +
    `drawtext=fontfile='${font}':text='${subs} / ${goal} inscritos':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=${by + bh + 26}:shadowcolor=black:shadowx=2:shadowy=2,format=yuv420p`;
  const filterScene = `[0:v]${vf}[v];` +
    `[2:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.5[mus];` +
    `[1:a]aresample=44100,aformat=channel_layouts=stereo,atempo=${TEMPO},volume=1.5[voz];` +
    `[mus][voz]amix=inputs=2:duration=first:weights=1 1:normalize=0,loudnorm=I=-16:TP=-1.5[a]`;
  const ctaScene = path.join(work, '_cta_scene.mp4');
  let r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-loop', '1', '-i', BG, '-i', audioPath, '-i', trackPath,
    '-filter_complex', filterScene, '-map', '[v]', '-map', '[a]', '-t', String(DUR), '-r', '24',
    '-c:v', 'libx264', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-y', ctaScene], { timeout: 120000 });
  if (r.status !== 0) { console.error('[cta] falha cena:', (r.stderr || '').toString().slice(-400)); process.exit(1); }

  // 4) concatena base + cena CTA (re-encode, áudio padronizado em 44100)
  r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-stats', '-i', BASE, '-i', ctaScene,
    '-filter_complex',
    '[0:a]aresample=44100,aformat=channel_layouts=stereo[a0];[1:a]aresample=44100,aformat=channel_layouts=stereo[a1];' +
    '[0:v][a0][1:v][a1]concat=n=2:v=1:a=1[v][a]',
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', OUT], { stdio: 'inherit', timeout: 240000 });
  try { fs.unlinkSync(ctaScene); } catch {}
  if (r.status === 0 && fs.existsSync(OUT)) console.log(`[cta] ✓ PRONTO: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
  else { console.error('[cta] falha concat:', r.status); process.exit(1); }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
