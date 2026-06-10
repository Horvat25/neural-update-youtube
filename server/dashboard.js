'use strict';
/**
 * dashboard.js — painel web (Express) do agente YouTube. Porta 3001.
 * Abas: Início, Formatos, Agendar, Estatísticas, Pesquisa.
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const { runAutoAgent, runDailyPost, fetchTrendingFromRSS, getInMemoryPosts, updatePost } = require('../auto-agent');
const { uploadToYouTube, isConnected: isYouTubeConnected } = require('../youtube-uploader');
const { getOAuthClient, saveTokens, SCOPES } = require('../youtube-auth');
const { getFullStats, readCache } = require('../youtube-stats');
const { FORMATS } = require('../content-generator');

const ROOT = path.join(__dirname, '..');
const VIDEOS_DIR = path.join(ROOT, 'videos');
const DATA_DIR = path.join(ROOT, 'data');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedule.json');
[VIDEOS_DIR, DATA_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const PORT = process.env.DASHBOARD_PORT ? Number(process.env.DASHBOARD_PORT) : 3001;
const IMAGE_AGENT_URL = process.env.IMAGE_AGENT_URL || 'http://localhost:3030';

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
  let imageAgent = false;
  try { await axios.get(IMAGE_AGENT_URL + '/', { timeout: 2000 }); imageAgent = true; }
  catch (e) { imageAgent = !!(e.response && e.response.status); }
  res.json({
    youtube_connected: isYouTubeConnected(),
    image_agent_up: imageAgent,
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
    res.json({ ok: true, youtube: up });
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

// ── Agendamentos: motor movido p/ process-schedule.js (catch-up autônomo) ───────
// O relógio interno (setInterval) foi DESATIVADO pra não postar em dobro com o
// verificador autônomo. A fila (data/schedule.json) agora é processada por:
//   node process-schedule.js   → posta 1 vencido + reagenda o resto
// rodando pela tarefa "NeuralUpdate-YouTube-Catchup" (a cada 15 min) e na
// Inicialização do Windows (NeuralUpdate-YT-Catchup.vbs). Funciona com o painel fechado.

app.listen(PORT, () => {
  console.log(`\n🎬 Neural Update — YouTube Dashboard`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   YouTube: ${isYouTubeConnected() ? 'conectado' : 'NÃO conectado (node youtube-login.js)'}`);
  console.log(`   Banco de imagens esperado em: ${IMAGE_AGENT_URL}\n`);
});
