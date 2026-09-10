'use strict';
/**
 * set-thumb.js — troca a thumbnail de um vídeo JÁ publicado.
 *
 *   node set-thumb.js <videoId> <caminho-da-capa.jpg>
 *
 * Serve pra melhorar vídeo VELHO que ainda recebe impressão — que é o melhor
 * ROI do canal (ver memória `analises-obrigatorias-marcelo`): trocar a capa de
 * um vídeo com milhares de impressões vivas rende mais que gravar um novo.
 *
 * Depois de trocar: conferir o CTR no Studio (Analytics → Alcance) em algumas
 * horas. Abaixo de 4% = trocar de novo. A API NÃO devolve CTR.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const { google, getAuthorizedClient } = require('./youtube-auth');

(async () => {
  const [id, capa] = process.argv.slice(2);
  if (!id || !capa) { console.error('uso: node set-thumb.js <videoId> <capa.jpg>'); process.exit(1); }
  if (!fs.existsSync(capa)) { console.error('capa não encontrada:', capa); process.exit(1); }

  const mb = fs.statSync(capa).size / 1048576;
  if (mb > 2) { console.error(`capa tem ${mb.toFixed(1)}MB — o YouTube recusa acima de 2MB`); process.exit(1); }

  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const antes = await youtube.videos.list({ part: ['snippet'], id: [id] });
  const v = antes.data.items?.[0];
  if (!v) { console.error('vídeo não encontrado:', id); process.exit(1); }
  console.log(`[thumb] "${v.snippet.title}"`);

  await youtube.thumbnails.set({ videoId: id, media: { body: fs.createReadStream(capa) } });
  console.log(`[thumb] ✓ capa trocada (${mb.toFixed(2)}MB) → https://youtu.be/${id}`);
  console.log(`[thumb] confira o CTR no Studio em ~2h. Abaixo de 4% = trocar de novo.`);
})().catch(e => { console.error('[thumb] erro:', e.message); process.exit(1); });
