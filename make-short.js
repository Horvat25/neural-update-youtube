'use strict';
/**
 * make-short.js — PROTÓTIPO do Short completo "estilo Neural Update" usando
 * clipe(s) do Higgsfield como motor visual + narração + legenda karaokê + trilha.
 *   node make-short.js <video_in> <video_out> [topic]
 *
 * Pós 100% local (0 créditos): TTS (Edge) + ASS captions + music-manager + ffmpeg.
 * Aqui uso 1 clipe em boomerang loopável; no produto final serão 3 clipes emendados.
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { generateTTSWithTimings } = require('./tts');
const { buildAss } = require('./ass-captions');
const { ensureMusicCached, selectTrackForTopic } = require('./music-manager');

const VIDEO = process.argv[2];
const OUT = process.argv[3];
const TOPIC = process.argv[4] || 'buraco negro';

// Roteiro estilo Shorts: hook brutal, escada de choque, fecho em loop.
const ROTEIRO = `Se você caísse num buraco negro, seria muito pior do que morrer.
Primeiro, o tempo ao seu redor começaria a parar.
Depois a gravidade esticaria seu corpo num fio fino de átomos: isso se chama espaguetificação.
E no centro, o futuro deixa de ser tempo e vira uma direção no espaço.
Você não morreria no buraco negro. Você cairia, pra sempre, no fim do tempo.`;

function durOf(file) {
  const p = spawnSync(ffmpeg, ['-i', file], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 20;
}

(async () => {
  const work = path.dirname(OUT);
  fs.mkdirSync(work, { recursive: true });

  console.log('[short] 1/4 narração (Edge TTS + timings)...');
  const narr = path.join(work, 'narr.mp3');
  const { audioPath, words } = await generateTTSWithTimings(ROTEIRO, narr, 'female');
  const narrDur = durOf(audioPath);
  const DUR = +(narrDur + 0.8).toFixed(2);
  console.log(`[short]   narração ${narrDur.toFixed(2)}s | final ${DUR}s | ${words ? words.length : 0} palavras com timing`);

  console.log('[short] 2/4 legenda karaokê (.ass 720x1280)...');
  const ass = path.join(work, 'captions.ass');
  fs.writeFileSync(ass, buildAss(words || [], { width: 720, height: 1280, fontSize: 56, marginV: 225, outline: 5, shadow: 2, group: 2 }), 'utf8');

  console.log('[short] 3/4 trilha + boomerang base...');
  const tracks = await ensureMusicCached();
  const track = selectTrackForTopic(TOPIC, tracks);
  const boom = path.join(work, '_boom.mp4');
  spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', VIDEO,
    '-filter_complex', '[0:v]split=2[a][b];[b]reverse[r];[a][r]concat=n=2:v=1,format=yuv420p[v]',
    '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-y', boom], { timeout: 120000 });

  console.log('[short] 4/4 compondo (vídeo loop + voz + trilha duckada + legenda)...');
  const filter =
    `[0:v]trim=0:${DUR},setpts=PTS-STARTPTS,subtitles=captions.ass[v];` +
    `[2:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.9[mus];` +
    `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS,volume=1.6,asplit=2[voz1][voz2];` +
    `[mus][voz1]sidechaincompress=threshold=0.03:ratio=12:attack=20:release=350[duck];` +
    `[duck][voz2]amix=inputs=2:duration=first:weights=1 1:normalize=0,` +
    `loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${(DUR - 0.8).toFixed(2)}:d=0.8[a]`;

  const args = ['-hide_banner', '-loglevel', 'error', '-stats',
    '-stream_loop', '-1', '-i', boom,
    '-i', audioPath,
    '-i', track.path,
    '-filter_complex', filter,
    '-map', '[v]', '-map', '[a]', '-t', String(DUR),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', path.basename(OUT)];
  const r = spawnSync(ffmpeg, args, { cwd: work, stdio: 'inherit', timeout: 240000 });

  try { fs.unlinkSync(boom); } catch {}
  if (r.status === 0 && fs.existsSync(OUT)) {
    console.log(`[short] ✓ PRONTO: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
  } else { console.error('[short] falhou:', r.status); process.exit(1); }
})();
