'use strict';
/**
 * build-grade.js [slug ...] — monta os vídeos da grade lendo meta._prod (voz/trilha/topico/hookBig)
 * e meta._isca (cola a cena-fim do PDF grátis). Idempotente (pula .mp4 existente salvo FORCE=1).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('ffmpeg-static');
const ROOT = __dirname;
const BASE = path.join(ROOT, 'exports');

// duração de um mp4 (pra detectar TTS truncado → vídeo curto demais)
function durOf(f) {
  const p = spawnSync(ffmpeg, ['-i', f], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 0;
}

const only = process.argv.slice(2);
const dirs = fs.readdirSync(BASE).filter(d => {
  if (only.length) return only.includes(d);
  return /^(aula-|news\d|viral\d)/.test(d) && fs.existsSync(path.join(BASE, d, 'meta.json')) &&
    (JSON.parse(fs.readFileSync(path.join(BASE, d, 'meta.json'), 'utf8'))._prod);
});

for (const slug of dirs) {
  const dir = path.join(BASE, slug);
  const finalMp4 = path.join(dir, `${slug}.mp4`);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const p = meta._prod || {};
  const isca = !!meta._isca;
  const imgs = fs.readdirSync(dir).filter(f => /^img\d+\.(png|jpg|jpeg|webp)$/i.test(f));
  if (imgs.length < 2) { console.log(`### ${slug}: só ${imgs.length} img — PULANDO`); continue; }
  if (fs.existsSync(finalMp4) && process.env.FORCE !== '1') { console.log(`### ${slug}: já existe — pulando`); continue; }

  const env = { ...process.env, HOOK_BIG_FIRST: p.hookBig ? '1' : '0', SHORTS_VOICE: p.voice || 'male' };
  console.log(`\n### ${slug} (${imgs.length} img, voz ${p.voice}, ${p.track}${isca ? ', +ISCA' : ''}) ###`);
  const base = isca ? path.join(dir, '_base.mp4') : finalMp4;
  let r = { status: 1 };
  for (let a = 1; a <= 3; a++) {
    if (a > 1) { console.log(`### ${slug}: retry ${a}`); spawnSync('node', ['-e', `setTimeout(()=>{}, ${a * 5000})`]); }
    r = spawnSync('node', ['make-short-img-flex.js', `exports/${slug}`, base, p.topic || 'universo', p.track || 'cosmic-the-descent.mp3'],
      { cwd: ROOT, env, stdio: 'inherit', timeout: 300000 });
    if (r.status === 0) {
      const d = durOf(base);
      if (d >= 15) break; // ok
      console.error(`### ${slug}: saída CURTA (${d.toFixed(1)}s) — TTS truncou, refazendo`);
      r.status = 1; // força retry
    }
  }
  if (r.status !== 0) { console.error(`### ${slug}: FALHA base`); continue; }

  if (isca) {
    const bg = path.join(dir, 'img1.png');
    r = spawnSync('node', ['append-isca-cta.js', base, bg, finalMp4, 'cosmic-infinite-perspective.mp3'],
      { cwd: ROOT, env, stdio: 'inherit', timeout: 300000 });
    if (r.status !== 0) { console.error(`### ${slug}: FALHA isca`); continue; }
    try { fs.unlinkSync(base); } catch {}
  }
  console.log(`### ${slug}: OK (${(fs.statSync(finalMp4).size / 1048576).toFixed(1)} MB)`);
}
console.log('\n===== GRADE MONTADA =====');
