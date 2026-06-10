'use strict';
/**
 * auto-agent.js — orquestra: tema → roteiro (LLM) → vídeo (FFmpeg) → publica (YouTube API).
 * Rotação de formatos (notícia → conhecimento → notícia → tutorial).
 * Store de posts em arquivo (data/posts.json) — sem banco externo.
 */
require('dotenv').config();
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const fs = require('fs');
const path = require('path');
const { generateScript, TUTORIAL_POOL, CONHECIMENTO_POOL, pickFromPool, BLOG_URL } = require('./content-generator');
const { createVideo } = require('./video-creator');
const { uploadToYouTube, isConnected: isYouTubeConnected } = require('./youtube-uploader');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const ROTATION_FILE = path.join(DATA_DIR, 'format-rotation.json');

// ─── Rotação de formatos (diversificação automática) ──────────────────────────
const FORMAT_ROTATION = ['noticia_tech', 'conhecimento', 'noticia_tech', 'tutorial'];
function nextFormat(forced) {
  if (forced && FORMAT_ROTATION.includes(forced)) return forced;
  let i = 0;
  try { i = JSON.parse(fs.readFileSync(ROTATION_FILE, 'utf8')).i || 0; } catch {}
  const fmt = FORMAT_ROTATION[i % FORMAT_ROTATION.length];
  try { fs.writeFileSync(ROTATION_FILE, JSON.stringify({ i: (i + 1) % 1000 })); } catch {}
  return fmt;
}

// ─── Store de posts (arquivo) ─────────────────────────────────────────────────
function loadPosts() { try { return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8')); } catch { return []; } }
let posts = loadPosts();
function persist() { try { fs.writeFileSync(POSTS_FILE, JSON.stringify(posts.slice(0, 100), null, 2)); } catch {} }
function savePost(data) { const row = { ...data, id: data.id || Date.now().toString() }; posts.unshift(row); persist(); return row; }
function updatePost(id, updates) {
  const i = posts.findIndex(p => String(p.id) === String(id));
  if (i >= 0) { Object.assign(posts[i], updates); persist(); }
}
function getInMemoryPosts() { return posts; }

// ─── RSS trending: Google News + blog Neural Update ───────────────────────────
const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=inteligencia+artificial+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  'https://news.google.com/rss/search?q=ChatGPT+OR+Claude+OR+Gemini+OR+deepfake+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  'https://news.google.com/rss/search?q=ia+tecnologia+2026&hl=pt-BR&gl=BR&ceid=BR:pt-419',
];
// Blog como fonte: gera vídeo a partir dos artigos publicados (WordPress = /feed/)
const BLOG_FEED = process.env.BLOG_FEED || (BLOG_URL.replace(/\/$/, '') + '/feed/');

async function fetchFeed(url, sourceLabel) {
  try {
    const res = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const parsed = await parseStringPromise(res.data, { explicitArray: false });
    const items = parsed?.rss?.channel?.item || [];
    const arr = Array.isArray(items) ? items : [items];
    const channelTitle = parsed?.rss?.channel?.title;
    return arr.slice(0, 6).map(item => ({
      title: (item.title?._ || item.title || '').trim(),
      link: item.link?._ || item.link || '',
      source: sourceLabel || (typeof item.source === 'object' ? item.source?._ : item.source) || channelTitle || 'Google News',
      fromBlog: !!sourceLabel && /blog/i.test(sourceLabel),
    })).filter(x => x.title);
  } catch (e) { console.warn('[rss]', url.slice(0, 50), e.message); return []; }
}

async function fetchTrendingFromRSS() {
  const groups = await Promise.all([
    fetchFeed(BLOG_FEED, 'Blog Neural Update'),  // prioriza o próprio blog
    ...RSS_FEEDS.map(u => fetchFeed(u)),
  ]);
  const all = groups.flat();
  const seen = new Set();
  return all.filter(it => { if (seen.has(it.title)) return false; seen.add(it.title); return true; }).slice(0, 12);
}

// ─── Pipeline principal ───────────────────────────────────────────────────────
async function runAutoAgent({ withVideo = false, format: forcedFormat } = {}) {
  const format = nextFormat(forcedFormat);
  console.log(`\n[auto-agent] ${new Date().toLocaleString('pt-BR')} — iniciando (formato: ${format})`);

  // 1. Define o TEMA conforme o formato
  let topic;
  if (format === 'noticia_tech') {
    const trending = await fetchTrendingFromRSS();
    if (trending.length > 0) {
      topic = { title: trending[0].title, source: trending[0].source, link: trending[0].link || '', angle: `Em alta — fonte: ${trending[0].source}` };
    } else {
      topic = { title: 'IA substituindo empregos no Brasil em 2026', source: 'Neural Update', angle: 'impacto real no mercado' };
    }
  } else if (format === 'tutorial') {
    topic = { title: pickFromPool(TUTORIAL_POOL), angle: 'tutorial prático' };
  } else {
    topic = { title: pickFromPool(CONHECIMENTO_POOL), angle: 'conhecimento fascinante' };
  }
  console.log(`[auto-agent] Tema (${format}): "${topic.title}"`);

  // 2. Roteiro + SEO (1 chamada LLM)
  console.log('[auto-agent] Gerando roteiro...');
  let script;
  try { script = await generateScript(topic, format); }
  catch (err) { console.error('[auto-agent] Erro no roteiro:', err.message); return null; }

  // 3. Salva no store
  const post = savePost({
    topic: topic.title, format,
    title: script.title, script: script.script,
    description: script.description, source: script.source || topic.source || null,
    tags: script.tags || [], hashtags: script.hashtags || [],
    hook: script.hook, visual_notes: script.algorithm_notes,
    hook_text_overlay: script.hook_text_overlay, cta_text_overlay: script.cta_text_overlay,
    image_queries: script.image_queries, best_post_time: script.best_post_time,
    status: 'scripted', created_at: new Date().toISOString(),
  });
  console.log(`[auto-agent] Roteiro salvo: "${script.title}"`);

  // 4. Vídeo
  if (withVideo) {
    console.log('[auto-agent] Criando vídeo...');
    updatePost(post.id, { status: 'creating_video', stage: 'tts', stage_msg: 'Iniciando...' });
    try {
      const videoPath = await createVideo({
        script: script.script, title: script.title, topic: topic.title,
        hashtags: script.hashtags, hookTextOverlay: script.hook_text_overlay,
        ctaTextOverlay: script.cta_text_overlay, imageQueries: script.image_queries,
        postId: String(post.id),
        onProgress: (stage, message) => updatePost(post.id, { stage, stage_msg: message }),
      });
      updatePost(post.id, { status: 'video_ready', stage: 'done', stage_msg: null, video_path: videoPath });
      // Sidecar JSON (sobrevive a reinício; alimenta o botão Publicar do painel)
      try {
        fs.writeFileSync(videoPath.replace(/\.mp4$/i, '.json'), JSON.stringify({
          title: script.title, description: script.description, tags: script.tags,
          hashtags: script.hashtags, source: script.source || topic.source || null,
          topic: topic.title, script: script.script, created_at: new Date().toISOString(),
        }, null, 2));
      } catch {}
      console.log(`[auto-agent] Vídeo pronto: ${videoPath}`);
      return { post, videoPath };
    } catch (err) {
      console.error('[auto-agent] Erro no vídeo:', err.message);
      updatePost(post.id, { status: 'video_error', stage: null, error: err.message });
    }
  }
  return { post, videoPath: null };
}

// ─── Ciclo completo: tema → roteiro → vídeo → PUBLICA no YouTube ───────────────
async function runDailyPost({ privacyStatus, format } = {}) {
  const privacy = privacyStatus || process.env.YT_PRIVACY || 'unlisted';
  console.log(`\n[daily-post] ${new Date().toLocaleString('pt-BR')} — ciclo iniciado (privacy: ${privacy}${format ? ', formato ' + format : ''})`);

  if (!isYouTubeConnected()) {
    console.error('[daily-post] YouTube desconectado — pulei. Rode: node youtube-login.js');
    return { ok: false, reason: 'youtube_desconectado' };
  }

  const result = await runAutoAgent({ withVideo: true, format });
  if (!result || !result.videoPath) {
    console.error('[daily-post] Vídeo não foi gerado — nada a publicar.');
    return { ok: false, reason: 'sem_video', post: result && result.post };
  }

  const p = result.post || {};
  try {
    const up = await uploadToYouTube({
      videoPath: result.videoPath, title: p.title, description: p.description,
      tags: p.tags, hashtags: p.hashtags, privacyStatus: privacy,
    });
    updatePost(p.id, { status: 'posted', youtube_id: up.id, youtube_url: up.url, privacy: up.privacyStatus, posted_at: new Date().toISOString() });
    console.log(`[daily-post] ✓ publicado (${up.privacyStatus}): ${up.url}`);
    return { ok: true, post: p, videoPath: result.videoPath, youtube: up };
  } catch (e) {
    console.error('[daily-post] Erro ao publicar:', e.message);
    updatePost(p.id, { status: 'post_error', error: e.message });
    return { ok: false, reason: 'erro_upload', error: e.message, videoPath: result.videoPath, post: p };
  }
}

module.exports = { runAutoAgent, runDailyPost, fetchTrendingFromRSS, getInMemoryPosts, updatePost, savePost };
