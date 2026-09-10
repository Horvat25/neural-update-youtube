'use strict';
/**
 * troca-trilha.js — troca no YouTube um vídeo já agendado pela versão remontada.
 *
 * Nasceu em 20/08/2026 de um erro meu: subi os 21 vídeos do lote 21-27/ago todos
 * com a MESMA trilha (`dark-some-amount-of-evil`), porque o `monta-lote-spec.js`
 * força uma trilha única e eu não variei o campo `track` do spec.
 *
 * O YouTube NÃO deixa trocar o arquivo de um vídeo já agendado. Então:
 *   1) sobe o NOVO no horário certo
 *   2) só então empurra o VELHO pra 2099 (limbo, pro Marcelo excluir depois)
 *
 * ⚠️ A ORDEM É LEI. Se empurrasse o velho primeiro e a quota estourasse no meio,
 * o horário ficaria VAZIO — buraco na grade que ninguém percebe até o dia passar.
 * Falhando nesta ordem, o pior caso é o horário manter o vídeo antigo.
 *
 *   node troca-trilha.js lotes/_trilha6.json [--secar]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { uploadToYouTube } = require('./youtube-uploader');
const { google, getAuthorizedClient } = require('./youtube-auth');

const LIMBO = '2099-01-01T00:00:00.000Z';
const SECAR = process.argv.includes('--secar');
const specFile = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!specFile) { console.error('uso: node troca-trilha.js <spec.json> [--secar]'); process.exit(1); }

const SOBE = path.join(__dirname, 'data', 'sobe-lote.json');
const ESTADO = path.join(__dirname, 'data', 'troca-trilha.json');
const subidos = JSON.parse(fs.readFileSync(SOBE, 'utf8'));
const feitos = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, 'utf8')) : {};
const itens = JSON.parse(fs.readFileSync(specFile, 'utf8'))
  .sort((a, b) => new Date(a.publishAt) - new Date(b.publishAt));

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });

  for (const it of itens) {
    if (feitos[it.slug]) { console.log(`· ${it.slug} — já trocado`); continue; }
    const antigo = subidos[it.slug];
    if (!antigo) { console.error(`✗ ${it.slug} — não está no sobe-lote.json`); continue; }
    if (new Date(it.publishAt) <= new Date()) { console.error(`✗ ${it.slug} — já publicou, não troco`); continue; }

    const mp4 = path.join(__dirname, 'exports', it.slug, `${it.slug}.mp4`);
    const meta = JSON.parse(fs.readFileSync(path.join(__dirname, 'exports', it.slug, 'meta.json'), 'utf8'));
    if (!fs.existsSync(mp4)) { console.error(`✗ ${it.slug} — mp4 sumiu`); continue; }

    if (SECAR) { console.log(`[seco] ${it.slug}: novo com ${it.track} → ${it.publishAt} · velho ${antigo.id} → 2099`); continue; }

    // 1) NOVO primeiro
    let novo;
    try {
      novo = await uploadToYouTube({
        videoPath: mp4, title: meta.title, description: meta.description,
        tags: meta.tags, hashtags: meta.hashtags, privacyStatus: 'private', publishAt: it.publishAt,
      });
    } catch (e) {
      const msg = e?.errors?.[0]?.reason || e.message || '';
      if (/quota|uploadLimitExceeded/i.test(msg)) { console.log('\n⛔ quota acabou — rode de novo depois das ~5h BRT'); break; }
      console.error(`✗ ${it.slug} — upload falhou: ${msg}`); continue;
    }
    const idNovo = novo.videoId || novo.id;

    // 2) só agora o VELHO pro limbo
    // O publishAt de um agendado NÃO troca direto: tem que zerar antes.
    await yt.videos.update({ part: ['status'], requestBody: { id: antigo.id, status: { privacyStatus: 'private', publishAt: null } } });
    await new Promise(r => setTimeout(r, 3000));
    await yt.videos.update({ part: ['status'], requestBody: { id: antigo.id, status: { privacyStatus: 'private', publishAt: LIMBO } } });

    feitos[it.slug] = { idNovo, idAntigo: antigo.id, track: it.track, quando: it.publishAt, em: new Date().toISOString() };
    subidos[it.slug] = { id: idNovo, url: `https://youtube.com/shorts/${idNovo}`, quando: it.publishAt, em: new Date().toISOString() };
    fs.writeFileSync(ESTADO, JSON.stringify(feitos, null, 2));
    fs.writeFileSync(SOBE, JSON.stringify(subidos, null, 2));
    console.log(`✓ ${it.slug}  novo ${idNovo} (${it.track})  ·  velho ${antigo.id} → 2099`);
  }

  const n = Object.keys(feitos).length;
  console.log(`\n${n} trocado(s). Os antigos estão em 2099 — excluir no Studio quando quiser.`);
})().catch(e => { console.error('ERRO:', e.message); process.exitCode = 1; });
