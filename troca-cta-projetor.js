'use strict';
/**
 * troca-cta-projetor.js — troca no YouTube os 5 virais 18h de 13–17/09 pela versão em que o
 * CTA do projetor aparece COM a imagem (antes era só a frase "quer esse céu? link na bio").
 *
 *   node troca-cta-projetor.js            # faz o que a quota deixar
 *   node troca-cta-projetor.js --secar    # só mostra o que faria
 *
 * Mesmo padrão do troca-por-kindle.js: sobe o NOVO primeiro no mesmo horário, só depois
 * empurra o VELHO pra 2099 (se a quota acabar no meio, o pior caso é o vídeo antigo no ar,
 * nunca um buraco na grade). Título, descrição e tags são copiados do vídeo que está no canal.
 *
 * Os IDs abaixo foram conferidos na lista do canal (list-schedule.js) em 12/09/2026 — não
 * vêm do sobe-lote.json (ver memória ids-do-youtube-mentem). Estado em data/troca-cta-projetor.json.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { uploadToYouTube } = require('./youtube-uploader');
const { google, getAuthorizedClient } = require('./youtube-auth');

const SECAR = process.argv.includes('--secar');
const ESTADO = path.join(__dirname, 'data', 'troca-cta-projetor.json');
const LOTE = path.join(__dirname, 'data', 'sobe-lote.json');
const LIMBO = '2099-01-01T00:00:00.000Z';

const ALVOS = [
  { slug: 'nw-juba-nao-e-fumaca', idAntigo: 'NDKjSMbm8pw', quando: '2026-09-13T21:00:00.000Z' },
  { slug: 'nw-plutao-liquido-sobe-gelo', idAntigo: '_ndpb-r8qoQ', quando: '2026-09-14T21:00:00.000Z' },
  { slug: 'nw-galaxia-nao-tem-tamanho-que-parecia', idAntigo: 'OKasUwiwt68', quando: '2026-09-15T21:00:00.000Z' },
  { slug: 'nw-planeta-luz-tremeu', idAntigo: 'a-UHbjHwnCU', quando: '2026-09-16T21:00:00.000Z' },
  { slug: 'nw-foto-esconde-planetas-centro-galaxia', idAntigo: 'xL8FPz2Fc90', quando: '2026-09-17T21:00:00.000Z' },
];

const feitos = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, 'utf8')) : {};

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const agora = new Date();
  let trocou = 0;

  for (const { slug, idAntigo, quando } of ALVOS) {
    if (feitos[slug]) { console.log(`· ${slug} — já trocado (${feitos[slug].novo})`); continue; }
    if (new Date(quando) <= agora) { console.log(`· ${slug} — horário já passou, não troca`); continue; }

    const mp4 = path.join(__dirname, 'exports', slug, `${slug}-cta-projetor.mp4`);
    if (!fs.existsSync(mp4)) { console.error(`✗ ${slug} — falta ${mp4}`); continue; }

    // confere o velho no canal: ainda agendado nesse horário?
    const r = await yt.videos.list({ part: ['snippet', 'status', 'paidProductPlacementDetails'], id: [idAntigo] });
    const velho = r.data.items?.[0];
    if (!velho) { console.error(`✗ ${slug} — ${idAntigo} não existe no canal`); continue; }
    if (new Date(velho.status.publishAt).getTime() !== new Date(quando).getTime() || velho.status.privacyStatus !== 'private') {
      console.error(`✗ ${slug} — ${idAntigo} não está agendado em ${quando} (está ${velho.status.privacyStatus} ${velho.status.publishAt}). Pulei.`);
      continue;
    }
    const { title, description, tags } = velho.snippet;
    const pago = !!velho.paidProductPlacementDetails?.hasPaidProductPlacement || /#publi/i.test(description || '');

    if (SECAR) { console.log(`[seco] ${slug}: sobe novo "${title}" → ${quando} (pago=${pago}), manda ${idAntigo} pro limbo`); continue; }

    // 1) sobe o NOVO no horário original
    let novo;
    try {
      novo = await uploadToYouTube({
        videoPath: mp4, title, description, tags, hashtags: [],
        includeBlog: false, pago, privacyStatus: 'private', publishAt: quando,
      });
    } catch (e) {
      const msg = e?.errors?.[0]?.reason || e.message || '';
      if (/quota/i.test(msg)) {
        console.error(`\n⛔ quota do YouTube acabou. Faltam ${ALVOS.length - Object.keys(feitos).length} vídeo(s). Reseta ~4h BRT; rode de novo.`);
        break;
      }
      console.error(`✗ ${slug} — upload falhou: ${msg}`);
      continue;
    }

    // 2) só agora empurra o VELHO pro limbo
    try {
      await yt.videos.update({
        part: ['status'],
        requestBody: { id: idAntigo, status: { privacyStatus: 'private', publishAt: LIMBO, selfDeclaredMadeForKids: false, containsSyntheticMedia: true } },
      });
    } catch (e) {
      console.error(`⚠️ ${slug} — o novo subiu (${novo.id}) mas o VELHO ${idAntigo} não foi pro limbo: ${e?.errors?.[0]?.message || e.message}`);
      console.error(`   Resolva na mão: node reschedule.js ${idAntigo} ${LIMBO}`);
    }

    feitos[slug] = { novo: novo.id, velho: idAntigo, quando, em: new Date().toISOString() };
    fs.writeFileSync(ESTADO, JSON.stringify(feitos, null, 2));
    // mantém o sobe-lote.json apontando pro ID que vai ao ar
    const lote = JSON.parse(fs.readFileSync(LOTE, 'utf8'));
    lote[slug] = { ...(lote[slug] || {}), id: novo.id, url: `https://youtube.com/shorts/${novo.id}`, quando, em: feitos[slug].em };
    fs.writeFileSync(LOTE, JSON.stringify(lote, null, 2));
    console.log(`✓ ${slug}\n    novo:  https://youtube.com/shorts/${novo.id}\n    velho: ${idAntigo} → 2099`);
    trocou++;
  }

  console.log(`\n${trocou} trocado(s) nesta rodada · ${Object.keys(feitos).length}/${ALVOS.length} no total.`);
})().catch(e => { console.error('ERRO:', e?.errors?.[0]?.message || e.message); process.exit(1); });
