'use strict';
/**
 * fix-unlisted.js — Muda os 13 vídeos "unlisted" para "public" via YouTube API.
 * Roda: node fix-unlisted.js
 * PRÉ-REQUISITO: rode "node youtube-login.js" antes se ainda não fez.
 */
require('dotenv').config();
const { google } = require('googleapis');
const { getAuthorizedClient } = require('./youtube-auth');

const UNLISTED_IDS = [
  'qltdgallkuw',
  'kxD1rvj7Ejg',
  'lAdD_ZbgCao',
  '_ekCUV90D0w',
  'viv7m5b1a-w',
  'KUO_4o1RPY0',
  'j1nPy6i1Jb8',
  'xyvvn9aIyhU',
  'XL_yQSshZbY',
  'iPmEZ9u1h7s',
  'nJmSnayyyj4',
  'yptW6-cUhQA',
  'VgRKjkdRc5o',
];

async function main() {
  console.log('\n=== Fix Unlisted → Public ===');
  console.log(`Total de vídeos: ${UNLISTED_IDS.length}\n`);

  let auth;
  try {
    auth = await getAuthorizedClient();
  } catch (e) {
    console.error('[fix] Erro de autenticação:', e.message);
    console.error('[fix] Rode: node youtube-login.js');
    process.exit(1);
  }

  const yt = google.youtube({ version: 'v3', auth });

  let ok = 0;
  let fail = 0;

  for (const videoId of UNLISTED_IDS) {
    try {
      const res = await yt.videos.update({
        part: ['status'],
        requestBody: {
          id: videoId,
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
        },
      });
      const status = res.data?.status?.privacyStatus || '?';
      console.log(`✓ ${videoId} → ${status}`);
      ok++;
    } catch (e) {
      const msg = e?.errors?.[0]?.message || e.message;
      console.error(`✗ ${videoId} → ERRO: ${msg}`);
      fail++;
      // Se for erro de permissão, aborta tudo — token errado
      if (e.code === 403 || (msg && msg.toLowerCase().includes('insufficient'))) {
        console.error('\n[fix] ERRO DE PERMISSÃO — o token não tem escopo completo.');
        console.error('[fix] Solução: rode "node youtube-login.js" para re-autenticar e tente de novo.');
        process.exit(1);
      }
    }
    // Pausa mínima para não bater no rate limit (YouTube API: 10k units/dia)
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n=== Resultado: ${ok} OK, ${fail} erro(s) ===`);
  if (ok > 0) {
    console.log('Os vídeos agora estão públicos e visíveis para o algoritmo do YouTube.');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
