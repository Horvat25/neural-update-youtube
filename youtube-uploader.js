'use strict';
/**
 * youtube-uploader.js — publica o Short via YouTube Data API v3 (upload resumável).
 * Sem navegador. Usa OAuth2 (refresh_token) do youtube-auth.
 */
require('dotenv').config();
const fs = require('fs');
const { google, getAuthorizedClient, isConnected } = require('./youtube-auth');

const BLOG_URL = process.env.BLOG_URL || 'https://neural-update.com.br';

// Descrição: garante o link do blog nas PRIMEIRAS linhas (clicável) + hashtags no fim.
function buildDescription({ description, hashtags, blogUrl = BLOG_URL }) {
  let desc = (description || '').trim();
  if (!desc.includes(blogUrl)) desc = `Análise completa: ${blogUrl}\n\n${desc}`;
  const tags = (hashtags || []).filter(h => typeof h === 'string' && h.startsWith('#'));
  const lower = desc.toLowerCase();
  const extra = tags.filter(h => !lower.includes(h.toLowerCase()));
  if (extra.length) desc += `\n\n${extra.slice(0, 15).join(' ')}`;
  return desc.slice(0, 4900); // limite do YouTube é 5000
}

// Título: garante #Shorts (ajuda a detecção como Short) sem estourar 100 chars.
function buildTitle(title, hashtags) {
  let t = (title || 'Neural Update').trim();
  const hasShorts = /#shorts/i.test(t) || (hashtags || []).some(h => /#shorts/i.test(h));
  if (hasShorts && !/#shorts/i.test(t) && t.length + 8 <= 100) t += ' #Shorts';
  return t.slice(0, 100);
}

async function uploadToYouTube({ videoPath, title, description, tags, hashtags, privacyStatus } = {}) {
  if (!videoPath || !fs.existsSync(videoPath)) throw new Error('Vídeo não encontrado: ' + videoPath);

  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const privacy = privacyStatus || process.env.YT_PRIVACY || 'unlisted';

  const requestBody = {
    snippet: {
      title: buildTitle(title, hashtags),
      description: buildDescription({ description, hashtags }),
      tags: (tags || []).filter(Boolean).slice(0, 30),
      categoryId: process.env.YT_CATEGORY_ID || '28', // 28 = Ciência & Tecnologia
      defaultLanguage: 'pt-BR',
      defaultAudioLanguage: 'pt-BR',
    },
    status: {
      privacyStatus: privacy,        // 'public' | 'unlisted' | 'private'
      selfDeclaredMadeForKids: false,
    },
  };

  try {
    const res = await youtube.videos.insert(
      { part: ['snippet', 'status'], requestBody, media: { body: fs.createReadStream(videoPath) } },
      { maxContentLength: Infinity, maxBodyLength: Infinity } // upload resumável de arquivo grande
    );
    const id = res.data.id;
    const url = `https://youtube.com/shorts/${id}`;
    console.log(`[youtube] ✓ publicado (${privacy}): ${url}`);
    return { id, url, privacyStatus: privacy };
  } catch (e) {
    const reason =
      e?.errors?.[0]?.reason ||
      e?.response?.data?.error?.errors?.[0]?.reason ||
      e?.response?.data?.error?.message;
    if (reason === 'quotaExceeded' || reason === 'uploadLimitExceeded') {
      throw new Error('[youtube] Quota estourada: videos.insert custa ~1600 unidades; limite padrão 10.000/dia (~6 uploads). Tente depois.');
    }
    if (/invalid_grant|No refresh token|invalid_request/i.test(reason || e.message || '')) {
      throw new Error('[youtube] Token inválido/expirado. Rode de novo: node youtube-login.js');
    }
    throw new Error('[youtube] Falha no upload: ' + (reason || e.message));
  }
}

module.exports = { uploadToYouTube, isConnected, buildDescription, buildTitle };
