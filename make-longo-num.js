'use strict';
/**
 * make-longo-num.js — igual make-longo.js, mas ESTOURA o número gigante (5,4,3,2,1)
 * na tela no exato momento em que a narração fala "número cinco/quatro/...".
 * Detecta o timestamp pelas word-timings do TTS. Fonte Segoe UI Bold (mesma do hook dos Shorts).
 *   node make-longo-num.js <img_dir> <out.mp4> [track.mp3]
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
const TRACK = process.argv[4] || 'cosmic-ice-flow.mp3';
const FPS = 24;

function durOf(f) {
  const p = spawnSync(ffmpeg, ['-i', f], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 0;
}
function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, ''); }

// Detecta os 5 marcadores de countdown na ordem 5->4->3->2->1 (ignora o "número um" do intro).
function detectCountdown(words) {
  const seq = [['cinco', '5'], ['quatro', '4'], ['tres', '3'], ['dois', '2'], ['um', '1']];
  const marks = [];
  let idx = 0;
  for (let i = 0; i < words.length - 1 && idx < seq.length; i++) {
    if (norm(words[i].text) === 'numero' && norm(words[i + 1].text) === seq[idx][0]) {
      marks.push({ n: seq[idx][1], t: words[i + 1].start });
      idx++;
    }
  }
  return marks;
}

(async () => {
  const work = path.resolve(path.dirname(OUT));
  const tmp = path.join(work, '_lclips_' + Date.now());
  fs.mkdirSync(tmp, { recursive: true });

  const ROTEIRO = fs.readFileSync(path.join(IMG_DIR, 'roteiro.txt'), 'utf8').trim();
  const imgs = fs.readdirSync(IMG_DIR).filter(f => /^img\d+\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort((a, b) => (parseInt(a.match(/\d+/)?.[0] || 0)) - (parseInt(b.match(/\d+/)?.[0] || 0)));
  console.log(`[longo] ${imgs.length} imagens`);

  const narr = path.join(work, '_longo_narr.mp3');
  const { audioPath, words } = await generateTTSWithTimings(ROTEIRO, narr, process.env.SHORTS_VOICE || 'male');
  const narrDur = durOf(audioPath);
  const seg = (narrDur + 1.2) / imgs.length;
  const frames = Math.round(seg * FPS);
  console.log(`[longo] narração ${narrDur.toFixed(1)}s | ${seg.toFixed(1)}s/imagem | ${words ? words.length : 0} palavras`);

  const marks = detectCountdown(words || []);
  console.log('[longo] countdown detectado:', marks.map(m => `${m.n}@${m.t.toFixed(1)}s`).join('  ') || 'NENHUM');

  const clips = [];
  imgs.forEach((im, i) => {
    const out = path.join(tmp, `c${String(i + 1).padStart(2, '0')}.mp4`);
    const vf = `split=2[a][b];` +
      `[a]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=30:4,eq=brightness=-0.40:saturation=1.05[bg];` +
      `[b]scale=-2:1040[fg];` +
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[base];` +
      `[base]zoompan=z='min(zoom+0.0005,1.08)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${FPS},format=yuv420p`;
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-loop', '1', '-i', path.join(IMG_DIR, im),
      '-t', seg.toFixed(2), '-filter_complex', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-y', out], { timeout: 180000 });
    if (r.status === 0 && fs.existsSync(out)) { clips.push(out); console.log(`[longo] clipe ${i + 1}/${imgs.length} ok`); }
    else console.error(`[longo] falha clipe ${i + 1}:`, (r.stderr || '').toString().slice(-260));
  });
  if (!clips.length) { console.error('nenhum clipe'); process.exit(1); }

  const ass = path.join(work, '_longo_caps.ass');
  fs.writeFileSync(ass, buildAss(words || [], { width: 1920, height: 1080, fontSize: 52, marginV: 70, outline: 4, shadow: 2, group: 3 }), 'utf8');

  const FONT = "C\\:/Windows/Fonts/segoeuib.ttf";

  // HOOK na tela nos primeiros 4s (o builder do longo não tinha — o vídeo abria "seco",
  // sem entregar a promessa do título visualmente. Os Shorts já faziam isso desde sempre).
  // Usa textfile pra não quebrar com acento no filtro do ffmpeg.
  let hookDraw = '';
  const hookFile = path.join(IMG_DIR, 'hook.txt');
  if (fs.existsSync(hookFile)) {
    const linhas = fs.readFileSync(hookFile, 'utf8').trim().split('\n').filter(Boolean);
    linhas.forEach((linha, i) => {
      const tmpTxt = path.join(work, `_hook${i + 1}.txt`);
      fs.writeFileSync(tmpTxt, linha, 'utf8');
      const y = 90 + i * 96;
      hookDraw += `,drawtext=fontfile='${FONT}':textfile='_hook${i + 1}.txt':fontcolor=yellow:fontsize=84:` +
        `x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.62:boxborderw=26:enable='between(t,0,4)'`;
    });
    console.log(`[longo] hook na tela: "${linhas.join(' / ')}"`);
  }

  // overlay dos números gigantes (aparece ~0.1s antes da fala, segura 2.4s, com leve pop)
  const numDraw = marks.map(m => {
    const st = Math.max(0, m.t - 0.1), en = m.t + 2.4;
    return `,drawtext=fontfile='${FONT}':text='${m.n}':fontcolor=white:fontsize=430:` +
      `x=(w-text_w)/2:y=(h-text_h)/2-40:box=1:boxcolor=black@0.5:boxborderw=44:` +
      `shadowcolor=black@0.8:shadowx=6:shadowy=6:enable='between(t,${st.toFixed(2)},${en.toFixed(2)})'`;
  }).join('');

  const tracks = await ensureMusicCached();
  const musicDir = path.join(__dirname, 'assets', 'music-real');
  let playlist = (process.env.LONGO_TRACKS || TRACK).split(',').map(s => s.trim()).filter(Boolean)
    .map(n => path.join(musicDir, n)).filter(f => fs.existsSync(f));
  if (!playlist.length) {
    const t = (selectTrackForTopic('espaco universo', tracks) || {}).path;
    if (t) playlist = [t];
  }
  console.log(`[longo] trilha (${playlist.length} faixa(s)): ${playlist.map(p => path.basename(p)).join(' -> ')}`);
  const bed = path.join(work, '_bed_' + Date.now() + '.mp3');
  {
    const bi = [];
    playlist.forEach(p => bi.push('-i', p));
    const fmt = playlist.map((_, i) => `[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo,afade=t=in:st=0:d=1.5[b${i}]`).join(';');
    let bedFilter = '';
    if (playlist.length === 1) {
      bedFilter = '[b0]anull[bed]';
    } else {
      const parts = [];
      for (let i = 1; i < playlist.length; i++) {
        const left = i === 1 ? '[b0]' : `[xf${i - 1}]`;
        const right = `[b${i}]`;
        const out = i === playlist.length - 1 ? '[bed]' : `[xf${i}]`;
        parts.push(`${left}${right}acrossfade=d=2:c1=tri:c2=tri${out}`);
      }
      bedFilter = parts.join(';');
    }
    const br = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...bi, '-filter_complex', `${fmt};${bedFilter}`, '-map', '[bed]', '-c:a', 'libmp3lame', '-q:a', '4', '-y', bed], { timeout: 120000 });
    if (br.status !== 0 || !fs.existsSync(bed)) { console.error('[longo] falha ao montar trilha:', (br.stderr || '').toString().slice(-220)); process.exit(1); }
  }

  const DUR = +(narrDur + 1.2).toFixed(2);
  const inputs = [];
  clips.forEach(c => inputs.push('-i', c));
  inputs.push('-i', audioPath, '-stream_loop', '-1', '-i', bed);
  const vIdx = clips.map((_, i) => `[${i}:v]`).join('');
  const aNarr = clips.length, aMus = clips.length + 1;
  const filter =
    `${vIdx}concat=n=${clips.length}:v=1,format=yuv420p,subtitles='_longo_caps.ass'${hookDraw}${numDraw}[v];` +
    `[${aMus}:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.42[mus];` +
    `[${aNarr}:a]aresample=44100,aformat=channel_layouts=stereo,volume=1.4,asplit=2[v1][v2];` +
    `[mus][v1]sidechaincompress=threshold=0.04:ratio=6:attack=10:release=250[duck];` +
    `[duck][v2]amix=inputs=2:duration=first:weights=1 1:normalize=0,loudnorm=I=-15:TP=-1.5,afade=t=out:st=${(DUR - 1.2).toFixed(2)}:d=1.2[a]`;
  const args = ['-hide_banner', '-loglevel', 'error', '-stats', ...inputs,
    '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-t', String(DUR),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', path.basename(OUT)];
  console.log('[longo] compondo vídeo final 16:9 com números...');
  const r = spawnSync(ffmpeg, args, { cwd: work, stdio: 'inherit', timeout: 600000 });
  try { clips.forEach(c => fs.unlinkSync(c)); fs.rmSync(tmp, { recursive: true, force: true }); fs.unlinkSync(bed); } catch {}
  if (r.status === 0 && fs.existsSync(OUT)) console.log(`[longo] ✓ PRONTO: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
  else { console.error('[longo] falhou:', r.status); process.exit(1); }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
