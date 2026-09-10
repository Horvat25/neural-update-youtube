'use strict';
/**
 * set-titulo.js — troca o TÍTULO (e opcionalmente a descrição) de um vídeo já publicado.
 *
 *   node set-titulo.js <videoId> "Novo título"
 *   node set-titulo.js <videoId> "Novo título" --desc arquivo.txt
 *
 * POR QUE ISSO EXISTE: o YouTube reavalia o vídeo toda vez que título ou capa muda —
 * ele volta pra fila de teste de impressões. Num canal onde o gargalo do longo é CTR
 * (medido 12/ago: 2.161 impressões × 1,3%), reescrever título de vídeo vivo rende mais
 * hora assistida que gravar um novo, e custa zero crédito.
 *
 * ⚠️ videos.update SUBSTITUI o snippet inteiro. Se mandar só o título, o YouTube apaga
 * descrição, tags e categoria. Por isso aqui a gente LÊ o snippet atual e devolve ele
 * inteiro com o título trocado — foi o que quase apagou a descrição (e os links do funil)
 * do longo dos 10 lugares.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const { google, getAuthorizedClient } = require('./youtube-auth');

(async () => {
  const [id, titulo] = process.argv.slice(2);
  if (!id || !titulo) {
    console.error('uso: node set-titulo.js <videoId> "Novo título" [--desc arquivo.txt]');
    process.exit(1);
  }
  if (titulo.length > 100) { console.error(`título tem ${titulo.length} chars — o limite é 100`); process.exit(1); }

  const iDesc = process.argv.indexOf('--desc');
  const novaDesc = iDesc > -1 ? fs.readFileSync(process.argv[iDesc + 1], 'utf8') : null;

  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const r = await youtube.videos.list({ part: ['snippet'], id: [id] });
  const v = r.data.items?.[0];
  if (!v) { console.error('vídeo não encontrado:', id); process.exit(1); }

  const s = v.snippet;
  console.log(`antes : ${s.title}`);
  console.log(`depois: ${titulo}`);

  await youtube.videos.update({
    part: ['snippet'],
    requestBody: {
      id,
      snippet: {
        title: titulo,
        description: novaDesc != null ? novaDesc : s.description,
        tags: s.tags,
        categoryId: s.categoryId,
        defaultLanguage: s.defaultLanguage,
        defaultAudioLanguage: s.defaultAudioLanguage,
      },
    },
  });
  console.log(`✓ trocado → https://youtu.be/${id}`);
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
