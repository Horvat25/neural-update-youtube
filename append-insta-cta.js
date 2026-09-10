'use strict';
/**
 * append-insta-cta.js — cena-fim de CTA pro INSTAGRAM (ManyChat comment-to-DM).
 *   node append-insta-cta.js <video_base.mp4> <bg_image> <out.mp4> [track.mp3]
 *
 * Em vez de "LINK NA BIO" (YouTube), pede pra COMENTAR a palavra-chave → o ManyChat
 * manda o PDF grátis na DM. Palavra-chave via env KEYWORD (default COSMOS).
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { generateTTSWithTimings } = require('./tts');
const { ensureMusicCached, selectTrackForTopic } = require('./music-manager');

const BASE = process.argv[2];
const BG = process.argv[3];
const OUT = process.argv[4];
const TRACK = process.argv[5] || 'cosmic-infinite-perspective.mp3';
const KEYWORD = (process.env.KEYWORD || 'COSMOS').toUpperCase();

const NARR = process.env.INSTA_NARR ||
  `Quer o PDF gratuito com os cinco fenomenos mais assustadores do universo? Comenta a palavra ${KEYWORD.toLowerCase()} aqui embaixo que eu te mando na sua DM na hora.`;

function durOf(f) {
  const p = spawnSync(ffmpeg, ['-i', f], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 9;
}

(async () => {
  if (!BASE || !BG || !OUT) { console.error('uso: node append-insta-cta.js <base.mp4> <bg.jpg> <out.mp4> [track.mp3]'); process.exit(1); }
  const work = path.dirname(OUT);
  const narr = path.join(work, '_insta_narr.mp3');
  const { audioPath } = await generateTTSWithTimings(NARR, narr, process.env.SHORTS_VOICE || 'male');
  const TEMPO = 1.2;
  let DUR = +(durOf(audioPath) / TEMPO + 0.5).toFixed(2);
  if (!Number.isFinite(DUR) || DUR < 3 || DUR > 40) DUR = 11;

  const tracks = await ensureMusicCached();
  const forced = path.join(__dirname, 'assets', 'music-real', TRACK);
  const trackPath = fs.existsSync(forced) ? forced : (selectTrackForTopic('espaco', tracks) || {}).path;

  const font = 'C\\:/Windows/Fonts/arialbd.ttf';
  const logoPath = path.join(__dirname, 'assets', 'brand', 'nu-logo.png');
  const hasLogo = fs.existsSync(logoPath);
  const vf = `scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=16:2,eq=brightness=-0.38:saturation=1.05,` +
    `drawtext=fontfile='${font}':text='COMENTA':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=360:shadowcolor=black:shadowx=2:shadowy=2,` +
    `drawtext=fontfile='${font}':text='${KEYWORD}':fontcolor=yellow:fontsize=128:x=(w-text_w)/2:y=430:box=1:boxcolor=black@0.5:boxborderw=22:shadowcolor=black:shadowx=3:shadowy=3,` +
    `drawtext=fontfile='${font}':text='e recebe o PDF GRATIS':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=600:shadowcolor=black:shadowx=2:shadowy=2,` +
    `drawtext=fontfile='${font}':text='na sua DM':fontcolor=0x33ccff:fontsize=64:x=(w-text_w)/2:y=680:shadowcolor=black:shadowx=3:shadowy=3,` +
    `drawtext=fontfile='${font}':text='comenta aqui embaixo':fontcolor=white:fontsize=38:x=(w-text_w)/2:y=770:shadowcolor=black:shadowx=2:shadowy=2`;
  const vBrand = hasLogo
    ? `[0:v]${vf},format=yuv420p[vbg];[3:v]scale=168:-1[lg];[vbg][lg]overlay=W-w-20:20:format=auto,format=yuv420p[v];`
    : `[0:v]${vf},format=yuv420p[v];`;
  // FIX do HANG: este build do ffmpeg-static TRAVA o amix quando a música entra
  // como stream "infinito"/aberto. Solução: cortar a trilha com atrim=0:DUR (fim
  // determinístico), apad na voz e amix duration=shortest → sempre fecha em DUR.
  const filterScene = vBrand +
    `[2:a]atrim=0:${DUR},aresample=44100,aformat=channel_layouts=stereo,volume=0.5[mus];` +
    `[1:a]aresample=44100,aformat=channel_layouts=stereo,atempo=${TEMPO},volume=1.5,apad[voz];` +
    `[mus][voz]amix=inputs=2:duration=shortest:weights=1 1:normalize=0,alimiter=limit=0.95[a]`;
  const scene = path.join(work, '_insta_scene.mp4');
  const sceneInputs = ['-hide_banner', '-nostdin', '-loglevel', 'error', '-loop', '1', '-t', String(DUR), '-i', BG, '-i', audioPath, '-i', trackPath];
  if (hasLogo) sceneInputs.push('-i', logoPath);
  // stdio:'inherit' evita o DEADLOCK de buffer de pipe do spawnSync (o ffmpeg
  // trava esperando alguém ler stderr → ETIMEDOUT). O concat abaixo já usa isso.
  let r = spawnSync(ffmpeg, [...sceneInputs,
    '-filter_complex', filterScene, '-map', '[v]', '-map', '[a]', '-t', String(DUR), '-r', '24',
    '-c:v', 'libx264', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-y', scene],
    { stdio: 'inherit', timeout: 240000 });
  if (r.status !== 0) { console.error('[insta] falha cena | status', r.status, r.error && r.error.message); process.exit(1); }

  r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-stats', '-i', BASE, '-i', scene,
    '-filter_complex',
    '[0:a]aresample=44100,aformat=channel_layouts=stereo[a0];[1:a]aresample=44100,aformat=channel_layouts=stereo[a1];' +
    '[0:v][a0][1:v][a1]concat=n=2:v=1:a=1[v][a]',
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', (process.env.X264_PRESET || 'veryfast'), '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', OUT], { stdio: 'inherit', timeout: 240000 });
  try { fs.unlinkSync(scene); } catch {}
  if (r.status === 0 && fs.existsSync(OUT)) console.log(`[insta] ✓ PRONTO: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
  else { console.error('[insta] falha concat:', r.status); process.exit(1); }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
