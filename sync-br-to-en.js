'use strict';
/**
 * Detects a newly published BR Short, rebuilds an English version from the
 * local master assets, and uploads it to the English channel.
 *
 * Usage:
 *   node sync-br-to-en.js --latest
 *   node sync-br-to-en.js --latest --dry
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawnSync } = require('child_process');
const { google, getAuthorizedClient } = require('./youtube-auth');
const { adaptToEnglish: adaptToEnglishShared } = require('./translate-to-en');

const ROOT = __dirname;
const DRY = process.argv.includes('--dry');
const LATEST = process.argv.includes('--latest');
const STATE_FILE = path.join(ROOT, 'data', 'en-sync-state.json');
const HIGGS_DIR = path.join(ROOT, 'exports', 'higgsfield-test');
const OUT_DIR = path.join(ROOT, 'exports', 'english-ready');

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function saveJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function normTitle(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/#shorts/gi, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

async function getRecentBrVideos() {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const chRes = await yt.channels.list({ part: ['contentDetails', 'snippet'], mine: true });
  const ch = chRes.data.items && chRes.data.items[0];
  if (!ch) throw new Error('BR channel not found');
  const uploads = ch.contentDetails.relatedPlaylists.uploads;
  const pl = await yt.playlistItems.list({ part: ['contentDetails'], playlistId: uploads, maxResults: 12 });
  const ids = (pl.data.items || []).map(i => i.contentDetails.videoId).filter(Boolean);
  if (!ids.length) return [];
  const vids = await yt.videos.list({ part: ['snippet', 'status'], id: ids.join(',') });
  return (vids.data.items || [])
    .filter(v => v.status && v.status.privacyStatus === 'public')
    .sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
}

function findLocalMaster(brTitle) {
  const target = normTitle(brTitle);
  const metas = walk(HIGGS_DIR).filter(f => path.basename(f).toLowerCase() === 'meta.json');
  let best = null;
  for (const file of metas) {
    const meta = loadJson(file, null);
    if (!meta || !meta.title) continue;
    const n = normTitle(meta.title);
    let score = 0;
    if (n === target) score = 100;
    else if (target.includes(n) || n.includes(target)) score = 80;
    else {
      const a = new Set(target.split(' ').filter(w => w.length > 3));
      const b = new Set(n.split(' ').filter(w => w.length > 3));
      score = [...a].filter(w => b.has(w)).length;
    }
    if (!best || score > best.score) best = { file, dir: path.dirname(file), meta, score };
  }
  if (!best || best.score < 3) return null;
  return best;
}

async function adaptToEnglish({ brVideo, local }) {
  const roteiroPath = path.join(local.dir, 'roteiro.txt');
  const roteiro = fs.existsSync(roteiroPath) ? fs.readFileSync(roteiroPath, 'utf8').trim() : '';
  return adaptToEnglishShared({ title: brVideo.snippet.title, description: local.meta.description || '', roteiro });
}

function copyVisualAssets(local, workDir) {
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
  const imgs = fs.readdirSync(local.dir)
    .filter(f => /^img\d+\.(png|jpe?g|webp)$/i.test(f))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0));
  if (imgs.length < 2) throw new Error(`not enough image assets in ${local.dir}`);
  for (const img of imgs) fs.copyFileSync(path.join(local.dir, img), path.join(workDir, img));
  return imgs;
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', timeout: opts.timeout || 600000, env: { ...process.env, ...(opts.env || {}) } });
  if (res.status !== 0) throw new Error(`${cmd} failed with ${res.status}`);
}

async function main() {
  if (!LATEST) throw new Error('Use --latest for now');
  const state = loadJson(STATE_FILE, { processed: {} });
  const [brVideo] = await getRecentBrVideos();
  if (!brVideo) throw new Error('no public BR videos found');
  if (state.processed[brVideo.id]) {
    console.log(`[en-sync] already processed ${brVideo.id}: ${state.processed[brVideo.id].url}`);
    return;
  }

  const local = findLocalMaster(brVideo.snippet.title);
  if (!local) throw new Error(`local master not found for: ${brVideo.snippet.title}`);
  console.log(`[en-sync] BR: ${brVideo.snippet.title}`);
  console.log(`[en-sync] local: ${local.dir}`);

  const en = await adaptToEnglish({ brVideo, local });
  const slug = brVideo.id;
  const workDir = path.join(OUT_DIR, 'work', `auto-${slug}`);
  copyVisualAssets(local, workDir);
  fs.writeFileSync(path.join(workDir, 'roteiro.txt'), en.script.trim(), 'utf8');
  fs.writeFileSync(path.join(workDir, 'hook.txt'), (en.hook || '').trim(), 'utf8');

  const raw = path.join(OUT_DIR, `${slug}-en-raw.mp4`);
  const finalVideo = path.join(OUT_DIR, `${slug}-en-watermarked.mp4`);
  const metaPath = path.join(OUT_DIR, `${slug}-en.meta.json`);
  const meta = {
    title: en.title,
    description: en.description,
    tags: en.tags || [],
    hashtags: en.hashtags || ['#Shorts', '#Science', '#NeuralUpdate'],
    privacyStatus: 'public',
    includeBlog: false,
    defaultLanguage: 'en-US',
    defaultAudioLanguage: 'en-US',
    sourceBrVideoId: brVideo.id,
    sourceBrTitle: brVideo.snippet.title,
    sourceBrPublishedAt: brVideo.snippet.publishedAt,
  };
  saveJson(metaPath, meta);

  if (DRY) {
    console.log('[en-sync] dry run metadata:', metaPath);
    return;
  }

  run(process.execPath, ['make-short-img-flex.js', workDir, raw, en.topic || en.title], { env: { SHORTS_VOICE: 'englishMale' } });
  run(process.execPath, ['watermark-video.js', raw, finalVideo]);
  run(process.execPath, ['post-video-en.js', finalVideo, metaPath]);

  state.processed[brVideo.id] = {
    title: brVideo.snippet.title,
    processedAt: new Date().toISOString(),
    videoPath: finalVideo,
  };
  saveJson(STATE_FILE, state);
}

main().catch(e => {
  console.error('[en-sync] ERROR:', e.message);
  process.exit(1);
});
