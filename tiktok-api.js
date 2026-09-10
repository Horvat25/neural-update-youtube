'use strict';
/**
 * tiktok-api.js — cliente da TikTok Content Posting API (oficial, gratuita).
 * Gerencia token (refresh automático) e sobe vídeo em 2 modos:
 *   - inbox  (scope video.upload)  → cai nos RASCUNHOS do app; você toca "Postar".
 *                                    Funciona SEM auditoria. Legenda você põe no app.
 *   - direct (scope video.publish) → publica direto (título/legenda via API).
 *                                    App SEM auditoria = privado (SELF_ONLY).
 *
 * Tokens em .tiktok-tokens.json (client_key/secret vêm do .env).
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const TOKENS_PATH = path.join(__dirname, '.tiktok-tokens.json');
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const OAUTH = 'https://open.tiktokapis.com/v2/oauth/token/';
const API = 'https://open.tiktokapis.com/v2/post/publish';

function loadTokens() {
  if (!fs.existsSync(TOKENS_PATH)) throw new Error('Sem .tiktok-tokens.json — rode `node tiktok-login.js` primeiro.');
  return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
}
function saveTokens(t) {
  t.saved_at = Date.now();
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(t, null, 2), 'utf8');
  return t;
}

// Access token válido (renova se faltar < 2 min).
async function getAccessToken() {
  let t = loadTokens();
  const ageOk = t.saved_at && (Date.now() - t.saved_at) / 1000 < (t.expires_in - 120);
  if (t.access_token && ageOk) return t.access_token;
  if (!t.refresh_token) throw new Error('Token expirado e sem refresh_token — rode `node tiktok-login.js`.');
  const body = new URLSearchParams({
    client_key: CLIENT_KEY, client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token', refresh_token: t.refresh_token,
  });
  const { data } = await axios.post(OAUTH, body.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (data.error) throw new Error('refresh falhou: ' + JSON.stringify(data));
  saveTokens({ ...t, ...data });
  return data.access_token;
}

async function initInbox(token, size) {
  const { data } = await axios.post(`${API}/inbox/video/init/`,
    { source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: size, total_chunk_count: 1 } },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' } });
  if (data.error && data.error.code !== 'ok') throw new Error('init inbox: ' + JSON.stringify(data.error));
  return data.data; // { publish_id, upload_url }
}

async function initDirect(token, size, caption) {
  // A API exige consultar o creator_info antes do direct post (e valida o privacy_level
  // contra as opções do criador — SELF_ONLY sempre existe em app não-auditado).
  let privacy = process.env.TIKTOK_PRIVACY || 'SELF_ONLY';
  try {
    const ci = await axios.post(`${API.replace('/post/publish', '/post/publish')}/creator_info/query/`, {},
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' } });
    const opts = ci.data?.data?.privacy_level_options || [];
    if (opts.length && !opts.includes(privacy)) privacy = opts.includes('SELF_ONLY') ? 'SELF_ONLY' : opts[0];
  } catch { /* consulta é best-effort; segue com o default */ }
  const { data } = await axios.post(`${API}/video/init/`, {
    post_info: { title: (caption || '').slice(0, 2190), privacy_level: privacy,
      disable_comment: false, disable_duet: false, disable_stitch: false },
    source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: size, total_chunk_count: 1 },
  }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' } });
  if (data.error && data.error.code !== 'ok') throw new Error('init direct: ' + JSON.stringify(data.error));
  return data.data;
}

async function uploadBytes(uploadUrl, videoPath, size) {
  const buf = fs.readFileSync(videoPath);
  await axios.put(uploadUrl, buf, {
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': size, 'Content-Range': `bytes 0-${size - 1}/${size}` },
    maxBodyLength: Infinity, maxContentLength: Infinity,
  });
}

async function fetchStatus(token, publishId) {
  const { data } = await axios.post(`${API}/status/fetch/`, { publish_id: publishId },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' } });
  return data.data; // { status, ... }
}

/**
 * Sobe 1 vídeo. mode: 'inbox' (default) ou 'direct'. Retorna { publish_id, status }.
 */
async function uploadVideo(videoPath, { mode = 'inbox', caption = '' } = {}) {
  const token = await getAccessToken();
  const size = fs.statSync(videoPath).size;
  const init = mode === 'direct' ? await initDirect(token, size, caption) : await initInbox(token, size);
  await uploadBytes(init.upload_url, videoPath, size);
  // status: inbox = SEND_TO_USER_INBOX (fica no rascunho); direct = PUBLISH_COMPLETE
  let last = null;
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 2500));
    const s = await fetchStatus(token, init.publish_id);
    last = s && s.status;
    if (['SEND_TO_USER_INBOX', 'PUBLISH_COMPLETE'].includes(last)) return { publish_id: init.publish_id, status: last };
    if (last === 'FAILED') throw new Error('publish FAILED: ' + JSON.stringify(s));
  }
  return { publish_id: init.publish_id, status: last || 'UNKNOWN' };
}

module.exports = { getAccessToken, uploadVideo, loadTokens, saveTokens, TOKENS_PATH, CLIENT_KEY, CLIENT_SECRET };
