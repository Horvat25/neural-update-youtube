'use strict';
/**
 * tiktok-login.js — login OAuth one-time da TikTok (loopback + fallback manual).
 *   node tiktok-login.js
 * Precisa no .env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET e (opcional) TIKTOK_REDIRECT_URI.
 * Salva access_token + refresh_token em .tiktok-tokens.json.
 *
 * ⚠️ O redirect_uri PRECISA estar cadastrado igualzinho no app do TikTok for Developers
 * (Login Kit). TikTok costuma exigir HTTPS; se não aceitar http://localhost, use o
 * fallback manual: o script imprime a URL, você autoriza no navegador, é redirecionado,
 * e cola aqui a URL final (ou só o ?code=...) que aparece na barra.
 */
require('dotenv').config();
const http = require('http');
const readline = require('readline');
const { URL } = require('url');
const { exec } = require('child_process');
const axios = require('axios');
const { saveTokens, loadTokens, TOKENS_PATH, CLIENT_KEY, CLIENT_SECRET } = require('./tiktok-api');

const REDIRECT = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:5758/callback';
const SCOPE = process.env.TIKTOK_SCOPE || 'user.info.basic,video.upload'; // video.publish p/ direct post
const AUTH = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN = 'https://open.tiktokapis.com/v2/oauth/token/';

function authUrl(state) {
  const u = new URL(AUTH);
  u.searchParams.set('client_key', CLIENT_KEY);
  u.searchParams.set('scope', SCOPE);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', REDIRECT);
  u.searchParams.set('state', state);
  return u.toString();
}

async function exchange(code) {
  const body = new URLSearchParams({
    client_key: CLIENT_KEY, client_secret: CLIENT_SECRET, code,
    grant_type: 'authorization_code', redirect_uri: REDIRECT,
  });
  const { data } = await axios.post(TOKEN, body.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (data.error) throw new Error(JSON.stringify(data));
  saveTokens(data);
  console.log('\n[login] ✓ Conectado! open_id:', data.open_id, '| scopes:', data.scope);
  console.log('[login] tokens salvos em', TOKENS_PATH);
}

// Modos não-interativos (pro Claude dirigir pelo navegador):
//   node tiktok-login.js --url            → imprime só a URL de autorização (client_key é público)
//   node tiktok-login.js --code <code>    → troca o code por token e salva (sem readline)
(async function nonInteractive() {
  const argv = process.argv.slice(2);
  if (argv[0] === '--url') {
    if (!CLIENT_KEY) { console.error('FALTA TIKTOK_CLIENT_KEY no .env'); process.exit(1); }
    console.log(authUrl('nu' + Math.random().toString(36).slice(2, 8)));
    process.exit(0);
  }
  if (argv[0] === '--code') {
    if (!CLIENT_KEY || !CLIENT_SECRET) { console.error('FALTA TIKTOK_CLIENT_KEY/SECRET no .env'); process.exit(1); }
    let code = argv[1] || '';
    const m = code.match(/[?&]code=([^&]+)/); if (m) code = decodeURIComponent(m[1]);
    code = code.replace(/\*+$/, ''); // TikTok às vezes anexa "*" no fim do code
    try { await exchange(code); process.exit(0); }
    catch (e) { console.error('[login] erro:', e.message); process.exit(1); }
  }
})();

function main() {
  if (process.argv.slice(2)[0] === '--url' || process.argv.slice(2)[0] === '--code') return;
  if (!CLIENT_KEY || !CLIENT_SECRET) {
    console.error('[login] Faltam TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET no .env.');
    process.exit(1);
  }
  const state = Math.random().toString(36).slice(2);
  const url = authUrl(state);
  console.log('\n=== Login TikTok (Neural Update) ===');
  console.log('1) Autorize no navegador (abre sozinho). Se não, cole:\n\n' + url + '\n');

  // fallback manual sempre disponível
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('2) Após autorizar, cole aqui a URL de redirect (ou só o code) e Enter\n   (ou espere o loopback capturar): ', async (ans) => {
    try {
      let code = ans.trim();
      const m = code.match(/[?&]code=([^&]+)/);
      if (m) code = decodeURIComponent(m[1]);
      if (code) { await exchange(code); }
    } catch (e) { console.error('[login] erro:', e.message); }
    finally { rl.close(); try { server.close(); } catch {} process.exit(0); }
  });

  // loopback (se o TikTok aceitar redirect pra localhost)
  let server;
  try {
    const ru = new URL(REDIRECT);
    if (ru.hostname === 'localhost' || ru.hostname === '127.0.0.1') {
      server = http.createServer(async (req, res) => {
        const u = new URL(req.url, REDIRECT);
        const code = u.searchParams.get('code');
        if (!code) { res.end('aguardando...'); return; }
        try {
          await exchange(code);
          res.end('TikTok conectado! Pode fechar esta aba.');
        } catch (e) { res.end('erro: ' + e.message); }
        finally { setTimeout(() => { try { server.close(); } catch {} process.exit(0); }, 500); }
      });
      server.listen(Number(ru.port || 80), () => {});
      server.on('error', () => {}); // se porta ocupada, segue só com fallback manual
    }
  } catch {}

  const cmd = process.platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

main();
