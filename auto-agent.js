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
const { createVideo, WORK_DIR, buildFromDir, wrapHook } = require('./video-creator-higgsfield');
const { adaptToEnglish } = require('./translate-to-en');
const { spawn } = require('child_process');
const { uploadToYouTube, isConnected: isYouTubeConnected } = require('./youtube-uploader');
const { planCta, saveCount } = require('./cta');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const ROTATION_FILE = path.join(DATA_DIR, 'format-rotation.json');

// ─── Rotação de formatos (diversificação automática) ──────────────────────────
// Pesos pela performance real do canal (jun/2026): conhecimento (espaço/quântica)
// faz 5-10x mais views que notícia → 80% conhecimento, 20% tutorial, 0% notícia_tech (pausado, ~5 views).
const FORMAT_ROTATION = ['conhecimento', 'conhecimento', 'conhecimento', 'conhecimento', 'tutorial'];
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

// Temas dos últimos posts (anti-repetição): tudo que virou vídeo nos últimos 21 dias
// ou os últimos 40 posts (o que cobrir mais). Era 7 dias/15 posts — curto demais pro
// volume do canal (3-5/dia), deixava tema do pool de "conhecimento" (35 itens) repetir
// (ex.: dilatação do tempo virou 4-5 vídeos quase idênticos).
function getRecentTopics() {
  const cutoff = Date.now() - 21 * 864e5;
  const recent = posts.filter((p, i) => i < 40 || new Date(p.created_at || 0).getTime() > cutoff);
  return [...new Set(recent.map(p => (p.topic || '').toLowerCase().trim()).filter(Boolean))];
}

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
async function runAutoAgent({ withVideo = false, format: forcedFormat, forcedTopic } = {}) {
  const format = forcedTopic ? (forcedTopic.format || 'noticia_tech') : nextFormat(forcedFormat);
  console.log(`\n[auto-agent] ${new Date().toLocaleString('pt-BR')} — iniciando (formato: ${format})`);

  // 1. Define o TEMA conforme o formato (ou usa o tema forçado vindo da aba Pesquisa)
  // Anti-repetição: pula temas/manchetes que já viraram vídeo recentemente.
  const recentTopics = getRecentTopics();
  let topic;
  if (forcedTopic && forcedTopic.title) {
    topic = { title: forcedTopic.title, source: forcedTopic.source || 'Neural Update', link: forcedTopic.link || '', angle: `Tema escolhido na Pesquisa — fonte: ${forcedTopic.source || 'pesquisa'}` };
  } else if (format === 'noticia_tech') {
    const trending = await fetchTrendingFromRSS();
    const fresh = trending.find(t => !recentTopics.includes((t.title || '').toLowerCase().trim())) || trending[0];
    if (fresh) {
      topic = { title: fresh.title, source: fresh.source, link: fresh.link || '', angle: `Em alta — fonte: ${fresh.source}` };
    } else {
      topic = { title: 'IA substituindo empregos no Brasil em 2026', source: 'Neural Update', angle: 'impacto real no mercado' };
    }
  } else if (format === 'tutorial') {
    topic = { title: pickFromPool(TUTORIAL_POOL, recentTopics), angle: 'tutorial prático' };
  } else {
    topic = { title: pickFromPool(CONHECIMENTO_POOL, recentTopics), angle: 'conhecimento fascinante' };
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
    const ctaPlan = await planCta({ commit: false });
    const subscriberCta = ctaPlan.hasCta ? ctaPlan.cta : null;
    const videoScript = subscriberCta ? `${script.script} ${subscriberCta.narration}` : script.script;
    const videoCtaOverlay = subscriberCta ? subscriberCta.label : script.cta_text_overlay;
    if (subscriberCta) console.log(`[auto-agent] CTA de inscritos ativo: ${subscriberCta.bar} (video #${ctaPlan.videoNumber})`);
    console.log('[auto-agent] Criando vídeo...');
    updatePost(post.id, { status: 'creating_video', stage: 'tts', stage_msg: 'Iniciando...' });
    try {
      const videoPath = await createVideo({
        script: videoScript, title: script.title, topic: topic.title,
        hashtags: script.hashtags, hookTextOverlay: script.hook_text_overlay,
        ctaTextOverlay: videoCtaOverlay, imageQueries: script.image_queries,
        subscriberCta,
        postId: String(post.id),
        onProgress: (stage, message) => updatePost(post.id, { stage, stage_msg: message }),
      });
      updatePost(post.id, { status: 'video_ready', stage: 'done', stage_msg: null, video_path: videoPath, subscriber_cta: subscriberCta });
      // Sidecar JSON (sobrevive a reinício; alimenta o botão Publicar do painel)
      try {
        fs.writeFileSync(videoPath.replace(/\.mp4$/i, '.json'), JSON.stringify({
          title: script.title, description: script.description, tags: script.tags,
          hashtags: script.hashtags, source: script.source || topic.source || null,
          topic: topic.title, script: videoScript, subscriber_cta: subscriberCta, created_at: new Date().toISOString(),
        }, null, 2));
      } catch {}
      console.log(`[auto-agent] Vídeo pronto: ${videoPath}`);
      return { post, videoPath, ctaPlan };
    } catch (err) {
      console.error('[auto-agent] Erro no vídeo:', err.message);
      updatePost(post.id, { status: 'video_error', stage: null, error: err.message });
    }
  }
  return { post, videoPath: null };
}

// ─── Ciclo completo: tema → roteiro → vídeo → PUBLICA no YouTube ───────────────
async function runDailyPost({ privacyStatus, format, forcedTopic } = {}) {
  const privacy = privacyStatus || process.env.YT_PRIVACY || 'public';
  console.log(`\n[daily-post] ${new Date().toLocaleString('pt-BR')} — ciclo iniciado (privacy: ${privacy}${format ? ', formato ' + format : ''})`);

  if (!isYouTubeConnected()) {
    console.error('[daily-post] YouTube desconectado — pulei. Rode: node youtube-login.js');
    return { ok: false, reason: 'youtube_desconectado' };
  }

  const result = await runAutoAgent({ withVideo: true, format, forcedTopic });
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
    if (result.ctaPlan) saveCount(result.ctaPlan.videoNumber);
    updatePost(p.id, { status: 'posted', youtube_id: up.id, youtube_url: up.url, privacy: up.privacyStatus, posted_at: new Date().toISOString() });
    console.log(`[daily-post] ✓ publicado (${up.privacyStatus}): ${up.url}`);

    // Publica também em inglês (reaproveita as imagens, só traduz). Não derruba
    // o resultado BR se o EN falhar — só registra o erro.
    let englishUrl = null, englishError = null;
    try {
      console.log('[daily-post] Traduzindo e publicando versão EN...');
      const enRes = await publishToEnglish(p, result.videoPath);
      englishUrl = enRes.url;
      updatePost(p.id, { english_url: englishUrl });
      console.log(`[daily-post] ✓ EN publicado: ${englishUrl}`);
    } catch (e) {
      englishError = e.message;
      console.error('[daily-post] EN falhou (BR já está no ar):', e.message);
      updatePost(p.id, { english_error: englishError });
    }

    return { ok: true, post: p, videoPath: result.videoPath, youtube: up, englishUrl, englishError };
  } catch (e) {
    console.error('[daily-post] Erro ao publicar:', e.message);
    updatePost(p.id, { status: 'post_error', error: e.message });
    return { ok: false, reason: 'erro_upload', error: e.message, videoPath: result.videoPath, post: p };
  }
}

// ─── Publica também no canal EN, reaproveitando as MESMAS imagens (sem gastar
// crédito Higgsfield de novo) — só traduz a narração e refaz o áudio/legenda. ───
let EN_VOICE_TOGGLE = 0;
async function publishToEnglish(post, brVideoPath) {
  const brDir = path.join(WORK_DIR, `post-${post.id}`);
  if (!fs.existsSync(brDir)) throw new Error('Pasta de imagens BR não encontrada: ' + brDir);

  const en = await adaptToEnglish({ title: post.title, description: post.description, roteiro: post.script });

  const enDir = `${brDir}-en`;
  fs.mkdirSync(enDir, { recursive: true });
  for (const f of fs.readdirSync(brDir)) {
    if (/^img\d+\.(png|jpe?g|webp)$/i.test(f)) fs.copyFileSync(path.join(brDir, f), path.join(enDir, f));
  }
  fs.writeFileSync(path.join(enDir, 'roteiro.txt'), String(en.script || '').trim() + '\n', 'utf8');
  fs.writeFileSync(path.join(enDir, 'hook.txt'), wrapHook(en.hook || en.title) + '\n', 'utf8');

  const voice = (EN_VOICE_TOGGLE++ % 2 === 0) ? 'englishMale' : 'englishFemale';
  const enOutPath = path.join(__dirname, 'videos', `post-${post.id}-en.mp4`);
  buildFromDir(enDir, enOutPath, en.topic || en.title, voice);

  const metaPath = path.join(enDir, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    title: en.title, description: en.description, tags: en.tags || [],
    hashtags: en.hashtags && en.hashtags.length ? en.hashtags : ['#Shorts', '#Science', '#NeuralUpdate'],
    privacyStatus: 'public', defaultLanguage: 'en-US', defaultAudioLanguage: 'en-US',
  }, null, 2));

  // Sobe via processo separado (post-video-en.js) — evita o singleton de token
  // BR que esse processo do painel já carregou em memória.
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'post-video-en.js'), enOutPath, metaPath], { cwd: __dirname });
    let out = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => out += d);
    child.on('close', code => {
      const m = out.match(/https?:\/\/youtube\.com\/shorts\/[\w-]+/);
      if (code === 0 && m) resolve({ url: m[0] });
      else reject(new Error('post-video-en falhou: ' + out.slice(-400)));
    });
  });
}

module.exports = { runAutoAgent, runDailyPost, publishToEnglish, fetchTrendingFromRSS, getInMemoryPosts, getRecentTopics, updatePost, savePost };
