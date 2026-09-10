'use strict';
/**
 * build-tiktok-lote.js — versões TIKTOK da grade (39), com TRILHAS SEGURAS.
 *
 * Diagnóstico 10/jul (tiktok-music-id.js): o TikTok FLAGRA e silencia vídeos com
 * cosmic-the-descent / cosmic-infinite-perspective / dark-bump-in-the-night.
 * Trilhas que PASSARAM no check: quantum-investigations, dark-some-amount-of-evil.
 *
 * Regra: vídeo com trilha flagrada no corpo OU com card de isca (rabo usava
 * cosmic-infinite-perspective) → REBUILD com trilha segura; os já-seguros são
 * só COPIADOS. Formato = igual ao Instagram (isca → card COMENTA COSMOS).
 * Saída: exports/<slug>/<slug>-tiktok.mp4 + cópia em tiktok-lote/.
 * Só CPU/ffmpeg/TTS — zero crédito de IA. Idempotente (pula quem já existe).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const BASE = path.join(ROOT, 'exports');
const OUTDIR = path.join(ROOT, 'tiktok-lote');

const SAFE = ['quantum-investigations.mp3', 'dark-some-amount-of-evil.mp3'];
const BAD = new Set(['cosmic-the-descent.mp3', 'cosmic-infinite-perspective.mp3', 'dark-bump-in-the-night.mp3']);
const CTA_TRACK = 'quantum-investigations.mp3'; // card COSMOS: trilha segura

// trilha do corpo por slug (meta + identificação acústica p/ os sem meta)
const TRACK_OF = {
  'n1-t-zero': 'cosmic-the-descent.mp3', 'n2-inflacao': 'cosmic-infinite-perspective.mp3',
  'n3-um-segundo': 'quantum-investigations.mp3', 'n4-tres-minutos': 'cosmic-infinite-perspective.mp3',
  'n5-primeira-luz': 'cosmic-the-descent.mp3', 'n6-primeira-estrela': 'dark-bump-in-the-night.mp3',
  'n7-galaxias': 'cosmic-infinite-perspective.mp3', 'n8-nasce-o-sol': 'cosmic-the-descent.mp3',
  'n9-agora': 'cosmic-infinite-perspective.mp3', 'n10-oceanos': 'dark-some-amount-of-evil.mp3',
  'n11-andromeda': 'cosmic-the-descent.mp3', 'n12-morte-do-sol': 'dark-bump-in-the-night.mp3',
  'n13-ultima-estrela': 'dark-some-amount-of-evil.mp3', 'n14-ultimo-buraco-negro': 'quantum-investigations.mp3',
  'n15-morte-termica': 'cosmic-the-descent.mp3',
  'aula-materia-escura': 'cosmic-infinite-perspective.mp3', 'aula-energia-escura': 'cosmic-the-descent.mp3',
  'aula-transito': 'cosmic-infinite-perspective.mp3', 'pl4-zona-habitavel': 'cosmic-infinite-perspective.mp3',
  'news1-webb-galaxia': 'cosmic-infinite-perspective.mp3', 'news2-k2-18b': 'quantum-investigations.mp3',
  'news3-buraco-antigo': 'dark-bump-in-the-night.mp3', 'news4-interestelar': 'cosmic-the-descent.mp3',
  'news5-agua-espaco': 'cosmic-infinite-perspective.mp3', 'news6-euclid': 'quantum-investigations.mp3',
  'news7-bennu': 'cosmic-the-descent.mp3', 'news8-frb': 'quantum-investigations.mp3',
  'news9-planeta-diamante': 'cosmic-infinite-perspective.mp3',
  'viral1-zoo': 'quantum-investigations.mp3', 'viral2-kilonova': 'cosmic-the-descent.mp3',
  'viral3-planeta-nove': 'dark-bump-in-the-night.mp3', 'viral4-laniakea': 'cosmic-infinite-perspective.mp3',
  'viral5-pale-blue-dot': 'cosmic-the-descent.mp3', 'viral6-sempre-caindo': 'cosmic-infinite-perspective.mp3',
  'viral7-quasar': 'dark-some-amount-of-evil.mp3',
  'vsl-ebook': 'dark-some-amount-of-evil.mp3', 'vsl2-gato': 'quantum-investigations.mp3',
  'vsl3-wow': 'dark-bump-in-the-night.mp3', 'vsl4-chuva-vidro': 'dark-some-amount-of-evil.mp3',
};
const SLUGS = Object.keys(TRACK_OF);

const only = process.argv.slice(2);
const list = only.length ? SLUGS.filter(s => only.includes(s)) : SLUGS;
fs.mkdirSync(OUTDIR, { recursive: true });

let ok = 0, copied = 0, fail = [];
for (let i = 0; i < list.length; i++) {
  const slug = list[i];
  const dir = path.join(BASE, slug);
  const finalOut = path.join(OUTDIR, `${slug}.mp4`);
  if (fs.existsSync(finalOut) && process.env.FORCE !== '1') { console.log(`### ${slug}: já no lote — pulando`); ok++; continue; }

  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const isca = !!meta._isca;
  const bodyBad = BAD.has(TRACK_OF[slug]);

  if (!bodyBad && !isca) {
    // corpo seguro e sem card → copia o mp4 do YouTube como está
    fs.copyFileSync(path.join(dir, `${slug}.mp4`), finalOut);
    console.log(`### ${slug}: corpo seguro — COPIADO`);
    copied++; ok++; continue;
  }

  // rebuild com trilha segura (alterna p/ variar) — formato igual ao Insta
  const track = SAFE[i % SAFE.length];
  const topic = meta._serie?.topic || meta._prod?.topic || 'universo';
  const env = { ...process.env, HOOK_BIG_FIRST: '1', SHORTS_VOICE: 'male', KEYWORD: 'COSMOS' };
  console.log(`\n### ${slug} (tiktok, trilha ${track}${isca ? ', +COSMOS' : ''}) ###`);

  const body = path.join(dir, '_base_tiktok.mp4');
  const out = isca ? body : finalOut;
  let r = { status: 1 };
  for (let a = 1; a <= 3 && r.status !== 0; a++) {
    if (a > 1) { console.log(`### ${slug}: retry ${a}...`); spawnSync('node', ['-e', `setTimeout(()=>{},${a * 5000})`]); }
    r = spawnSync('node', ['make-short-img-flex.js', `exports/${slug}`, out, topic, track],
      { cwd: ROOT, env, stdio: 'inherit', timeout: 300000 });
  }
  if (r.status !== 0) { console.error(`### ${slug}: FALHA corpo`); fail.push(slug); continue; }

  if (isca) {
    const bg = path.join(dir, 'img1.png');
    r = spawnSync('node', ['append-insta-cta.js', body, bg, finalOut, CTA_TRACK],
      { cwd: ROOT, env, stdio: 'inherit', timeout: 300000 });
    try { fs.unlinkSync(body); } catch {}
    if (r.status !== 0 || !fs.existsSync(finalOut)) { console.error(`### ${slug}: FALHA card COSMOS`); fail.push(slug); continue; }
  }
  console.log(`### ${slug}: OK tiktok (${(fs.statSync(finalOut).size / 1048576).toFixed(1)} MB)`);
  ok++;
}
console.log(`\n===== TIKTOK LOTE: ${ok} ok (${copied} copiados) | ${fail.length} falha(s)${fail.length ? ': ' + fail.join(', ') : ''} =====`);
