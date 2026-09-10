'use strict';
/**
 * dashboard.js — painel web (Express) do agente YouTube. Porta 3001.
 * Abas: Início, Formatos, Agendar, Estatísticas, Pesquisa.
 */
const path = require('path');
// .env SEMPRE da raiz do projeto (independente da pasta de onde o painel foi aberto)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const fs = require('fs');
const axios = require('axios');

const { runAutoAgent, runDailyPost, publishToEnglish, fetchTrendingFromRSS, getInMemoryPosts, getRecentTopics, updatePost } = require('../auto-agent');
const { analyzeTopics } = require('../topic-analyzer');
const { uploadToYouTube, isConnected: isYouTubeConnected } = require('../youtube-uploader');
const { getOAuthClient, saveTokens, SCOPES, getAuthorizedClient, google } = require('../youtube-auth');
const { getFullStats, readCache } = require('../youtube-stats');
const { FORMATS } = require('../content-generator');

const ROOT = path.join(__dirname, '..');
const VIDEOS_DIR = path.join(ROOT, 'videos');
const DATA_DIR = path.join(ROOT, 'data');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedule.json');
[VIDEOS_DIR, DATA_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const PORT = process.env.DASHBOARD_PORT ? Number(process.env.DASHBOARD_PORT) : 3001;

const app = express();
app.use(express.json());
app.use('/videos', express.static(VIDEOS_DIR));
app.use(express.static(path.join(ROOT, 'public'), { index: 'dashboard.html' }));

// ── Estado de geração (1 ciclo por vez) ──────────────────────────────────────
let busy = false;

// ── Agendamentos ──────────────────────────────────────────────────────────────
function loadSchedule() { try { return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')); } catch { return []; } }
function saveSchedule(arr) { try { fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(arr, null, 2)); } catch {} }

// ── API ────────────────────────────────────────────────────────────────────────
app.get('/api/status', async (req, res) => {
  res.json({
    youtube_connected: isYouTubeConnected(),
    privacy: process.env.YT_PRIVACY || 'unlisted',
    busy,
    formats: Object.fromEntries(Object.entries(FORMATS).map(([k, v]) => [k, v.label])),
  });
});

app.get('/api/posts', (req, res) => res.json(getInMemoryPosts().slice(0, 30)));

// Gera um vídeo (sem publicar) — assíncrono; a UI acompanha por /api/posts
app.post('/api/generate', (req, res) => {
  if (busy) return res.status(409).json({ error: 'Já existe uma geração em andamento.' });
  const format = (req.body && req.body.format) || undefined;
  busy = true;
  runAutoAgent({ withVideo: true, format })
    .then(() => { busy = false; })
    .catch(e => { busy = false; console.error('[dashboard] generate:', e.message); });
  res.json({ ok: true, started: true, format: format || 'rotação' });
});

// Ciclo completo: gera + PUBLICA agora
app.post('/api/run-now', (req, res) => {
  if (busy) return res.status(409).json({ error: 'Já existe um ciclo em andamento.' });
  const { format, privacyStatus } = req.body || {};
  busy = true;
  runDailyPost({ format, privacyStatus })
    .then(() => { busy = false; })
    .catch(e => { busy = false; console.error('[dashboard] run-now:', e.message); });
  res.json({ ok: true, started: true });
});

// Publica um vídeo já pronto (pelo id do post)
app.post('/api/publish', async (req, res) => {
  try {
    const { id, privacyStatus } = req.body || {};
    const post = getInMemoryPosts().find(p => String(p.id) === String(id));
    if (!post || !post.video_path || !fs.existsSync(post.video_path)) {
      return res.status(404).json({ error: 'Vídeo não encontrado para esse post.' });
    }
    const up = await uploadToYouTube({
      videoPath: post.video_path, title: post.title, description: post.description,
      tags: post.tags, hashtags: post.hashtags, privacyStatus,
    });
    updatePost(post.id, { status: 'posted', youtube_id: up.id, youtube_url: up.url, privacy: up.privacyStatus, posted_at: new Date().toISOString() });

    // Mesma regra do ciclo automático: publica também em EN reaproveitando as
    // imagens. Erro no EN não derruba o BR, que já está no ar.
    let englishUrl = null, englishError = null;
    try {
      const enRes = await publishToEnglish(post, post.video_path);
      englishUrl = enRes.url;
      updatePost(post.id, { english_url: englishUrl });
    } catch (e) {
      englishError = e.message;
      updatePost(post.id, { english_error: englishError });
    }

    res.json({ ok: true, youtube: up, englishUrl, englishError });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Estatísticas reais (cache + refresh)
app.get('/api/stats', async (req, res) => {
  if (!isYouTubeConnected()) return res.json({ connected: false, cache: readCache() });
  try {
    const refresh = req.query.refresh === '1';
    const data = refresh ? await getFullStats() : (readCache() || await getFullStats());
    res.json({ connected: true, ...data });
  } catch (e) { res.json({ connected: true, error: e.message, cache: readCache() }); }
});

// Pesquisa: manchetes que o bot está lendo (Google News + blog)
app.get('/api/research', async (req, res) => {
  try { res.json({ items: await fetchTrendingFromRSS() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Gera + publica um Short de um tema ESPECÍFICO (botões da aba Pesquisa)
app.post('/api/generate-from-topic', (req, res) => {
  if (busy) return res.status(409).json({ error: 'Já existe uma geração em andamento. Espere terminar.' });
  const { title, source, link, privacyStatus, format } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Tema não informado.' });
  busy = true;
  runDailyPost({ forcedTopic: { title, source, link, format: format || 'noticia_tech' }, privacyStatus: privacyStatus || 'public' })
    .then(() => { busy = false; })
    .catch(e => { busy = false; console.error('[dashboard] generate-from-topic:', e.message); });
  res.json({ ok: true, started: true, topic: title });
});

// Análise de temas: o que rende mais views, o que está repetido, sugestões
app.get('/api/topic-analysis', (req, res) => {
  try {
    res.json(analyzeTopics(readCache(), getInMemoryPosts(), getRecentTopics()));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Metas do canal (data/goals.json) ─────────────────────────────────────────
const GOALS_FILE = path.join(DATA_DIR, 'goals.json');
const DEFAULT_GOALS = { subscribers: 100, views: 10000, videos_per_week: 21 };
function loadGoals() { try { return { ...DEFAULT_GOALS, ...JSON.parse(fs.readFileSync(GOALS_FILE, 'utf8')) }; } catch { return { ...DEFAULT_GOALS }; } }

app.get('/api/goals', (req, res) => {
  const goals = loadGoals();
  const cache = readCache() || {};
  const ch = cache.channel || {};
  const weekAgo = Date.now() - 7 * 864e5;
  const postedThisWeek = getInMemoryPosts().filter(p => p.status === 'posted' && new Date(p.posted_at || p.created_at || 0).getTime() > weekAgo).length;
  res.json({
    goals,
    current: { subscribers: ch.subscribers || 0, views: ch.views || 0, videos_per_week: postedThisWeek },
    analytics: cache.analytics || null,
  });
});
app.post('/api/goals', (req, res) => {
  try {
    const { subscribers, views, videos_per_week } = req.body || {};
    const goals = loadGoals();
    if (subscribers > 0) goals.subscribers = Number(subscribers);
    if (views > 0) goals.views = Number(views);
    if (videos_per_week > 0) goals.videos_per_week = Number(videos_per_week);
    fs.writeFileSync(GOALS_FILE, JSON.stringify(goals, null, 2));
    res.json({ ok: true, goals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Agendamentos
app.get('/api/schedule', (req, res) => res.json(loadSchedule()));
app.post('/api/schedule', (req, res) => {
  const { when, format, privacyStatus } = req.body || {};
  if (!when) return res.status(400).json({ error: 'Informe data/hora (when).' });
  const arr = loadSchedule();
  const item = { id: Date.now().toString(), when: new Date(when).toISOString(), format: format || null, privacyStatus: privacyStatus || null, status: 'pending', created_at: new Date().toISOString() };
  arr.push(item); saveSchedule(arr);
  res.json({ ok: true, item });
});
app.delete('/api/schedule/:id', (req, res) => {
  const arr = loadSchedule().filter(s => s.id !== req.params.id);
  saveSchedule(arr); res.json({ ok: true });
});

// ── Configuração / conexão de conta (OAuth YouTube) ─────────────────────────
const ENV_FILE = path.join(ROOT, '.env');
const OAUTH_REDIRECT = `http://localhost:${PORT}/oauth/callback`;

function updateEnv(updates) {
  let lines = [];
  try { lines = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/); } catch {}
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined || v === null) continue;
    process.env[k] = String(v); // aplica já no processo (sem precisar reiniciar)
    const line = `${k}=${v}`;
    const i = lines.findIndex(l => l.startsWith(k + '='));
    if (i >= 0) lines[i] = line; else lines.push(line);
  }
  fs.writeFileSync(ENV_FILE, lines.join('\n'));
}

// Status da config (NUNCA devolve os segredos — só se estão preenchidos)
app.get('/api/config', (req, res) => {
  res.json({
    has_client_id: !!process.env.YT_CLIENT_ID,
    has_client_secret: !!process.env.YT_CLIENT_SECRET,
    privacy: process.env.YT_PRIVACY || 'unlisted',
    blog_url: process.env.BLOG_URL || '',
    category_id: process.env.YT_CATEGORY_ID || '28',
    youtube_connected: isYouTubeConnected(),
    redirect_uri: OAUTH_REDIRECT,
  });
});

// Salva credenciais/preferências no .env
app.post('/api/config', (req, res) => {
  try {
    const { clientId, clientSecret, privacy, blogUrl, categoryId } = req.body || {};
    const updates = {};
    if (clientId) updates.YT_CLIENT_ID = clientId.trim();
    if (clientSecret) updates.YT_CLIENT_SECRET = clientSecret.trim();
    if (privacy) updates.YT_PRIVACY = privacy;
    if (blogUrl) updates.BLOG_URL = blogUrl.trim();
    if (categoryId) updates.YT_CATEGORY_ID = String(categoryId).trim();
    updateEnv(updates);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Gera a URL de consentimento do Google
app.get('/api/youtube/connect', (req, res) => {
  try {
    if (!process.env.YT_CLIENT_ID || !process.env.YT_CLIENT_SECRET) {
      return res.status(400).json({ error: 'Salve o Client ID e o Client Secret primeiro.' });
    }
    const oauth2 = getOAuthClient(OAUTH_REDIRECT);
    const url = oauth2.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
    res.json({ url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Histórico unificado BR + EN ──────────────────────────────────────────────
// O canal EN usa um arquivo de tokens separado (.yt-en-tokens.json) — cria um
// client OAuth próprio aqui, sem mexer no singleton de youtube-auth.js (que
// fica fixo no canal BR pra esse processo).
function getEnAuthorizedClient() {
  const enPath = path.join(ROOT, '.yt-en-tokens.json');
  if (!fs.existsSync(enPath)) return null;
  let tokens;
  try { tokens = JSON.parse(fs.readFileSync(enPath, 'utf8')); } catch { return null; }
  if (!tokens.refresh_token) return null;
  const client = getOAuthClient();
  client.setCredentials(tokens);
  return client;
}

async function fetchChannelHistory(auth, limit = 40) {
  const yt = google.youtube({ version: 'v3', auth });
  const ch = await yt.channels.list({ part: ['contentDetails'], mine: true });
  const uploads = ch.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];
  const ids = [];
  let pageToken;
  do {
    const pl = await yt.playlistItems.list({ part: ['contentDetails'], playlistId: uploads, maxResults: 50, pageToken });
    ids.push(...pl.data.items.map(i => i.contentDetails.videoId));
    pageToken = pl.data.nextPageToken;
  } while (pageToken && ids.length < limit);
  const finalIds = ids.slice(0, limit);
  const items = [];
  for (let i = 0; i < finalIds.length; i += 50) {
    const r = await yt.videos.list({ part: ['snippet', 'status', 'statistics'], id: finalIds.slice(i, i + 50) });
    items.push(...r.data.items);
  }
  return items.map(v => ({
    id: v.id,
    title: v.snippet.title,
    thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || '',
    privacyStatus: v.status.privacyStatus,
    publishAt: v.status.publishAt || null,
    publishedAt: v.snippet.publishedAt,
    views: v.statistics?.viewCount || '0',
  })).sort((a, b) => {
    const ta = new Date(a.publishAt || a.publishedAt).getTime();
    const tb = new Date(b.publishAt || b.publishedAt).getTime();
    return tb - ta;
  });
}

app.get('/api/history', async (req, res) => {
  const out = { br: [], en: [], brError: null, enError: null };
  try {
    if (isYouTubeConnected()) {
      try { out.br = await fetchChannelHistory(await getAuthorizedClient()); }
      catch (e) { out.brError = e?.errors?.[0]?.message || e.message; }
    } else out.brError = 'Canal BR não conectado.';

    const enAuth = getEnAuthorizedClient();
    if (enAuth) {
      try { out.en = await fetchChannelHistory(enAuth); }
      catch (e) { out.enError = e?.errors?.[0]?.message || e.message; }
    } else out.enError = 'Canal EN não conectado (.yt-en-tokens.json ausente).';

    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Verificação REAL da conexão: chama a API do YouTube de verdade (não só
// confere se existe arquivo de token — token pode existir e estar revogado/expirado).
app.get('/api/youtube/verify', async (req, res) => {
  if (!isYouTubeConnected()) return res.json({ connected: false, reason: 'no_token' });
  try {
    const auth = await getAuthorizedClient();
    const yt = google.youtube({ version: 'v3', auth });
    const r = await yt.channels.list({ part: ['snippet'], mine: true });
    const ch = r.data.items && r.data.items[0];
    if (!ch) return res.json({ connected: false, reason: 'no_channel' });
    res.json({ connected: true, channelTitle: ch.snippet.title, channelId: ch.id });
  } catch (e) {
    res.json({ connected: false, reason: 'api_error', error: e?.errors?.[0]?.message || e.message });
  }
});

// Callback do Google → troca o code por tokens e salva o refresh_token
app.get('/oauth/callback', async (req, res) => {
  const page = (msg, ok) => res.send(`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;background:#080808;color:#e8e8e8;text-align:center;padding:60px"><h2 style="color:${ok ? '#00ff88' : '#ff4d4d'}">${msg}</h2><p>Pode fechar esta aba e voltar ao painel.</p></body>`);
  try {
    if (req.query.error) return page('Autorização negada: ' + req.query.error, false);
    const code = req.query.code;
    if (!code) return page('Sem código na resposta do Google.', false);
    const oauth2 = getOAuthClient(OAUTH_REDIRECT);
    const { tokens } = await oauth2.getToken(code);
    saveTokens(tokens);
    if (!tokens.refresh_token) {
      return page('Conectado, mas o Google não devolveu refresh_token. Revogue o acesso em myaccount.google.com/permissions e conecte de novo.', false);
    }
    page('YouTube conectado! ✅', true);
  } catch (e) { page('Erro ao conectar: ' + e.message, false); }
});

// ── Link-Booster API ─────────────────────────────────────────────────────────
app.get('/api/link-booster/metrics', (req, res) => {
  try {
    const f = path.join(DATA_DIR, 'link-metrics.json');
    const l = path.join(DATA_DIR, 'link-booster-log.json');
    if (!fs.existsSync(f)) return res.json({ snapshots: [], log: [] });
    const metrics = JSON.parse(fs.readFileSync(f, 'utf8'));
    const log     = fs.existsSync(l) ? JSON.parse(fs.readFileSync(l, 'utf8')) : [];
    // Calcula lift
    const snaps = metrics.snapshots || [];
    const firstLinkTime = log.find(e => e.action === 'description')?.timestamp;
    let lift = null;
    if (firstLinkTime && snaps.length >= 4) {
      const before = snaps.filter(s => s.timestamp < firstLinkTime);
      const after  = snaps.filter(s => s.timestamp >= firstLinkTime);
      const avgDelta = (arr) => {
        const d = [];
        for (let i = 1; i < arr.length; i++) {
          const dv = arr[i].views - arr[i - 1].views;
          const dt = (new Date(arr[i].timestamp) - new Date(arr[i - 1].timestamp)) / 3600000;
          if (dt > 0) d.push(dv / dt);
        }
        return d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
      };
      lift = { before: avgDelta(before), after: avgDelta(after) };
    }
    res.json({ ...metrics, log: log.slice(-50), lift });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/link-booster/config', (req, res) => {
  try {
    const f = path.join(DATA_DIR, 'link-booster-config.json');
    res.json(fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Dispara set-related-video.js manualmente pelo painel (sem headless = Chrome visível)
app.post('/api/link-booster/set-related', async (req, res) => {
  try {
    const { longId } = req.body || {};
    const args = [path.join(ROOT, 'set-related-video.js')];
    if (longId) args.push(`--long-id=${longId}`);
    // Mostra browser (usuário vê o que está acontecendo)
    const { spawn } = require('child_process');
    const child = spawn(process.execPath, args, {
      cwd: ROOT, detached: true, stdio: 'ignore',
    });
    child.unref();
    res.json({ ok: true, message: 'set-related-video.js iniciado — verifique o Chrome' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Agendamentos: motor movido p/ process-schedule.js (catch-up autônomo) ───────
// O relógio interno (setInterval) foi DESATIVADO pra não postar em dobro com o
// verificador autônomo. A fila (data/schedule.json) agora é processada por:
//   node process-schedule.js   → posta 1 vencido + reagenda o resto
// rodando pela tarefa "NeuralUpdate-YouTube-Catchup" (a cada 15 min) e na
// Inicialização do Windows (NeuralUpdate-YT-Catchup.vbs). Funciona com o painel fechado.

app.listen(PORT, () => {
  console.log(`\n🎬 Neural Update — YouTube Dashboard`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   YouTube: ${isYouTubeConnected() ? 'conectado' : 'NÃO conectado (node youtube-login.js)'}\n`);
});
