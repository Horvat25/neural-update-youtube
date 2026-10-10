'use strict';
/**
 * _tt.js — gera a versão do TikTok de um episódio já montado por _ep.js (09/10/2026).
 *   node _tt.js <spec.json> [<spec.json> ...]
 * TikTok silencia some-amount / rising-tide (Content ID), então: news → cosmic-ambient-espacial, viral → cosmic-ice-flow;
 * aula já usa trilha segura → copia o master. Volume igualado ao master (sem loudnorm: estoura a memória do PC).
 * Saída: tiktok-lote/<slug>-tt.mp4 + tiktok-lote/<slug>-tt.legenda.txt
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const FF = require('./node_modules/ffmpeg-static');
const TRILHA = { news: 'cosmic-ambient-espacial.mp3', viral: 'cosmic-ice-flow.mp3' };

for (const arq of process.argv.slice(2)) {
  const spec = JSON.parse(fs.readFileSync(arq, 'utf8'));
  const S = spec.slug, dir = path.join('exports', S), master = path.join(dir, `${S}.mp4`);
  const out = path.join('tiktok-lote', `${S}-tt.mp4`);
  fs.mkdirSync('tiktok-lote', { recursive: true });
  const info = spawnSync(FF, ['-hide_banner', '-i', master], { encoding: 'utf8' }).stderr || '';
  const m = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const dur = +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
  if (spec.tipo === 'aula') {
    fs.copyFileSync(master, out);
  } else {
    const trilha = path.join('assets', 'music-real', TRILHA[spec.tipo]);
    const st = (dur - 0.25).toFixed(2);
    const fc = `[2:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.45[mus];` +
      `[1:a]atrim=start=0.080,asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo,volume=1.35,asplit=2[voice][key];` +
      `[mus][key]sidechaincompress=threshold=0.035:ratio=4:attack=8:release=180[duck];` +
      `[duck][voice]amix=inputs=2:duration=first:weights=1 1:normalize=0,volume=${spec.tipo==='news'?1.2:1.0},alimiter=limit=0.84,afade=t=out:st=${st}:d=0.25[a]`;
    let ok = false;
    for (let t = 1; t <= 4 && !ok; t++) {
      const r = spawnSync(FF, ['-v', 'error', '-y', '-i', master, '-i', path.join(dir, 'narr.mp3'), '-stream_loop', '-1', '-i', trilha,
        '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', dur.toFixed(2), out], { encoding: 'utf8' });
      ok = r.status === 0;
      if (!ok) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},8000)']);
    }
    if (!ok) { console.log(`✗ ${S}: remix falhou`); continue; }
  }
  const nv = spawnSync(FF, ['-hide_banner', '-i', out, '-af', 'volumedetect', '-vn', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const mv = spawnSync(FF, ['-hide_banner', '-i', master, '-af', 'volumedetect', '-vn', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const g = s => (s.match(/mean_volume: (-?[\d.]+)/) || [])[1];
  // legenda: título limpo + 1ª frase da descrição + hashtags
  const titulo = spec.title.replace(/#Shorts/g, '').replace(/^📰\s*/, '').replace(/^🔭\s*/, '').trim();
  const frase = (spec.desc.replace(/^Escola de Astronomia Neural Update · Sistema Solar\.\s*/, '').match(/^[^.]+\./) || [''])[0];
  const tags = (spec.hashtags || []).filter(h => h !== '#neuralupdate').slice(0, 3).concat(['#astronomia', '#ciencia', '#neuralupdate']).join(' ');
  fs.writeFileSync(path.join('tiktok-lote', `${S}-tt.legenda.txt`), `${titulo}\n\n${frase}\n\n${tags}\n`);
  console.log(`✓ ${S}  tt ${g(nv)} dB (master ${g(mv)} dB)`);
}
