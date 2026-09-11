'use strict';
/**
 * _marca-sintetico.js — marca "conteúdo alterado ou sintético" (Uso de IA = Sim) em vídeos
 * que JÁ subiram.
 *
 * POR QUE (11/09/2026): o youtube-uploader nunca mandava status.containsSyntheticMedia, e a
 * regra de conteúdo inautêntico do YouTube pune quem não declara. Uploads novos já saem
 * marcados; este script cobre o que subiu antes.
 *
 *   node _marca-sintetico.js <id> [id ...]
 *   node _marca-sintetico.js --agendados            # todos os agendados do canal
 *   node _marca-sintetico.js --publicos 100         # até 100 públicos, mais novos primeiro
 *
 * ⚠️ Duas pegadinhas medidas em 11/09:
 *  - videos.update(status) ZERA todo campo mutável que não vier no pedido. Por isso ele LÊ o
 *    status atual e reenvia TUDO igual (privacidade, publishAt, licença, embed...).
 *  - o videos.list NÃO devolve containsSyntheticMedia, mesmo marcado (o Studio mostra
 *    "Uso de IA: Sim"). A prova é a RESPOSTA do update + a releitura mostrando que o horário
 *    e o resto não mudaram. Os já marcados ficam em data/sintetico-marcados.json.
 * Custo: ~51 unidades de quota por vídeo (limite 10.000/dia; um upload custa ~1.600).
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { google, getAuthorizedClient } = require('./youtube-auth');

const MUTAVEIS = ['privacyStatus', 'publishAt', 'embeddable', 'license', 'publicStatsViewable', 'selfDeclaredMadeForKids'];
const REGISTRO = path.join(__dirname, 'data', 'sintetico-marcados.json');
const lerRegistro = () => { try { return JSON.parse(fs.readFileSync(REGISTRO, 'utf8')); } catch { return {}; } };

async function todosDoCanal(yt) {
  const up = (await yt.channels.list({ part: ['contentDetails'], mine: true })).data.items[0].contentDetails.relatedPlaylists.uploads;
  const ids = []; let tok;
  do {
    const r = await yt.playlistItems.list({ part: ['contentDetails'], playlistId: up, maxResults: 50, pageToken: tok });
    ids.push(...r.data.items.map(i => i.contentDetails.videoId)); tok = r.data.nextPageToken;
  } while (tok);
  const vids = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await yt.videos.list({ part: ['status', 'snippet'], id: ids.slice(i, i + 50) });
    vids.push(...r.data.items.map(v => ({ id: v.id, pub: v.snippet.publishedAt, ...v.status })));
  }
  return vids;
}

(async () => {
  const yt = google.youtube({ version: 'v3', auth: await getAuthorizedClient() });
  const registro = lerRegistro();
  let ids = process.argv.slice(2).filter(a => !a.startsWith('--') && !/^\d+$/.test(a));
  if (process.argv.includes('--agendados') || process.argv.includes('--publicos')) {
    const vids = await todosDoCanal(yt);
    if (process.argv.includes('--agendados'))
      ids = vids.filter(v => v.privacyStatus === 'private' && v.publishAt && !v.publishAt.startsWith('2099')).map(v => v.id);
    else {
      const n = +process.argv[process.argv.indexOf('--publicos') + 1] || 100;
      ids = vids.filter(v => v.privacyStatus === 'public').sort((a, b) => b.pub < a.pub ? -1 : 1).map(v => v.id);
      ids = ids.filter(id => !registro[id]).slice(0, n);
    }
  }
  ids = ids.filter(id => !registro[id]);
  if (!ids.length) { console.log('nada a marcar (todos já estão no registro)'); return; }
  console.log(`marcando ${ids.length} vídeo(s)...`);
  let ok = 0;
  for (const id of ids) {
    try {
      const antes = (await yt.videos.list({ part: ['status'], id: [id] })).data.items?.[0]?.status;
      if (!antes) { console.error(`✗ ${id} — não encontrado`); continue; }
      const status = { containsSyntheticMedia: true };
      for (const k of MUTAVEIS) if (antes[k] !== undefined) status[k] = antes[k];
      const r = await yt.videos.update({ part: ['status'], requestBody: { id, status } });
      const depois = (await yt.videos.list({ part: ['status'], id: [id] })).data.items[0].status;
      const mudou = MUTAVEIS.filter(k => String(antes[k]) !== String(depois[k]));
      if (r.data.status?.containsSyntheticMedia !== true || mudou.length) {
        console.error(`✗ ${id} — resposta=${r.data.status?.containsSyntheticMedia} · MUDOU: ${mudou.map(k => `${k} ${antes[k]}→${depois[k]}`).join(', ') || 'nada'}`);
        continue;
      }
      registro[id] = new Date().toISOString();
      fs.writeFileSync(REGISTRO, JSON.stringify(registro, null, 1));
      console.log(`✓ ${id} — Uso de IA: Sim · ${depois.privacyStatus}${depois.publishAt ? ' · publica ' + depois.publishAt : ''} (resto inalterado)`);
      ok++;
    } catch (e) {
      const msg = e?.errors?.[0]?.message || e.message;
      console.error(`✗ ${id} — ${msg}`);
      if (/quota/i.test(msg)) { console.error('   quota do dia acabou — continuar amanhã'); break; }
    }
  }
  console.log(`\n${ok}/${ids.length} marcados agora · ${Object.keys(registro).length} no registro`);
})().catch(e => { console.error('ERRO:', e?.errors?.[0]?.message || e.message); process.exit(1); });
