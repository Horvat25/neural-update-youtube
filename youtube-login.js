'use strict';
/**
 * youtube-login.js — login OAuth one-time (loopback). Roda 1x.
 *   node youtube-login.js
 * Abre a URL de consentimento, recebe o `code` num servidor local (localhost),
 * troca por tokens e salva o refresh_token em .yt-tokens.json.
 */
require('dotenv').config();
const http = require('http');
const { URL } = require('url');
const { exec } = require('child_process');
const { getOAuthClient, saveTokens, SCOPES, TOKENS_PATH } = require('./youtube-auth');

const PORT = process.env.YT_OAUTH_PORT ? Number(process.env.YT_OAUTH_PORT) : 5757;
const redirectUri = `http://localhost:${PORT}`;

(function main() {
  let oauth2;
  try { oauth2 = getOAuthClient(redirectUri); }
  catch (e) { console.error('[login] ' + e.message); process.exit(1); }

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',   // pede refresh_token
    prompt: 'consent',        // força refresh_token mesmo em re-login
    scope: SCOPES,
  });

  const server = http.createServer(async (req, res) => {
    if (!req.url.startsWith('/?') && req.url !== '/') return res.end('ok');
    try {
      const u = new URL(req.url, redirectUri);
      const err = u.searchParams.get('error');
      if (err) { res.end('Erro do Google: ' + err); console.error('[login]', err); return finish(1); }
      const code = u.searchParams.get('code');
      if (!code) { res.end('Aguardando autorização...'); return; }

      const { tokens } = await oauth2.getToken(code);
      saveTokens(tokens);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2 style="font-family:sans-serif">Neural Update — YouTube conectado! ✅<br>Pode fechar esta aba.</h2>');
      console.log('\n[login] ✓ Tokens salvos em', TOKENS_PATH);
      if (!tokens.refresh_token) {
        console.warn('[login] AVISO: veio sem refresh_token. Revogue o acesso em myaccount.google.com/permissions e rode de novo.');
      } else {
        console.log('[login] refresh_token capturado — não precisa logar de novo.');
      }
      finish(0);
    } catch (e) {
      res.end('Erro: ' + e.message);
      console.error('[login]', e.message);
      finish(1);
    }
  });

  function finish(code) { setTimeout(() => { try { server.close(); } catch {} process.exit(code); }, 600); }

  server.listen(PORT, () => {
    console.log('\n=== Login YouTube (Neural Update) ===');
    console.log('Se o navegador não abrir sozinho, cole esta URL:\n\n' + authUrl + '\n');
    const cmd = process.platform === 'win32' ? `start "" "${authUrl}"`
      : process.platform === 'darwin' ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
    exec(cmd, () => {});
  });
  server.on('error', (e) => { console.error('[login] erro no servidor local:', e.message); process.exit(1); });
})();
