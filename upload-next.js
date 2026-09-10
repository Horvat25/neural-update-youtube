'use strict';
/**
 * upload-next.js [N] — sobe os próximos N vídeos da grade (default 6) na ORDEM de publicação.
 *
 * - Considera só pastas com <slug>.mp4 + meta.json cujo publishAt é FUTURO (não mexe em vídeo antigo/público).
 * - Pula os que já subiram (data/uploaded-grade.json).
 * - Agenda via publishAt (private + publica sozinho na hora).
 * - Adiciona saga na playlist PLXT2cY1ZSjkM e aulas na PLQlXGsP6ERAs.
 * - Para sozinho se a quota do YouTube acabar (e diz quantos subiu).
 *
 * ROTINA: rode 1x/dia de manhã (quota reseta ~4-5h BRT). Ex.: `node upload-next.js` (6/dia).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { uploadToYouTube } = require('./youtube-uploader');
const { google, getAuthorizedClient } = require('./youtube-auth');

const LIST_ONLY = process.argv[2] === 'list';
const N = parseInt(process.argv[2] || '6', 10) || 6;
const BASE = path.join(__dirname, 'exports');
const STATE = path.join(__dirname, 'data', 'uploaded-grade.json');
const SAGA_PL = 'PLXT2cY1ZSjkM';   // 🔢 O Universo em Números
const ESCOLA_PL = 'PLQlXGsP6ERAs'; // 🎓 Universo do Zero

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const saveState = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 2), 'utf8');

const now = Date.now();
const candidates = fs.readdirSync(BASE).filter(d => {
  if (state[d]) return false;
  const mp4 = path.join(BASE, d, `${d}.mp4`);
  const metaP = path.join(BASE, d, 'meta.json');
  if (!fs.existsSync(mp4) || !fs.existsSync(metaP)) return false;
  let m; try { m = JSON.parse(fs.readFileSync(metaP, 'utf8')); } catch { return false; }
  return m.publishAt && new Date(m.publishAt).getTime() > now; // só futuros
}).map(d => {
  const m = JSON.parse(fs.readFileSync(path.join(BASE, d, 'meta.json'), 'utf8'));
  return { slug: d, meta: m, when: new Date(m.publishAt).getTime() };
}).sort((a, b) => a.when - b.when);

if (LIST_ONLY) {
  console.log(`\n=== FILA DE UPLOAD (${candidates.length} pendentes, ordem de publicação) ===`);
  candidates.forEach((c, i) => console.log(`${String(i + 1).padStart(2)}. ${c.meta.publishAt.slice(0, 10)} ${c.meta.publishAt.slice(11, 16)}Z | ${c.slug}`));
  console.log(`\n(rode "node upload-next.js" pra subir os próximos 6)`);
  process.exit(0);
}

(async () => {
  console.log(`\n=== upload-next: ${candidates.length} na fila, subindo até ${N} ===`);
  if (!candidates.length) { console.log('Nada pendente. Tudo já subiu. 🎉'); return; }

  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const addToPlaylist = async (videoId, playlistId) => {
    try {
      await yt.playlistItems.insert({ part: ['snippet'], requestBody: { snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } } });
      console.log(`   ↳ playlist ${playlistId} ok`);
    } catch (e) { console.log(`   ↳ playlist falhou (segue): ${e?.errors?.[0]?.message || e.message}`); }
  };

  let done = 0;
  for (const c of candidates.slice(0, N)) {
    const videoPath = path.join(BASE, c.slug, `${c.slug}.mp4`);
    const dia = c.meta.publishAt.slice(0, 10);
    try {
      console.log(`\n[${done + 1}/${N}] ${c.slug} → ${dia}  "${c.meta.title.slice(0, 45)}"`);
      const r = await uploadToYouTube({ videoPath, ...c.meta, publishAt: c.meta.publishAt });
      state[c.slug] = { id: r.id, url: r.url, publishAt: c.meta.publishAt };
      saveState();
      done++;
      if (/^n\d/.test(c.slug)) await addToPlaylist(r.id, SAGA_PL);
      else if (/^(aula-|pl\d)/.test(c.slug)) await addToPlaylist(r.id, ESCOLA_PL);
      if (c.meta._pinnedComment) console.log(`   📌 fixar manualmente: ${c.meta._pinnedComment.slice(0, 60)}...`);
      console.log(`   ✓ ${r.url}`);
    } catch (e) {
      if (/quota|uploadLimit/i.test(e.message)) { console.log(`\n⛔ Quota do dia acabou (subiu ${done}). Rode de novo amanhã de manhã.`); break; }
      console.error(`   ✗ FALHA ${c.slug}: ${e.message} (segue pro próximo)`);
    }
  }

  const rest = candidates.length - done;
  console.log(`\n=== subiu ${done} hoje | faltam ${rest} ===`);
  if (rest > 0) {
    const prox = candidates.filter(c => !state[c.slug]).slice(0, 3).map(c => `${c.slug}(${c.meta.publishAt.slice(0,10)})`).join(', ');
    console.log(`Próximos: ${prox}\nRode "node upload-next.js" de novo amanhã (após ~5h BRT).`);
  } else {
    console.log('🎉 TUDO no ar! A grade publica sozinha agora, sem precisar de você.');
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
