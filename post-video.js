'use strict';
/**
 * post-video.js — publica um MP4 no YouTube usando metadata de um sidecar JSON.
 *   node post-video.js <video.mp4> <meta.json>
 * meta.json: { title, description, tags[], hashtags[], privacyStatus }
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { uploadToYouTube } = require('./youtube-uploader');

const videoPath = process.argv[2];
const metaPath = process.argv[3];
if (!videoPath || !metaPath) { console.error('uso: node post-video.js <video.mp4> <meta.json>'); process.exit(1); }

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const publishAt = process.argv[4] || meta.publishAt || null; // ISO 8601 p/ AGENDAR (publica sozinho)

(async () => {
  const quando = publishAt ? `AGENDADO p/ ${publishAt}` : (meta.privacyStatus || 'unlisted');
  console.log(`[post] enviando "${meta.title}" (${quando})...`);
  const r = await uploadToYouTube({ videoPath, metaPath, ...meta, publishAt });
  console.log(`\n[post] ✓ ${publishAt ? 'AGENDADO' : 'PUBLICADO'}: ${r.url}`);
  console.log(`[post]   ${publishAt ? 'publica em ' + publishAt : 'privacidade: ' + r.privacyStatus}`);
})().catch(e => { console.error('[post] ERRO:', e.message); process.exit(1); });
