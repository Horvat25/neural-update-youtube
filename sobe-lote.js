'use strict';
/**
 * sobe-lote.js — sobe os vídeos de um lote do `lote-spec.js`, agendados pelo
 * publishAt do próprio spec.
 *
 * Existe porque o `upload-next.js` guarda estado em `data/uploaded-grade.json` e,
 * quando um vídeo é REFEITO, ele acha que já subiu e pula. Aqui o estado fica em
 * `data/sobe-lote.json`, por lote, e pode ser resetado sem mexer na rotina diária.
 *
 * Para sozinho quando a quota do YouTube acaba (≈6 uploads/dia, reseta ~4-5h BRT)
 * e retoma de onde parou na próxima execução.
 *
 *   node sobe-lote.js lotes/14-16-ago.json lotes/17-20-ago.json
 *   node sobe-lote.js <lote.json> --pular slug1,slug2
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { uploadToYouTube } = require('./youtube-uploader');

const ESTADO = path.join(__dirname, 'data', 'sobe-lote.json');
const iP = process.argv.indexOf('--pular');
const pular = new Set(iP > -1 ? (process.argv[iP + 1] || '').split(',').filter(Boolean) : []);
// o valor do --pular também vem em argv; tirar ele da lista de arquivos
const arquivos = process.argv.slice(2)
  .filter((a, i) => !a.startsWith('--') && (iP === -1 || process.argv.indexOf(a) !== iP + 1));

const feitos = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, 'utf8')) : {};
const itens = arquivos.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')))
  .sort((a, b) => new Date(a.publishAt) - new Date(b.publishAt));

(async () => {
  let subiu = 0, restam = 0;
  for (const it of itens) {
    if (feitos[it.slug] || pular.has(it.slug)) continue;
    const mp4 = path.join(__dirname, 'exports', it.slug, `${it.slug}.mp4`);
    const metaPath = path.join(__dirname, 'exports', it.slug, 'meta.json');
    if (!fs.existsSync(mp4) || !fs.existsSync(metaPath)) { console.error(`✗ ${it.slug} — falta mp4 ou meta`); continue; }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    try {
      // ⚠️ o uploadToYouTube recebe UM objeto só (videoPath junto), não (caminho, meta).
      const r = await uploadToYouTube({
        videoPath: mp4,
        title: meta.title, description: meta.description, tags: meta.tags,
        hashtags: meta.hashtags, privacyStatus: 'private', publishAt: it.publishAt,
      });
      feitos[it.slug] = { id: r.videoId || r.id, url: r.url, quando: it.publishAt, em: new Date().toISOString() };
      fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
      fs.writeFileSync(ESTADO, JSON.stringify(feitos, null, 2));
      subiu++;
      console.log(`✓ ${it.slug} → ${it.publishAt.slice(0, 16)}  ${feitos[it.slug].url || feitos[it.slug].id}`);
    } catch (e) {
      const msg = e?.errors?.[0]?.reason || e.message || '';
      if (/quota|uploadLimitExceeded/i.test(msg)) {
        restam = itens.filter(x => !feitos[x.slug] && !pular.has(x.slug)).length;
        console.log(`\n⛔ quota acabou depois de ${subiu} upload(s). Faltam ${restam}.`);
        console.log('Rode de novo amanhã após ~5h BRT — ele continua de onde parou.');
        return;
      }
      console.error(`✗ ${it.slug}: ${msg}`);
    }
  }
  restam = itens.filter(x => !feitos[x.slug] && !pular.has(x.slug)).length;
  console.log(`\n${subiu} subiram nesta rodada · ${restam} restantes`);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
