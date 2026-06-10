'use strict';
/**
 * youtube-auth.js — helper OAuth2 compartilhado (uploader + stats).
 * Lê client id/secret do .env e o refresh_token de .yt-tokens.json.
 */
require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKENS_PATH = path.join(__dirname, '.yt-tokens.json');

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

function getOAuthClient(redirectUri) {
  const { YT_CLIENT_ID, YT_CLIENT_SECRET } = process.env;
  if (!YT_CLIENT_ID || !YT_CLIENT_SECRET) {
    throw new Error('YT_CLIENT_ID / YT_CLIENT_SECRET ausentes no .env (crie no Google Cloud — OAuth Client tipo Desktop).');
  }
  return new google.auth.OAuth2(YT_CLIENT_ID, YT_CLIENT_SECRET, redirectUri || 'http://localhost');
}

function loadTokens() {
  try { return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8')); } catch { return null; }
}

function saveTokens(tokens) {
  // mescla com o que já existe (refresh_token às vezes só vem 1x)
  const prev = loadTokens() || {};
  const merged = { ...prev, ...tokens };
  if (!merged.refresh_token && prev.refresh_token) merged.refresh_token = prev.refresh_token;
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(merged, null, 2));
  return merged;
}

function isConnected() {
  const t = loadTokens();
  return !!(t && t.refresh_token);
}

async function getAuthorizedClient() {
  const oauth2 = getOAuthClient();
  const tokens = loadTokens();
  if (!tokens || !tokens.refresh_token) {
    throw new Error('YouTube não conectado (sem refresh_token). Rode: node youtube-login.js');
  }
  oauth2.setCredentials(tokens);
  // persiste automaticamente novos access tokens quando o SDK renova
  oauth2.on('tokens', (t) => { try { saveTokens(t); } catch {} });
  return oauth2;
}

module.exports = {
  google, getOAuthClient, getAuthorizedClient,
  loadTokens, saveTokens, isConnected, SCOPES, TOKENS_PATH,
};
