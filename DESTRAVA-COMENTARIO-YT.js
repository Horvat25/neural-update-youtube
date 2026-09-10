'use strict';
/**
 * DESTRAVA-COMENTARIO-YT.js — um comando só pra ligar o comentário automático no YouTube.
 *
 * Faz, em ordem:
 *   1. guarda um backup do token atual (se der errado, é só restaurar)
 *   2. abre a tela do Google pra você clicar em "Permitir"
 *   3. confere se o escopo de comentário entrou de verdade
 *   4. põe o refresh_token novo no seu clipboard (o valor NÃO aparece na tela)
 *   5. abre a página de secrets do GitHub pra você colar
 *
 *   node DESTRAVA-COMENTARIO-YT.js
 *
 * ⚠️ Se qualquer coisa falhar no meio, o backup fica em .yt-tokens.BACKUP-*.json —
 * copiar por cima de .yt-tokens.json devolve tudo ao estado anterior.
 */
const { execFileSync, spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const AQUI = __dirname;
const TOK = path.join(AQUI, '.yt-tokens.json');
const ESCOPO = 'https://www.googleapis.com/auth/youtube.force-ssl';
const SECRETS = 'https://github.com/Horvat25/gram-text-wizard/settings/secrets/actions';

const linha = (t) => console.log('\n' + t);

// ── 1. backup ─────────────────────────────────────────────────────────────────
const carimbo = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const bkp = path.join(AQUI, `.yt-tokens.BACKUP-${carimbo}.json`);
if (fs.existsSync(TOK) && !fs.existsSync(bkp)) fs.copyFileSync(TOK, bkp);
linha(`✓ backup do token atual: ${path.basename(bkp)}`);

// já tem o escopo? então não precisa relogar.
try {
  const atual = JSON.parse(fs.readFileSync(TOK, 'utf8'));
  if ((atual.scope || '').includes('youtube.force-ssl')) {
    linha('✓ o token JÁ tem o escopo de comentário — não precisa fazer login de novo.');
    linha('Só falta o refresh_token estar no GitHub. Copiando pro clipboard...');
    spawnSync('clip', { input: atual.refresh_token, shell: true });
    console.log('   ✓ no clipboard. Cole em YT_REFRESH_TOKEN aqui: ' + SECRETS);
    process.exit(0);
  }
} catch { /* sem token ainda, segue pro login */ }

// ── 2. login ──────────────────────────────────────────────────────────────────
linha('▶ Vou abrir a tela do Google. Clique em PERMITIR (vai pedir também a permissão de comentários).');
linha('   Se o navegador não abrir sozinho, copie a URL que aparecer abaixo.\n');

const r = spawnSync(process.execPath, [path.join(AQUI, 'youtube-login.js')], { stdio: 'inherit', timeout: 300000 });
if (r.status !== 0) {
  linha('✗ o login não completou. Nada foi perdido — o backup está em ' + path.basename(bkp));
  process.exit(1);
}

// ── 3. conferir o escopo ──────────────────────────────────────────────────────
const novo = JSON.parse(fs.readFileSync(TOK, 'utf8'));
if (!(novo.scope || '').includes('youtube.force-ssl')) {
  linha('✗ o token novo NÃO veio com o escopo de comentário.');
  console.log('   Provável causa: a tela do Google foi aprovada sem a caixa de comentários.');
  console.log('   Conserto: revogue em myaccount.google.com/permissions e rode este comando de novo.');
  console.log('   Pra voltar ao token anterior: copie ' + path.basename(bkp) + ' por cima de .yt-tokens.json');
  process.exit(1);
}
linha('✓ escopo de comentário confirmado no token novo.');

if (!novo.refresh_token) {
  linha('✗ veio sem refresh_token (o Google só manda no primeiro consentimento).');
  console.log('   Revogue em myaccount.google.com/permissions e rode de novo.');
  process.exit(1);
}

// ── 4. clipboard ──────────────────────────────────────────────────────────────
spawnSync('clip', { input: novo.refresh_token, shell: true });
linha(`✓ refresh_token novo está no seu CLIPBOARD (${novo.refresh_token.length} caracteres).`);
console.log('   O valor não aparece aqui de propósito.');

// ── 5. abrir o GitHub ─────────────────────────────────────────────────────────
try { spawn('cmd', ['/c', 'start', '', SECRETS], { detached: true, stdio: 'ignore' }).unref(); } catch {}
linha('▶ ÚLTIMO PASSO, na página que acabei de abrir:');
console.log('   1. clique no lápis do secret  YT_REFRESH_TOKEN');
console.log('   2. Ctrl+V no campo');
console.log('   3. Update secret');
linha('Depois disso me chame que eu ligo o robô no workflow e testo num vídeo de verdade.');
