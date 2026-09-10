'use strict';
/**
 * _ypp.js — quanto do requisito de 4.000 horas o canal REALMENTE tem.
 *
 * A conta do YPP só aceita horas de conteúdo LONGO (VOD + live). Short não conta.
 * A dimensão `creatorContentType` é exatamente esse corte — é ela que separa
 * SHORTS de VIDEO_ON_DEMAND no relatório oficial. Contar "vídeos com mais de
 * 180s" chega perto, mas erra: vídeo de 61-180s não marcado como Short também
 * entra na conta do YouTube.
 *
 * Janela: últimos 365 dias (a mesma que o YouTube usa, e ela ROLA — hora velha
 * cai fora).
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const iso = d => d.toISOString().slice(0, 10);

(async () => {
  const auth = await getAuthorizedClient();
  const ya = google.youtubeAnalytics({ version: 'v2', auth });
  const hoje = new Date();
  const ano = new Date(Date.now() - 365 * 86400e3);

  const r = await ya.reports.query({
    ids: 'channel==MINE', startDate: iso(ano), endDate: iso(hoje),
    metrics: 'views,estimatedMinutesWatched,subscribersGained',
    dimensions: 'creatorContentType',
  });

  // ⚠️ a API devolve o valor em camelCase minúsculo (`videoOnDemand`, `shorts`),
  // NÃO as constantes maiúsculas da documentação. Comparar com 'VIDEO_ON_DEMAND'
  // dá 0h em silêncio — o pior tipo de bug num painel de meta.
  const contaYPP = t => /^(videoOnDemand|liveStream)$/i.test(t);

  console.log(`\n=== ÚLTIMOS 365 DIAS (${iso(ano)} → ${iso(hoje)}) ===\n`);
  let longo = 0;
  for (const [tipo, views, min, subs] of (r.data.rows || [])) {
    const h = min / 60;
    if (contaYPP(tipo)) longo += h;
    console.log(`${tipo.padEnd(20)} ${String(views).padStart(7)} views  ${h.toFixed(1).padStart(8)} h  +${subs} subs`);
  }
  console.log(`\n>>> HORAS QUE CONTAM PRO YPP: ${longo.toFixed(1)}h de 4.000h  (${(longo / 4000 * 100).toFixed(2)}%)`);
  console.log(`>>> FALTAM ${(4000 - longo).toFixed(0)}h\n`);

  // ritmo dos últimos 30 dias -> previsão
  const mes = new Date(Date.now() - 30 * 86400e3);
  const r30 = await ya.reports.query({
    ids: 'channel==MINE', startDate: iso(mes), endDate: iso(hoje),
    metrics: 'estimatedMinutesWatched', dimensions: 'creatorContentType',
  });
  let h30 = 0;
  for (const [tipo, min] of (r30.data.rows || [])) if (contaYPP(tipo)) h30 += min / 60;
  console.log(`ritmo dos últimos 30 dias: ${h30.toFixed(1)}h/mês de conteúdo longo`);
  if (h30 > 0) {
    const meses = (4000 - longo) / h30;
    console.log(`nesse ritmo: ${meses.toFixed(0)} meses (${(meses / 12).toFixed(1)} anos) pra chegar nas 4.000h`);
    console.log(`pra chegar em 12 meses precisaria de ${((4000 - longo) / 12).toFixed(0)}h/mês — ${(((4000 - longo) / 12) / h30).toFixed(0)}x o ritmo atual`);
  }

  // inscritos (o outro requisito)
  const yt = google.youtube({ version: 'v3', auth });
  const ch = await yt.channels.list({ part: ['statistics'], mine: true });
  const st = ch.data.items[0].statistics;
  console.log(`\ninscritos: ${st.subscriberCount} de 1.000 (${(st.subscriberCount / 1000 * 100).toFixed(1)}%)`);
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
