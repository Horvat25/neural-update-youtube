'use strict';
/**
 * build-lote-numeros.js — monta os 15 Shorts da série "O Universo em Números".
 * Lê exports/<slug>/meta.json: usa _serie.track/topic; HOOK_BIG_FIRST=1 (número gigante);
 * se _isca=true (eps 3/6/9/12/15), cola a cena da isca grátis no fim (append-isca-cta.js).
 * Pula quem já tem o mp4 final (idempotente). Rode com images já geradas.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const BASE = path.join(ROOT, 'exports');

const EPS = ['n1-t-zero','n2-inflacao','n3-um-segundo','n4-tres-minutos','n5-primeira-luz',
  'n6-primeira-estrela','n7-galaxias','n8-nasce-o-sol','n9-agora','n10-oceanos','n11-andromeda',
  'n12-morte-do-sol','n13-ultima-estrela','n14-ultimo-buraco-negro','n15-morte-termica'];

const only = process.argv.slice(2); // opcional: rodar só alguns slugs
const list = only.length ? EPS.filter(s => only.includes(s)) : EPS;
const env = { ...process.env, HOOK_BIG_FIRST: '1', SHORTS_VOICE: 'male' };

for (const slug of list) {
  const dir = path.join(BASE, slug);
  const finalMp4 = path.join(dir, `${slug}.mp4`);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const track = meta._serie?.track || 'cosmic-the-descent.mp3';
  const topic = meta._serie?.topic || 'universo';
  const isca = !!meta._isca;

  const imgs = fs.readdirSync(dir).filter(f => /^img\d+\.(png|jpg|jpeg|webp)$/i.test(f));
  if (imgs.length < 2) { console.log(`\n### ${slug}: SÓ ${imgs.length} imagem — PULANDO (gerar imagens antes)`); continue; }
  if (fs.existsSync(finalMp4) && process.env.FORCE !== '1') { console.log(`\n### ${slug}: ${slug}.mp4 já existe — pulando`); continue; }

  console.log(`\n### ${slug} (${imgs.length} imgs${isca ? ', +ISCA' : ''}, trilha ${track}) ###`);
  const base = isca ? path.join(dir, '_base.mp4') : finalMp4;
  // Retry: o Edge TTS às vezes cai por blip de rede (ENOTFOUND). Tenta até 3x
  // com espera crescente antes de desistir desse dia (não custa crédito, só CPU).
  let r = { status: 1 };
  for (let attempt = 1; attempt <= 3 && r.status !== 0; attempt++) {
    if (attempt > 1) { console.log(`### ${slug}: retry montagem ${attempt} (falha de rede/TTS)...`); spawnSync('node', ['-e', `setTimeout(()=>{}, ${attempt * 5000})`]); }
    r = spawnSync('node', ['make-short-img-flex.js', `exports/${slug}`, base, topic, track],
      { cwd: ROOT, env, stdio: 'inherit', timeout: 300000 });
  }
  if (r.status !== 0) { console.error(`### ${slug}: FALHA montagem base (3 tentativas)`); continue; }

  if (isca) {
    const bg = path.join(dir, 'img1.png');
    r = spawnSync('node', ['append-isca-cta.js', base, bg, finalMp4, 'cosmic-infinite-perspective.mp3'],
      { cwd: ROOT, env, stdio: 'inherit', timeout: 300000 });
    if (r.status !== 0) { console.error(`### ${slug}: FALHA append isca`); continue; }
    try { fs.unlinkSync(base); } catch {}
  }
  const mb = (fs.statSync(finalMp4).size / 1048576).toFixed(1);
  console.log(`### ${slug}: OK (${mb} MB)`);
}
console.log('\n===== MONTAGEM DO LOTE COMPLETA =====');
