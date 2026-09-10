'use strict';
/**
 * append-ebook-cta.js — cola no FIM de um vídeo uma cena de CTA do EBOOK PAGO (VSL).
 *   node append-ebook-cta.js <video_base.mp4> <bg_image> <out.mp4> [track.mp3]
 *
 * Vende o ebook "O Lado Sombrio do Universo" (R$19,90). CTA: link na bio + fixado.
 * Diferente da isca grátis (append-isca-cta.js) — aqui é o produto PAGO (fundo de funil).
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
const TRACK = process.argv[5] || 'dark-bump-in-the-night.mp3';

const NARR = process.env.EBOOK_NARR ||
  'Tá tudo lá dentro: o ebook O Lado Sombrio do Universo, ilustrado, por menos que um lanche. O link tá na bio e fixado aqui nos comentários. Corre pegar o seu.';

function durOf(f) {
  const p = spawnSync(ffmpeg, ['-i', f], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 9;
}

(async () => {
  if (!BASE || !BG || !OUT) { console.error('uso: node append-ebook-cta.js <base.mp4> <bg.jpg> <out.mp4> [track.mp3]'); process.exit(1); }
  const work = path.dirname(OUT);

  const narr = path.join(work, '_ebook_narr.mp3');
  const { audioPath } = await generateTTSWithTimings(NARR, narr, process.env.SHORTS_VOICE || 'male');
  const TEMPO = 1.18;
  const rawDur = durOf(audioPath);
  let DUR = +(rawDur / TEMPO + 0.5).toFixed(2);
  if (!Number.isFinite(DUR) || DUR < 2 || DUR > 40) DUR = 10; // proteção contra durOf inválido
  console.log(`[ebook] narr ${rawDur}s -> cena ${DUR}s`);

  const tracks = await ensureMusicCached();
  const forced = path.join(__dirname, 'assets', 'music-real', TRACK);
  const trackPath = fs.existsSync(forced) ? forced : (selectTrackForTopic('espaco', tracks) || {}).path;

  const font = 'C\\:/Windows/Fonts/arialbd.ttf';
  const logoPath = path.join(__dirname, 'assets', 'brand', 'nu-logo.png');
  const hasLogo = fs.existsSync(logoPath);
  const vf = `scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=16:2,eq=brightness=-0.40:saturation=1.05,` +
    `drawtext=fontfile='${font}':text='O LADO SOMBRIO':fontcolor=0xff3b3b:fontsize=72:x=(w-text_w)/2:y=380:box=1:boxcolor=black@0.5:boxborderw=20:shadowcolor=black:shadowx=3:shadowy=3,` +
    `drawtext=fontfile='${font}':text='DO UNIVERSO':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=470:box=1:boxcolor=black@0.5:boxborderw=20:shadowcolor=black:shadowx=3:shadowy=3,` +
    `drawtext=fontfile='${font}':text='EBOOK ILUSTRADO':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=600:shadowcolor=black:shadowx=2:shadowy=2,` +
    `drawtext=fontfile='${font}':text='LINK NA BIO E FIXADO':fontcolor=0x33ccff:fontsize=52:x=(w-text_w)/2:y=700:shadowcolor=black:shadowx=3:shadowy=3,` +
    `drawtext=fontfile='${font}':text='menos que um lanche':fontcolor=white:fontsize=38:x=(w-text_w)/2:y=780:shadowcolor=black:shadowx=2:shadowy=2`;
  const vBrand = hasLogo
    ? `[0:v]${vf},format=yuv420p[vbg];[3:v]scale=168:-1[lg];[vbg][lg]overlay=W-w-20:20:format=auto,format=yuv420p[v];`
    : `[0:v]${vf},format=yuv420p[v];`;
  const filterScene = vBrand +
    `[2:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.5[mus];` +
    `[1:a]aresample=44100,aformat=channel_layouts=stereo,atempo=${TEMPO},volume=1.5[voz];` +
    `[mus][voz]amix=inputs=2:duration=first:weights=1 1:normalize=0,alimiter=limit=0.95[a]`;
  const scene = path.join(work, '_ebook_scene.mp4');
  const sceneInputs = ['-hide_banner', '-loglevel', 'error', '-loop', '1', '-t', String(DUR), '-i', BG, '-i', audioPath, '-i', trackPath];
  if (hasLogo) sceneInputs.push('-i', logoPath);
  let r = spawnSync(ffmpeg, [...sceneInputs,
    '-filter_complex', filterScene, '-map', '[v]', '-map', '[a]', '-t', String(DUR), '-r', '24',
    '-c:v', 'libx264', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-y', scene], { timeout: 300000 });
  if (r.status !== 0) {
    console.error('[ebook] falha cena | status:', r.status, '| spawn error:', r.error && r.error.message);
    console.error('[ebook] stderr:', (r.stderr || '').toString());
    process.exit(1);
  }

  r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-stats', '-i', BASE, '-i', scene,
    '-filter_complex',
    '[0:a]aresample=44100,aformat=channel_layouts=stereo[a0];[1:a]aresample=44100,aformat=channel_layouts=stereo[a1];' +
    '[0:v][a0][1:v][a1]concat=n=2:v=1:a=1[v][a]',
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', (process.env.X264_PRESET || 'veryfast'), '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', OUT], { stdio: 'inherit', timeout: 240000 });
  try { fs.unlinkSync(scene); } catch {}
  if (r.status === 0 && fs.existsSync(OUT)) console.log(`[ebook] ✓ PRONTO: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
  else { console.error('[ebook] falha concat:', r.status); process.exit(1); }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
