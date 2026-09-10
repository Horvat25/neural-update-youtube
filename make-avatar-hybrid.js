'use strict';
/**
 * make-avatar-hybrid.js — concatena um clipe de AVATAR (Wan2.7, com áudio próprio)
 * com N imagens econômicas em Ken Burns, sob UMA narração mestra única (já gerada),
 * pra garantir que o avatar e a legenda fiquem sincronizados com a mesma fala.
 *
 *   node make-avatar-hybrid.js <dir> <out.mp4> <introDurSec> [track.mp3] [topic]
 *
 * Espera em <dir>: scene1.mp4 (avatar, ~introDurSec), narr_full.mp3, words.json,
 * img1..N.png (as imagens econômicas pro resto do vídeo), hook.txt (opcional).
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { buildAss } = require('./ass-captions');
const { ensureMusicCached, selectTrackForTopic } = require('./music-manager');

const DIR = process.argv[2];
const OUT = process.argv[3];
const INTRO_DUR = parseFloat(process.argv[4]);
const FORCED_TRACK = process.argv[5] || '';
const TOPIC = process.argv[6] || 'ciencia';
const FPS = 24;
const ZOOM_END = [1.15, 1.22, 1.12, 1.18, 1.20];

function durOf(file) {
  const p = spawnSync(ffmpeg, ['-i', file], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 0;
}

(async () => {
  const avatarClip = path.join(DIR, 'scene1.mp4');
  const narr = path.join(DIR, 'narr_full.mp3');
  const words = JSON.parse(fs.readFileSync(path.join(DIR, 'words.json'), 'utf8'));
  const narrDur = durOf(narr);
  const restDur = narrDur - INTRO_DUR;
  console.log(`[hybrid] narração total ${narrDur.toFixed(2)}s | avatar ${INTRO_DUR.toFixed(2)}s | resto ${restDur.toFixed(2)}s`);

  const imgs = fs.readdirSync(DIR).filter(f => /^img\d+\.(png|jpe?g|webp)$/i.test(f))
    .sort((a, b) => (parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0])));
  const seg = restDur / imgs.length;
  const frames = Math.round(seg * FPS);
  console.log(`[hybrid] ${imgs.length} imagens, ${seg.toFixed(2)}s cada`);

  const tmp = path.join(DIR, '_clips_' + Date.now());
  fs.mkdirSync(tmp, { recursive: true });
  const imgClips = [];
  imgs.forEach((im, i) => {
    const out = path.join(tmp, `img${i + 1}.mp4`);
    const isLast = i === imgs.length - 1;
    const zEnd = ZOOM_END[i % ZOOM_END.length];
    const zExpr = isLast
      ? `${zEnd.toFixed(3)}-${(zEnd - 1.04).toFixed(3)}*sqrt(on/${frames})`
      : `1.04+${(zEnd - 1.04).toFixed(3)}*sqrt(on/${frames})`;
    const vf = `scale=1600:2844:force_original_aspect_ratio=increase,crop=1600:2844,` +
      `zoompan=z='${zExpr}':x='iw/2-(iw/zoom/2)+sin(on/42)*36':y='ih/2-(ih/zoom/2)+sin(on/68)*24':d=${frames}:s=720x1280:fps=${FPS},` +
      `noise=alls=5:allf=t,vignette=angle=PI/4.5,format=yuv420p`;
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-loop', '1', '-i', path.join(DIR, im),
      '-t', seg.toFixed(2), '-vf', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-y', out], { timeout: 120000 });
    if (r.status === 0 && fs.existsSync(out)) { imgClips.push(out); console.log(`[hybrid] cena imagem ${i + 1} ok`); }
    else console.error(`[hybrid] falha cena ${i + 1}:`, (r.stderr || '').toString().slice(-300));
  });

  // hook na tela (mesmo padrão dos outros Shorts)
  let hookDraw = '';
  const hookSrc = path.join(DIR, 'hook.txt');
  if (fs.existsSync(hookSrc)) {
    const wrapHook = (txt, max = 18) => {
      const ws = txt.replace(/\s+/g, ' ').trim().split(' ');
      const lines = []; let cur = '';
      for (const w of ws) { if (!cur) cur = w; else if ((cur + ' ' + w).length <= max) cur += ' ' + w; else { lines.push(cur); cur = w; } }
      if (cur) lines.push(cur);
      return lines.slice(0, 3).join('\n');
    };
    fs.writeFileSync(path.join(DIR, '_hook.txt'), wrapHook(fs.readFileSync(hookSrc, 'utf8')), 'utf8');
    hookDraw = `,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':textfile='_hook.txt':fontcolor=yellow:fontsize=56:line_spacing=12:x=(w-text_w)/2:y=170:box=1:boxcolor=black@0.6:boxborderw=24:enable='between(t,0,3.2)'`;
  }

  const ass = path.join(DIR, 'captions.ass');
  fs.writeFileSync(ass, buildAss(words, { width: 720, height: 1280, fontSize: 56, marginV: 225, outline: 5, shadow: 2, group: 2 }), 'utf8');

  const tracks = await ensureMusicCached();
  let track = null;
  if (FORCED_TRACK) { const f = path.join(__dirname, 'assets', 'music-real', FORCED_TRACK); if (fs.existsSync(f)) track = { name: FORCED_TRACK, path: f }; }
  if (!track) track = selectTrackForTopic(TOPIC, tracks);
  console.log(`[hybrid] trilha: ${track.name}`);

  const allClips = [avatarClip, ...imgClips];
  const DUR = +(narrDur + 0.8).toFixed(2);
  const inputs = [];
  allClips.forEach(c => inputs.push('-i', c));
  inputs.push('-i', narr, '-i', track.path);
  const vIdx = allClips.map((_, i) => `[${i}:v]`).join('');
  const aNarr = allClips.length, aMus = allClips.length + 1;
  const filter =
    `${vIdx}concat=n=${allClips.length}:v=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=2,trim=0:${DUR},setpts=PTS-STARTPTS,subtitles=captions.ass${hookDraw}[v];` +
    `[${aMus}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.6[mus];` +
    `[${aNarr}:a]aformat=sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS,volume=1.4,asplit=2[voice][key];` +
    `[mus][key]sidechaincompress=threshold=0.035:ratio=4:attack=8:release=180[duck];` +
    `[duck][voice]amix=inputs=2:duration=first:weights=1 1:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=8,afade=t=out:st=${(DUR - 0.8).toFixed(2)}:d=0.8[a]`;

  const args = ['-hide_banner', '-loglevel', 'error', '-stats', ...inputs,
    '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-t', String(DUR),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', path.basename(OUT)];

  console.log('[hybrid] montando vídeo final...');
  const r = spawnSync(ffmpeg, args, { cwd: path.dirname(OUT), stdio: 'inherit', timeout: 240000 });
  try { imgClips.forEach(c => fs.unlinkSync(c)); fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  if (r.status === 0 && fs.existsSync(OUT)) console.log(`[hybrid] PRONTO: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
  else { console.error('[hybrid] falhou:', r.status); process.exit(1); }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
