'use strict';
/**
 * post-long.js — publica/agenda um vídeo LONGO (16:9) + seta thumbnail custom.
 *   node post-long.js <video.mp4> <meta.json> <thumb.jpg> [publishAtISO]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { google, getAuthorizedClient } = require('./youtube-auth');

const videoPath = process.argv[2];
const metaPath = process.argv[3];
const thumbPath = process.argv[4];
const publishAt = process.argv[5] || null;
if (!videoPath || !metaPath) { console.error('uso: node post-long.js <video.mp4> <meta.json> <thumb.jpg> [publishAtISO]'); process.exit(1); }

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const BLOG_URL = process.env.BLOG_URL || 'https://neural-update.com.br';

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const privacy = publishAt ? 'private' : (meta.privacyStatus || 'public');

  let desc = (meta.description || '').trim();
  if (!desc.includes(BLOG_URL)) desc = `🔗 ${BLOG_URL}\n\n${desc}`;

  console.log(`[long] enviando "${meta.title}" (${publishAt ? 'AGENDADO ' + publishAt : privacy})...`);
  const res = await yt.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: meta.title.slice(0, 100),
        description: desc.slice(0, 4900),
        tags: (meta.tags || []).filter(Boolean).slice(0, 30),
        categoryId: '28',
        defaultLanguage: 'pt-BR',
        defaultAudioLanguage: 'pt-BR',
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
        ...(publishAt ? { publishAt } : {}),
      },
    },
    media: { body: fs.createReadStream(videoPath) },
  }, { maxContentLength: Infinity, maxBodyLength: Infinity });

  const id = res.data.id;
  console.log(`[long] ✓ vídeo no ar: https://youtube.com/watch?v=${id}`);

  if (thumbPath && fs.existsSync(thumbPath)) {
    try {
      await yt.thumbnails.set({ videoId: id, media: { body: fs.createReadStream(thumbPath) } });
      console.log(`[long] ✓ thumbnail custom setada`);
    } catch (e) {
      const reason = e?.errors?.[0]?.reason || e?.response?.data?.error?.message || e.message;
      console.warn(`[long] ⚠ thumbnail NÃO setada (${reason}). Pode exigir verificação do canal — dá pra setar manual no Studio.`);
    }
  }
  console.log(`\n[long] ${publishAt ? 'AGENDADO p/ ' + publishAt : 'PUBLICADO (' + privacy + ')'} — id ${id}`);
})().catch(e => { console.error('[long] ERRO:', e?.errors?.[0]?.reason || e.message); process.exit(1); });
