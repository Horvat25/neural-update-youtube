'use strict';

/**
 * image-client.js — Cliente para o neural-image-agent
 *
 * Chama POST http://localhost:3030/video-images com o roteiro do vídeo,
 * baixa as imagens geradas localmente em exports/video-images/ e retorna
 * os paths locais para o pipeline de vídeo usar.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const AGENT_URL = process.env.IMAGE_AGENT_URL || 'http://localhost:3030';
const LOCAL_DIR = path.join(__dirname, 'exports', 'video-images');

// Garante que o diretório de saída existe
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Baixa uma imagem de uma URL e salva no caminho indicado.
 * @param {string} url - URL completa da imagem
 * @param {string} destPath - Caminho local de destino
 * @returns {Promise<string>} - O caminho salvo
 */
async function downloadImage(url, destPath) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'neural-update-youtube/1.0' },
  });
  fs.writeFileSync(destPath, res.data);
  return destPath;
}

/**
 * Gera imagens editoriais para um vídeo a partir do roteiro.
 *
 * @param {object} options
 * @param {string} options.script - Roteiro completo do vídeo
 * @param {number} [options.count=4] - Número de imagens desejadas (padrão: 4)
 * @param {string} [options.outputDir] - Diretório local de saída (padrão: exports/video-images/)
 *
 * @returns {Promise<{
 *   sessionId: string,
 *   topic: string,
 *   brand: string,
 *   brandColor: string,
 *   news: object|null,
 *   images: Array<{
 *     scene: number,
 *     sceneId: string,
 *     localPath: string,
 *     url: string,
 *     paragraph: string,
 *     brand: string,
 *     brandColor: string,
 *     icons: string[]
 *   }>
 * }>}
 */
async function getVideoImages({ script, count = 4, outputDir, sceneQueries = null }) {
  if (!script || !script.trim()) {
    throw new Error('[image-client] script é obrigatório');
  }

  const destDir = outputDir || LOCAL_DIR;
  ensureDir(destDir);

  console.log('[image-client] Chamando neural-image-agent...' + (sceneQueries ? ` (${sceneQueries.length} queries do roteiro)` : ''));

  let apiResponse;
  try {
    const res = await axios.post(
      `${AGENT_URL}/scene-images`,
      // sceneQueries = "o que o agente tiktok quer ver" por cena (vindo da IA do roteiro).
      // O banco usa essas queries pra buscar+editar+cachear imagens relevantes.
      { script, count, source: 'youtube', captionZone: 'bottom', sceneQueries },
      { timeout: 180000 } // até 3 min — bg-removal + composição podem ser lentos
    );
    apiResponse = res.data;
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
      throw new Error(
        `[image-client] neural-image-agent offline em ${AGENT_URL}. ` +
        'Inicie o servidor com: node src/index.js (no projeto neural-image-agent)'
      );
    }
    if (e.code === 'ECONNABORTED' || (e.message && e.message.includes('timeout'))) {
      throw new Error('[image-client] neural-image-agent demorou demais (timeout 3min)');
    }
    throw new Error(`[image-client] Erro na chamada HTTP: ${e.message}`);
  }

  if (!apiResponse || !Array.isArray(apiResponse.images) || apiResponse.images.length === 0) {
    throw new Error('[image-client] Resposta inesperada da API: sem imagens');
  }

  console.log(
    `[image-client] ${apiResponse.images.length} imagens recebidas` +
    ` | sessão: ${apiResponse.sessionId} | marca: ${apiResponse.brand}`
  );

  // Baixa cada imagem localmente
  const sessionDir = path.join(destDir, apiResponse.sessionId);
  ensureDir(sessionDir);

  const images = [];

  for (const img of apiResponse.images) {
    // A URL da API é relativa: /exports/previews/story_xxx_hook.jpg
    const fullUrl = img.url.startsWith('http') ? img.url : `${AGENT_URL}${img.url}`;
    const ext = path.extname(img.url) || '.jpg';
    const tag = img.sceneId || img.type || 'cena';
    const filename = `scene_${String(img.scene).padStart(2, '0')}_${tag}${ext}`;
    const localPath = path.join(sessionDir, filename);

    try {
      await downloadImage(fullUrl, localPath);
      const sizeKb = Math.round(fs.statSync(localPath).size / 1024);
      console.log(`[image-client]   Cena ${img.scene} (${img.sceneId}) → ${filename} (${sizeKb}KB)`);

      images.push({
        scene: img.scene,
        sceneId: img.sceneId || img.type || `cena${img.scene}`,
        type: img.type || null,
        localPath,
        url: fullUrl,
        paragraph: img.paragraph || '',
        brand: img.brand || img.label || apiResponse.brand || 'Neural',
        brandColor: img.brandColor || apiResponse.brandColor || '#33bbff',
        icons: img.icons || [],
      });
    } catch (e) {
      console.error(`[image-client]   Cena ${img.scene} falhou ao baixar: ${e.message}`);
    }
  }

  if (images.length === 0) {
    throw new Error('[image-client] Nenhuma imagem foi baixada com sucesso');
  }

  console.log(`[image-client] ${images.length}/${apiResponse.images.length} imagens salvas em: ${sessionDir}`);

  return {
    sessionId: apiResponse.sessionId,
    topic: apiResponse.topic,
    brand: apiResponse.brand,
    brandColor: apiResponse.brandColor,
    news: apiResponse.news || null,
    images,
    dir: sessionDir,
  };
}

module.exports = { getVideoImages };
