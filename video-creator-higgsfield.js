'use strict';
/**
 * video-creator-higgsfield.js — substitui video-creator.js (que usava banco de
 * imagens local/Pexels). Mesma assinatura de createVideo(), mas por dentro usa
 * o pipeline comprovado: Higgsfield Soul V2 (econômico) + make-short-img-flex.js
 * (TTS com timing por palavra, captions ASS, punch-in zoom, música com duck).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { generateImages } = require('./higgsfield-images');

const WORK_DIR = path.join(__dirname, '.video-work');
const OUTPUT_DIR = path.join(__dirname, 'videos');
[WORK_DIR, OUTPUT_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

function wrapHook(txt, max = 18) {
  const ws = String(txt || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = []; let cur = '';
  for (const w of ws) { if (!cur) cur = w; else if ((cur + ' ' + w).length <= max) cur += ' ' + w; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur);
  return lines.slice(0, 3).join('\n');
}

/**
 * Monta o vídeo a partir de um diretório já preparado (roteiro.txt, hook.txt,
 * imagens img1..N.png) chamando make-short-img-flex.js. Reaproveitável tanto
 * pro BR quanto pro EN (mesmas imagens, narração diferente).
 */
function buildFromDir(dir, outPath, topic, voice) {
  const env = { ...process.env };
  if (voice) env.SHORTS_VOICE = voice;
  const r = spawnSync(process.execPath, [path.join(__dirname, 'make-short-img-flex.js'), dir, outPath, topic], {
    cwd: __dirname, env, timeout: 240000, encoding: 'utf8',
  });
  if (r.status !== 0 || !fs.existsSync(outPath)) {
    throw new Error('make-short-img-flex falhou: ' + ((r.stderr || r.stdout || '').slice(-400)));
  }
  return outPath;
}

/**
 * createVideo — mesma assinatura do video-creator.js antigo.
 * { script, title, topic, hashtags, hookTextOverlay, ctaTextOverlay, imageQueries, postId, onProgress }
 * Retorna o path do vídeo BR. As imagens geradas ficam em .video-work/<postId>/
 * pra serem reaproveitadas depois na versão EN (sem gastar crédito de novo).
 */
async function createVideo({ script, title, topic, imageQueries, hookTextOverlay, postId, onProgress }) {
  const dir = path.join(WORK_DIR, `post-${postId || Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'roteiro.txt'), String(script || '').trim() + '\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'hook.txt'), wrapHook(hookTextOverlay || title) + '\n', 'utf8');

  const prompts = (Array.isArray(imageQueries) && imageQueries.length ? imageQueries : [topic]).slice(0, 7);
  if (onProgress) onProgress('images', `Gerando ${prompts.length} imagens (Higgsfield Soul V2)...`);
  await generateImages(prompts, dir, (i, n) => onProgress && onProgress('images', `Imagem ${i}/${n}...`));

  if (onProgress) onProgress('rendering', 'Montando vídeo (TTS + legendas + trilha)...');
  const outPath = path.join(OUTPUT_DIR, `post-${postId || Date.now()}.mp4`);
  buildFromDir(dir, outPath, topic);

  if (onProgress) onProgress('done', null);
  return outPath;
}

module.exports = { createVideo, buildFromDir, wrapHook, WORK_DIR };
