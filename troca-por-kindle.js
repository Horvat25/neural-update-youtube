'use strict';
/**
 * troca-por-kindle.js — troca no YouTube os vídeos agendados pela versão nova
 * (sem o pitch do ebook morto, e com o CTA do Kindle nos que são slot de CTA).
 *
 *   node troca-por-kindle.js            # faz o que a quota deixar
 *   node troca-por-kindle.js --secar    # só mostra o que faria
 *
 * O YouTube NÃO deixa substituir o arquivo de um vídeo já publicado/agendado.
 * Então a troca é: sobe o novo no horário certo + empurra o velho pra 2099.
 *
 * ⚠️ ORDEM IMPORTA: sobe o NOVO primeiro, empurra o VELHO depois. Se fizesse o
 * contrário e a quota estourasse no meio, o velho já estaria em 2099 e o horário
 * ficaria VAZIO — buraco na grade sem ninguém perceber. Falhando nesta ordem, o
 * pior caso é o horário ter o vídeo antigo, que é ruim mas não é buraco.
 *
 * Quota: videos.insert ≈ 1600 unidades, limite 10.000/dia (~6 uploads), reseta
 * ~4-5h BRT. São 7 vídeos — o 7º sai no dia seguinte. O estado fica em
 * data/troca-kindle.json e a execução retoma de onde parou.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { uploadToYouTube } = require('./youtube-uploader');
const { google, getAuthorizedClient } = require('./youtube-auth');

const SECAR = process.argv.includes('--secar');
const ESTADO = path.join(__dirname, 'data', 'troca-kindle.json');
const LIMBO = '2099-01-01T00:00:00.000Z';

const feitos = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, 'utf8')) : {};
const antigos = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'sobe-lote.json'), 'utf8'));

// Alvo = todo vídeo ainda não publicado cuja pasta tenha um <slug>-kindle.mp4 novo.
const agora = new Date();
const alvos = Object.entries(antigos)
  .filter(([slug, v]) => new Date(v.quando) > agora)
  .filter(([slug]) => fs.existsSync(path.join(__dirname, 'exports', slug, `${slug}-kindle.mp4`)))
  .map(([slug, v]) => ({ slug, idAntigo: v.id, quando: v.quando }))
  .sort((a, b) => new Date(a.quando) - new Date(b.quando));

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  console.log(`${alvos.length} vídeo(s) pra trocar · ${Object.keys(feitos).length} já feito(s)\n`);

  let trocou = 0;
  for (const { slug, idAntigo, quando } of alvos) {
    if (feitos[slug]) { console.log(`· ${slug} — já trocado`); continue; }

    const meta = JSON.parse(fs.readFileSync(path.join(__dirname, 'exports', slug, 'meta.json'), 'utf8'));
    const mp4 = path.join(__dirname, 'exports', slug, `${slug}-kindle.mp4`);
    const hora = new Date(quando).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    if (SECAR) { console.log(`[seco] ${hora} · ${slug}: sobe novo → ${quando}, manda ${idAntigo} pro limbo`); continue; }

    // 1) sobe o NOVO no horário original
    let novo;
    try {
      novo = await uploadToYouTube({
        videoPath: mp4, title: meta.title, description: meta.description,
        tags: meta.tags, hashtags: meta.hashtags,
        privacyStatus: 'private', publishAt: quando,
      });
    } catch (e) {
      const msg = e?.errors?.[0]?.reason || e.message || '';
      if (/quota/i.test(msg)) {
        console.error(`\n⛔ quota do YouTube acabou. Faltam ${alvos.length - trocou} vídeo(s).`);
        console.error('   Reseta ~4-5h BRT. Rode este mesmo comando de novo amanhã cedo.');
        break;
      }
      console.error(`✗ ${slug} — upload falhou: ${msg}`);
      continue;
    }

    // 2) só agora empurra o VELHO pro limbo (ver a nota de ORDEM no topo)
    try {
      await yt.videos.update({
        part: ['status'],
        requestBody: { id: idAntigo, status: { privacyStatus: 'private', publishAt: LIMBO, selfDeclaredMadeForKids: false } },
      });
    } catch (e) {
      console.error(`⚠️ ${slug} — o novo subiu (${novo.id}) mas o VELHO ${idAntigo} não foi pro limbo: ${e?.errors?.[0]?.message || e.message}`);
      console.error(`   Resolva na mão: node reschedule.js ${idAntigo} ${LIMBO}`);
    }

    feitos[slug] = { novo: novo.id, velho: idAntigo, quando, em: new Date().toISOString() };
    fs.writeFileSync(ESTADO, JSON.stringify(feitos, null, 2));
    console.log(`✓ ${hora} · ${slug}\n    novo:  https://youtube.com/shorts/${novo.id}\n    velho: ${idAntigo} → 2099`);
    trocou++;
  }

  console.log(`\n${trocou} trocado(s) nesta rodada.`);
  const faltam = alvos.filter(a => !feitos[a.slug]);
  if (faltam.length) console.log(`Faltam: ${faltam.map(f => f.slug).join(', ')}`);
})().catch(e => { console.error('ERRO:', e?.errors?.[0]?.message || e.message); process.exit(1); });
