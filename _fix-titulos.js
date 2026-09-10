'use strict';
/**
 * _fix-titulos.js — reescreve os títulos dos vídeos LONGOS do catálogo.
 *
 * POR QUE (medido em 12/ago/2026 com `_longos-trafego.js`):
 * o único longo que o algoritmo REALMENTE distribuiu foi "Por que a Lua é cheia
 * de crateras e a Terra não? (a Terra levou MAIS tiros)" — 111 das 123 views
 * vieram de SUGERIDO. Todos os outros ficaram entre 10 e 28 views. A diferença
 * não é o tema nem a retenção (o de melhor retenção do canal, 47%, tem 28 views):
 * é o TÍTULO. O molde que funcionou é
 *        pergunta/promessa concreta + parêntese que vira a mesa.
 *
 * Por isso: todos os outros passam pro mesmo molde, e o da Lua NÃO SE TOCA —
 * mexer no título de um vídeo que está sendo distribuído joga ele de volta pra
 * fila de reavaliação, e é o único que está funcionando.
 *
 * Palavra-chave de BUSCA vai na frente: o canal tem ~2 views de busca por longo,
 * ou seja, esse canal de tráfego está intocado.
 *
 *   node _fix-titulos.js          # mostra o que faria
 *   node _fix-titulos.js --vai    # aplica
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const NOVOS = [
  ['qpHgxaoZMqQ', '7 fenômenos da física quântica que já foram comprovados (e não fazem sentido)'],
  ['ZrRtgwWylYI', 'Astronomia, Astrofísica e Cosmologia: qual é a diferença? (a maioria erra a 3ª)'],
  ['CQ1652ESITU', 'Como o Universo vai acabar: a linha do tempo até o último átomo'],
  ['7nZHfyTLFWQ', 'Os 5 lugares mais assustadores do Universo (o nº1 não deveria existir)'],
  ['Kxc1FoL4FNw', '10 lugares do Universo onde você morreria em segundos (do mais lento ao mais rápido)'],
  // yG-am7UG5gc — Lua/crateras: NÃO MEXER. 111 views de sugerido, o único distribuído.
];

const VAI = process.argv.includes('--vai');

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const r = await yt.videos.list({ part: ['snippet'], id: NOVOS.map(n => n[0]) });
  const porId = Object.fromEntries((r.data.items || []).map(v => [v.id, v.snippet]));

  for (const [id, titulo] of NOVOS) {
    const s = porId[id];
    if (!s) { console.log(`${id}  NÃO ENCONTRADO`); continue; }
    console.log(`\n${id}  (${titulo.length} chars)`);
    console.log(`  de : ${s.title}`);
    console.log(`  pra: ${titulo}`);
    if (!VAI) continue;
    // snippet inteiro de volta: videos.update SUBSTITUI, e mandar só o título
    // apagaria descrição (com os links do funil), tags e categoria.
    await yt.videos.update({
      part: ['snippet'],
      requestBody: {
        id,
        snippet: {
          title: titulo,
          description: s.description,
          tags: s.tags,
          categoryId: s.categoryId,
          defaultLanguage: s.defaultLanguage,
          defaultAudioLanguage: s.defaultAudioLanguage,
        },
      },
    });
    console.log(`  ✓ aplicado`);
  }
  if (!VAI) console.log('\n(simulação — rode com --vai pra aplicar)');
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
