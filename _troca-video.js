'use strict';
/**
 * _troca-video.js — sobe a versão corrigida de um vídeo já agendado e apaga a antiga.
 *
 * POR QUE: o YouTube não deixa trocar o arquivo de um vídeo publicado. Vídeo
 * errado no ar só se conserta subindo outro e apagando o velho — nessa ordem,
 * pra nunca ficar com o slot vazio se a quota estourar no meio.
 *
 *   node _troca-video.js <slug> <idAntigo> <publishAt>
 */
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { uploadToYouTube } = require('./youtube-uploader.js');

const [slug, idAntigo, publishAt] = process.argv.slice(2);
const dir = path.join(__dirname, 'exports', slug);
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const ESTADO = path.join(__dirname, 'data', 'sobe-lote.json');

(async () => {
  const r = await uploadToYouTube({
    videoPath: path.join(dir, `${slug}.mp4`),
    title: meta.title, description: meta.description, tags: meta.tags,
    hashtags: meta.hashtags, privacyStatus: 'private', publishAt,
  });
  const novo = r.videoId || r.id;
  console.log(`✓ novo: ${novo}`);

  const est = JSON.parse(fs.readFileSync(ESTADO, 'utf8'));
  est[slug] = { id: novo, url: r.url, quando: publishAt, em: new Date().toISOString(), substituiu: idAntigo };
  fs.writeFileSync(ESTADO, JSON.stringify(est, null, 2));

  // apaga a antiga só DEPOIS que a nova entrou
  const { getAuthorizedClient } = require('./youtube-auth.js');
  const yt = google.youtube({ version: 'v3', auth: await getAuthorizedClient() });
  await yt.videos.delete({ id: idAntigo });
  console.log(`✓ apagado: ${idAntigo}`);
})().catch(e => { console.error('ERRO:', e?.errors?.[0]?.reason || e.message); process.exit(1); });
