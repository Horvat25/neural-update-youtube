'use strict';
/**
 * make-reels.js — pós-produção de um clipe do Higgsfield em Reels.
 *   node make-reels.js <video_in> <video_out> [topic]
 * Boomerang (forward+reverse = loop perfeito) + trilha do music-manager + fades.
 */
const path = require('path');
const fs = require('fs');
const ffmpegStatic = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { ensureMusicCached, selectTrackForTopic } = require('./music-manager');

(async () => {
  const video = process.argv[2];
  const out = process.argv[3];
  const topic = process.argv[4] || 'buraco negro';
  if (!video || !out) { console.error('uso: node make-reels.js <in> <out> [topic]'); process.exit(1); }

  console.log('[reels] garantindo trilha sonora...');
  const tracks = await ensureMusicCached();
  const track = selectTrackForTopic(topic, tracks);
  console.log(`[reels] trilha escolhida: ${track.name} (${path.basename(track.path)})`);

  // Boomerang: split → reverse no 2º ramo → concat. fim = início (loop perfeito).
  const filter =
    '[0:v]split=2[fwd][rev];[rev]reverse[r];[fwd][r]concat=n=2:v=1,format=yuv420p[v];' +
    '[1:a]atrim=0:16,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1.5,afade=t=out:st=14.7:d=1.3,volume=0.9[a]';

  const args = [
    '-hide_banner', '-loglevel', 'error', '-stats',
    '-i', video,
    '-i', track.path,
    '-filter_complex', filter,
    '-map', '[v]', '-map', '[a]',
    '-t', '16',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    '-y', out,
  ];
  console.log('[reels] renderizando 16s (boomerang + trilha)...');
  const r = spawnSync(ffmpegStatic, args, { stdio: 'inherit', timeout: 180000 });
  if (r.status === 0 && fs.existsSync(out)) {
    const mb = (fs.statSync(out).size / 1048576).toFixed(2);
    console.log(`[reels] ✓ pronto: ${out} (${mb} MB)`);
  } else {
    console.error('[reels] falhou:', r.status);
    process.exit(1);
  }
})();
