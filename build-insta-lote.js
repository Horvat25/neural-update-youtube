'use strict';
/**
 * build-insta-lote.js — versões INSTAGRAM/ManyChat dos vídeos com isca.
 * Onde o YouTube diz "LINK NA BIO", o Instagram diz "COMENTA COSMOS" (ManyChat
 * manda o PDF grátis na DM). Regenera o CORPO sem a cena de bio e cola o card
 * COSMOS no fim (append-insta-cta.js). Saída: exports/<slug>/<slug>-insta.mp4.
 *
 *   node build-insta-lote.js            # todos os 10
 *   node build-insta-lote.js n3-um-segundo   # só alguns (teste)
 *
 * Só CPU/ffmpeg — NÃO gera imagem nem gasta crédito de IA. Idempotente.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const BASE = path.join(ROOT, 'exports');

// Os 10 vídeos que têm CTA de isca (link na bio) → viram COMENTA COSMOS.
const ISCA = ['n3-um-segundo', 'n6-primeira-estrela', 'n9-agora', 'n12-morte-do-sol',
  'news3-buraco-antigo', 'news6-euclid', 'news9-planeta-diamante',
  'viral3-planeta-nove', 'viral6-sempre-caindo', 'aula-materia-escura'];

const only = process.argv.slice(2);
const list = only.length ? ISCA.filter(s => only.includes(s)) : ISCA;
const env = { ...process.env, HOOK_BIG_FIRST: '1', SHORTS_VOICE: 'male', KEYWORD: 'COSMOS' };

let ok = 0, fail = [];
for (const slug of list) {
  const dir = path.join(BASE, slug);
  if (!fs.existsSync(dir)) { console.log(`### ${slug}: pasta não existe — pulando`); continue; }
  const out = path.join(dir, `${slug}-insta.mp4`);
  if (fs.existsSync(out) && process.env.FORCE !== '1') { console.log(`### ${slug}: -insta.mp4 já existe — pulando`); ok++; continue; }

  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const track = meta._serie?.track || meta._prod?.track || 'cosmic-the-descent.mp3';
  const topic = meta._serie?.topic || meta._prod?.topic || 'universo';
  const imgs = fs.readdirSync(dir).filter(f => /^img\d+\.(png|jpg|jpeg|webp)$/i.test(f));
  if (imgs.length < 2) { console.log(`### ${slug}: só ${imgs.length} imagem — pulando`); continue; }

  console.log(`\n### ${slug} (insta, ${imgs.length} imgs, trilha ${track}) ###`);
  const body = path.join(dir, '_base_insta.mp4');

  // 1) Corpo SEM cena de bio (retry 3x p/ blip de rede no Edge TTS).
  let r = { status: 1 };
  for (let a = 1; a <= 3 && r.status !== 0; a++) {
    if (a > 1) { console.log(`### ${slug}: retry corpo ${a}...`); spawnSync('node', ['-e', `setTimeout(()=>{},${a * 5000})`]); }
    r = spawnSync('node', ['make-short-img-flex.js', `exports/${slug}`, body, topic, track],
      { cwd: ROOT, env, stdio: 'inherit', timeout: 300000 });
  }
  if (r.status !== 0) { console.error(`### ${slug}: FALHA corpo`); fail.push(slug); continue; }

  // 2) Card COMENTA COSMOS no fim.
  const bg = path.join(dir, 'img1.png');
  r = spawnSync('node', ['append-insta-cta.js', body, bg, out, 'cosmic-infinite-perspective.mp3'],
    { cwd: ROOT, env, stdio: 'inherit', timeout: 300000 });
  try { fs.unlinkSync(body); } catch {}
  if (r.status !== 0 || !fs.existsSync(out)) { console.error(`### ${slug}: FALHA card COSMOS`); fail.push(slug); continue; }

  const mb = (fs.statSync(out).size / 1048576).toFixed(1);
  console.log(`### ${slug}: OK insta (${mb} MB)`);
  ok++;
}
console.log(`\n===== INSTA LOTE: ${ok} ok, ${fail.length} falha(s)${fail.length ? ': ' + fail.join(', ') : ''} =====`);
