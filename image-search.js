'use strict';
/**
 * image-search.js — FALLBACK de imagens (só Pexels).
 *
 * O caminho PRINCIPAL de imagens é o neural-image-agent (porta 3030, via
 * image-client.js). Este arquivo só é usado quando o agente está offline.
 *
 * Versao enxuta do projeto de TikTok: removi o branch de screenshot via
 * Playwright (dependencia pesada, raramente usada). Mantem a mesma assinatura
 * `fetchImagesFromWeb(queries, count, destDir)` que o video-creator espera.
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function searchPexels(query, count = 3) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await axios.get('https://api.pexels.com/v1/search', {
      params: { query, per_page: 6, orientation: 'portrait', size: 'large' },
      headers: { Authorization: apiKey },
      timeout: 10000,
    });
    return (res.data?.photos || [])
      .filter(p => p.width >= 800)
      .slice(0, count)
      .map(p => ({ url: p.src.large2x || p.src.large, title: p.alt || query }));
  } catch { return []; }
}

async function downloadImageFromUrl(url, destPath) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.google.com/' },
    maxRedirects: 5,
  });
  fs.writeFileSync(destPath, res.data);
  return destPath;
}

function isValidImageFile(filePath) {
  try {
    if (fs.statSync(filePath).size < 15000) return false;
    const buf = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return (buf[0] === 0xFF && buf[1] === 0xD8) || (buf[0] === 0x89 && buf[1] === 0x50) || buf.toString('ascii', 0, 4) === 'RIFF';
  } catch { return false; }
}

/**
 * queries: array de strings (ou {text}) → busca no Pexels e baixa.
 * Retorna [{ url, localPath, query, title }]
 */
async function fetchImagesFromWeb(queries, count = 6, destDir) {
  const images = [];
  const normalized = (queries || []).map(q => (typeof q === 'string' ? { text: q } : q));

  for (const qObj of normalized) {
    if (images.length >= count) break;
    const query = qObj.text || qObj.query || '';
    if (!query) continue;
    try {
      console.log(`[pexels] "${query}"`);
      const results = await searchPexels(query, 3);
      for (const r of results) {
        const ext = r.url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
        const destPath = path.join(destDir, `img_${images.length}.${ext}`);
        try {
          await downloadImageFromUrl(r.url, destPath);
          if (!isValidImageFile(destPath)) { fs.unlinkSync(destPath); continue; }
          images.push({ url: r.url, localPath: destPath, query, title: r.title });
          console.log(`[pexels] ok ${path.basename(destPath)} (${Math.round(fs.statSync(destPath).size / 1024)}KB)`);
          break;
        } catch { try { fs.unlinkSync(destPath); } catch {} }
      }
    } catch (e) {
      console.warn(`[imgSearch] "${query}" falhou: ${e.message}`);
    }
  }

  console.log(`[imgSearch] ${images.length}/${count} imagens obtidas (fallback Pexels)`);
  return images;
}

module.exports = { fetchImagesFromWeb, downloadImageFromUrl };
