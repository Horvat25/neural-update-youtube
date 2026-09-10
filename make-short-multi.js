'use strict';
/**
 * make-short-multi.js — Short de N cenas (clipes Higgsfield distintos) + narração + legenda + trilha.
 *   node make-short-multi.js <scenes_dir> <video_out> <topic> "<roteiro>"
 * scenes_dir: pasta com scene1.mp4, scene2.mp4, ... (mesma resolução/fps).
 * Pós 100% local (0 créditos): TTS (Edge) + ASS + music-manager + ffmpeg concat.
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { generateTTSWithTimings } = require('./tts');
const { buildAss } = require('./ass-captions');
const { ensureMusicCached, selectTrackForTopic } = require('./music-manager');

const SCENES_DIR = process.argv[2];
const OUT = process.argv[3];
const TOPIC = process.argv[4] || 'espaço';
const ROTEIRO = process.argv[5] || `A nossa galáxia tem mais de 100 bilhões de estrelas, muitas bilhões de anos mais velhas que o nosso Sol. Se a vida fosse comum, o espaço já estaria lotado de civilizações. Elas deveriam ter nos encontrado milhares de vezes. Mas quando escutamos o universo inteiro, só existe silêncio. E talvez esse silêncio seja o aviso mais assustador de todos.`;
if (!SCENES_DIR || !OUT) { console.error('uso: node make-short-multi.js <scenes_dir> <out> [topic] ["<roteiro>"]'); process.exit(1); }

function durOf(file) {
  const p = spawnSync(ffmpeg, ['-i', file], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 0;
}

(async () => {
  const work = path.dirname(OUT);
  fs.mkdirSync(work, { recursive: true });

  // Clipes de cena em ordem (scene1, scene2, ...)
  const clips = fs.readdirSync(SCENES_DIR).filter(f => /^scene\d+\.mp4$/i.test(f))
    .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0])).map(f => path.join(SCENES_DIR, f));
  if (!clips.length) { console.error('Sem clipes scene*.mp4 em ' + SCENES_DIR); process.exit(1); }
  const vidTotal = clips.reduce((s, c) => s + durOf(c), 0);
  console.log(`[multi] ${clips.length} cena(s), ${vidTotal.toFixed(1)}s de vídeo bruto`);

  console.log('[multi] 1/3 narração (Edge TTS + timings)...');
  const narr = path.join(work, 'narr.mp3');
  const { audioPath, words } = await generateTTSWithTimings(ROTEIRO, narr, process.env.SHORTS_VOICE || 'male');
  const narrDur = durOf(audioPath);
  const DUR = +(Math.min(narrDur + 0.8, vidTotal + 3)).toFixed(2); // cobre a narração; tpad garante vídeo até lá
  console.log(`[multi]   narração ${narrDur.toFixed(2)}s | final ${DUR}s | ${words ? words.length : 0} palavras`);

  console.log('[multi] 2/3 legenda + trilha...');
  const ass = path.join(work, 'captions.ass');
  fs.writeFileSync(ass, buildAss(words || [], { width: 720, height: 1280, fontSize: 56, marginV: 225, outline: 5, shadow: 2, group: 2 }), 'utf8');
  const tracks = await ensureMusicCached();
  let track = selectTrackForTopic(TOPIC, tracks);
  if (process.env.FORCED_TRACK) {
    const forced = path.join(__dirname, 'assets', 'music-real', process.env.FORCED_TRACK);
    if (fs.existsSync(forced)) track = { name: process.env.FORCED_TRACK, path: forced };
  }
  console.log(`[multi]   trilha: ${track.name}`);

  // Hook-bomba amarelo nos primeiros 3s (lê <scenes_dir>/hook.txt se existir)
  let hookDraw = '';
  const hookSrc = path.join(SCENES_DIR, 'hook.txt');
  if (fs.existsSync(hookSrc)) {
    fs.copyFileSync(hookSrc, path.join(work, '_hook.txt'));
    hookDraw = `,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':textfile='_hook.txt':fontcolor=yellow:fontsize=60:line_spacing=12:x=(w-text_w)/2:y=170:box=1:boxcolor=black@0.6:boxborderw=24:enable='between(t,0.25,3.0)'`;
    console.log('[multi]   hook na tela ativo');
  }

  // concat dos clipes → tpad (clona último frame p/ cobrir narração) → legenda
  console.log('[multi] 3/3 compondo (concat cenas + voz + trilha duckada + legenda)...');
  const inputs = [];
  clips.forEach(c => { inputs.push('-i', c); });
  inputs.push('-i', audioPath, '-i', track.path);
  const vIdx = clips.map((_, i) => `[${i}:v]`).join('');
  const aNarr = clips.length, aMus = clips.length + 1;
  const filter =
    `${vIdx}concat=n=${clips.length}:v=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=3,trim=0:${DUR},setpts=PTS-STARTPTS,subtitles=captions.ass${hookDraw}[v];` +
    `[${aMus}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.9[mus];` +
    `[${aNarr}:a]aformat=sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS,volume=1.6,asplit=2[voz1][voz2];` +
    `[mus][voz1]sidechaincompress=threshold=0.03:ratio=12:attack=20:release=350[duck];` +
    `[duck][voz2]amix=inputs=2:duration=first:weights=1 1:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${(DUR - 0.8).toFixed(2)}:d=0.8[a]`;

  const args = ['-hide_banner', '-loglevel', 'error', '-stats', ...inputs,
    '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-t', String(DUR),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', path.basename(OUT)];
  const r = spawnSync(ffmpeg, args, { cwd: work, stdio: 'inherit', timeout: 240000 });
  if (r.status === 0 && fs.existsSync(OUT)) console.log(`[multi] ✓ PRONTO: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
  else { console.error('[multi] falhou:', r.status); process.exit(1); }
})();
