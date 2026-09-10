'use strict';
/**
 * acha-duplicado.js — varre TODOS os vídeos agendados e aponta:
 *   · títulos repetidos (mesmo vídeo subido duas vezes)
 *   · dois vídeos no mesmo horário
 *   · buracos na grade (slot 08h/14h/18h vazio)
 *
 * Existe porque em 30/07 um lote re-rodou antes de salvar o estado e subiu
 * duplicata — e o `list-schedule.js` só mostra os N uploads mais recentes,
 * então a duplicata não aparecia lá.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const brt = iso => new Date(new Date(iso).getTime() - 3 * 3600e3);
const dia = iso => brt(iso).toISOString().slice(0, 10);
const hora = iso => brt(iso).getUTCHours();

(async () => {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const ch = await youtube.channels.list({ part: ['contentDetails'], mine: true });
  const uploads = ch.data.items[0].contentDetails.relatedPlaylists.uploads;

  const ids = [];
  let page;
  do {
    const pl = await youtube.playlistItems.list({
      part: ['contentDetails'], playlistId: uploads, maxResults: 50, pageToken: page,
    });
    (pl.data.items || []).forEach(i => ids.push(i.contentDetails.videoId));
    page = pl.data.nextPageToken;
  } while (page && ids.length < 300);

  const vids = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await youtube.videos.list({ part: ['snippet', 'status'], id: ids.slice(i, i + 50) });
    vids.push(...(r.data.items || []));
  }

  const agendados = vids
    .filter(v => v.status?.publishAt && v.status.privacyStatus === 'private')
    .map(v => ({ id: v.id, t: v.snippet.title, q: v.status.publishAt }))
    .sort((a, b) => a.q < b.q ? -1 : 1);

  console.log(`\n=== ${agendados.length} AGENDADOS ===`);
  agendados.forEach(v =>
    console.log(`${dia(v.q)} ${String(hora(v.q)).padStart(2, '0')}h  ${v.id}  ${v.t.slice(0, 52)}`));

  // títulos repetidos
  const porTitulo = {};
  agendados.forEach(v => (porTitulo[v.t] ||= []).push(v));
  const reps = Object.entries(porTitulo).filter(([, a]) => a.length > 1);
  if (reps.length) {
    console.log(`\n🔴 TÍTULO REPETIDO (${reps.length}):`);
    reps.forEach(([t, a]) => {
      console.log(`\n  "${t.slice(0, 58)}"`);
      a.forEach(v => console.log(`     ${v.id}  →  ${dia(v.q)} ${String(hora(v.q)).padStart(2, '0')}h`));
    });
  } else console.log('\n✓ nenhum título repetido');

  // dois no mesmo horário
  const porSlot = {};
  agendados.forEach(v => (porSlot[`${dia(v.q)} ${hora(v.q)}h`] ||= []).push(v));
  const colisoes = Object.entries(porSlot).filter(([, a]) => a.length > 1);
  if (colisoes.length) {
    console.log(`\n🔴 DOIS NO MESMO HORÁRIO:`);
    colisoes.forEach(([s, a]) => {
      console.log(`\n  ${s}`);
      a.forEach(v => console.log(`     ${v.id}  ${v.t.slice(0, 50)}`));
    });
  } else console.log('✓ nenhuma colisão de horário');

  // buracos na grade
  const dias = [...new Set(agendados.map(v => dia(v.q)))].sort();
  const buracos = [];
  dias.forEach(d => {
    [8, 14, 18].forEach(h => {
      const tem = agendados.some(v => dia(v.q) === d && hora(v.q) === h);
      if (!tem) buracos.push(`${d} ${String(h).padStart(2, '0')}h`);
    });
  });
  if (buracos.length) {
    console.log(`\n🟡 BURACO NA GRADE (${buracos.length}):`);
    buracos.forEach(b => console.log('   ' + b));
  } else console.log('✓ grade sem buraco');
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
