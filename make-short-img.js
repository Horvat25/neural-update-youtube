'use strict';
/**
 * make-short-img.js — Short a partir de IMAGENS (Soul V2 etc.) com movimento
 * de câmera (zoompan/Ken Burns cinematográfico) + narração + legenda + trilha.
 *   node make-short-img.js <img_dir> <video_out> [topic]
 * img_dir: img1.png, img2.png, ... (qualquer ordem numérica). Pós 100% local.
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { generateTTSWithTimings } = require('./tts');
const { buildAss } = require('./ass-captions');
const { ensureMusicCached, selectTrackForTopic } = require('./music-manager');

const IMG_DIR = process.argv[2];
const OUT = process.argv[3];
const TOPIC = process.argv[4] || 'espaço astronauta vácuo morte perigo';
const ROTEIRO = `Quanto tempo você sobreviveria no espaço sem um traje? Ao contrário dos filmes, você não explodiria. Mas em quinze segundos o ar dos seus pulmões escaparia e você desmaiaria. A água da sua pele e dos seus olhos ferveria no vácuo, e o seu coração pararia em menos de dois minutos. No espaço, não é o frio que te mata primeiro. É o vazio.`;

const SEG = 8.5; // segundos por imagem
const FPS = 24;
const ZOOM_END = [1.15, 1.22, 1.12]; // zoom final por cena: lento, tenso, contemplativo

function durOf(file) {
  const p = spawnSync(ffmpeg, ['-i', file], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 0;
}

(async () => {
  const work = path.dirname(OUT);
  fs.mkdirSync(work, { recursive: true });
  const tmp = path.join(work, '_clips'); fs.mkdirSync(tmp, { recursive: true });

  const imgs = fs.readdirSync(IMG_DIR).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort((a, b) => (parseInt(a.match(/\d+/)?.[0] || 0)) - (parseInt(b.match(/\d+/)?.[0] || 0)));
  if (!imgs.length) { console.error('sem imagens em ' + IMG_DIR); process.exit(1); }
  console.log(`[img] ${imgs.length} imagem(ns): ${imgs.join(', ')}`);

  // 1) cada imagem -> clipe com zoompan (Ken Burns cinematográfico)
  const clips = [];
  const frames = Math.round(SEG * FPS);
  imgs.forEach((im, i) => {
    const out = path.join(tmp, `scene${i + 1}.mp4`);
    const zEnd = ZOOM_END[i % ZOOM_END.length];
    // Movimento "vivo" (grátis): zoom linear + drift de câmera (flutuação orgânica via sin) +
    // grão de filme temporal (parece filmado) + vinheta cinematográfica. Scale grande = margem p/ o drift.
    const vf = `scale=1600:2844:force_original_aspect_ratio=increase,crop=1600:2844,` +
      `zoompan=z='1.05+${(zEnd - 1.05).toFixed(3)}*on/${frames}':x='iw/2-(iw/zoom/2)+sin(on/45)*35':y='ih/2-(ih/zoom/2)+sin(on/70)*25':d=${frames}:s=720x1280:fps=${FPS},` +
      `noise=alls=7:allf=t,vignette=angle=PI/4.5,format=yuv420p`;
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-loop', '1', '-i', path.join(IMG_DIR, im),
      '-t', String(SEG), '-vf', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-y', out], { timeout: 120000 });
    if (r.status === 0 && fs.existsSync(out)) { clips.push(out); console.log(`[img]   scene${i + 1} ok (zoom ->${zEnd})`); }
    else console.error(`[img]   FALHA scene${i + 1}:`, (r.stderr || '').toString().slice(-200));
  });
  if (!clips.length) { console.error('nenhum clipe gerado'); process.exit(1); }

  console.log('[img] narração (Edge TTS)...');
  const narr = path.join(work, 'narr.mp3');
  const { audioPath, words } = await generateTTSWithTimings(ROTEIRO, narr, 'female');
  const narrDur = durOf(audioPath);
  const vidTotal = clips.length * SEG;
  const DUR = +(Math.min(narrDur + 0.8, vidTotal + 0.5)).toFixed(2);
  console.log(`[img]   narração ${narrDur.toFixed(2)}s | vídeo ${vidTotal}s | final ${DUR}s | ${words ? words.length : 0} palavras`);

  const ass = path.join(work, 'captions.ass');
  fs.writeFileSync(ass, buildAss(words || [], { width: 720, height: 1280, fontSize: 56, marginV: 225, outline: 5, shadow: 2, group: 2 }), 'utf8');
  const tracks = await ensureMusicCached();
  let track;
  if (process.argv[5]) { // arg5: forçar trilha por nome do arquivo em assets/music-real/
    const forced = path.join(__dirname, 'assets', 'music-real', process.argv[5]);
    if (fs.existsSync(forced)) track = { name: process.argv[5], mood: [], path: forced };
    else console.warn(`[img]   trilha forçada não encontrada: ${process.argv[5]} — usando seleção por tema`);
  }
  if (!track) track = selectTrackForTopic(TOPIC, tracks);
  console.log(`[img]   trilha: ${track.name}`);

  const inputs = [];
  clips.forEach(c => inputs.push('-i', c));
  inputs.push('-i', audioPath, '-i', track.path);
  const vIdx = clips.map((_, i) => `[${i}:v]`).join('');
  const aNarr = clips.length, aMus = clips.length + 1;
  const filter =
    `${vIdx}concat=n=${clips.length}:v=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=2,trim=0:${DUR},setpts=PTS-STARTPTS,subtitles=captions.ass[v];` +
    `[${aMus}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.9[mus];` +
    `[${aNarr}:a]aformat=sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS,volume=1.6,asplit=2[voz1][voz2];` +
    `[mus][voz1]sidechaincompress=threshold=0.03:ratio=12:attack=20:release=350[duck];` +
    `[duck][voz2]amix=inputs=2:duration=first:weights=1 1:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${(DUR - 0.8).toFixed(2)}:d=0.8[a]`;

  const args = ['-hide_banner', '-loglevel', 'error', '-stats', ...inputs,
    '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-t', String(DUR),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', path.basename(OUT)];
  console.log('[img] compondo Short final...');
  const r = spawnSync(ffmpeg, args, { cwd: work, stdio: 'inherit', timeout: 240000 });
  try { clips.forEach(c => fs.unlinkSync(c)); fs.rmdirSync(tmp); } catch {}
  if (r.status === 0 && fs.existsSync(OUT)) console.log(`[img] ✓ PRONTO: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
  else { console.error('[img] falhou:', r.status); process.exit(1); }
})();
