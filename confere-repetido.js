'use strict';
/**
 * confere-repetido.js — compara os temas de um lote NOVO contra tudo que o canal
 * já publicou, e aponta sobreposição.
 *
 * POR QUE: o PLAYBOOK-SHORTS manda "conferir TODOS os já usados — zero repetição",
 * e o YouTube SUPRIME canal que repete estrutura/tema. Em 13/08/2026 o Marcelo
 * sentiu de ouvido que dois vídeos do lote pareciam conteúdo que já tínhamos feito
 * — e ele estava certo, porque eu escolhi os 21 temas sem rodar essa conferência.
 *
 * Compara por PALAVRA-CHAVE de conteúdo (ignora as vazias), não por título igual:
 * "Você nunca viu o Sol de verdade" e "A luz do Sol tem 8 minutos" são o mesmo
 * vídeo com nomes diferentes.
 *
 *   node confere-repetido.js                    # todos os lotes de lotes/*.json
 *   node confere-repetido.js lotes/x.json
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { google, getAuthorizedClient } = require('./youtube-auth');

const VAZIAS = new Set(('a o e de da do das dos em no na nos nas um uma uns umas que se por para pra com sem sobre ' +
  'shorts você voce seu sua ao à as os é nao não mais mais menos como qual quando onde isso este esta esse essa ' +
  'the of and neural update ciencia ciência').split(/\s+/));

const chaves = s => new Set((s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !VAZIAS.has(w)));

(async () => {
  const arquivos = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const lotes = (arquivos.length ? arquivos : fs.readdirSync(path.join(__dirname, 'lotes'))
    .filter(f => f.endsWith('.json')).map(f => path.join('lotes', f)));
  const novos = lotes.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));

  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const ch = await yt.channels.list({ part: ['contentDetails'], mine: true });
  const up = ch.data.items[0].contentDetails.relatedPlaylists.uploads;

  const publicados = [];
  let page;
  do {
    const pl = await yt.playlistItems.list({ part: ['snippet'], playlistId: up, maxResults: 50, pageToken: page });
    (pl.data.items || []).forEach(i => publicados.push(i.snippet.title));
    page = pl.data.nextPageToken;
  } while (page);
  console.log(`${publicados.length} vídeos já no canal · ${novos.length} no lote novo\n`);

  const pubChaves = publicados.map(t => ({ t, k: chaves(t) }));
  const novosSlugs = new Set(novos.map(n => n.slug));

  let alertas = 0;
  for (const n of novos) {
    const k = chaves(`${n.title} ${n.topic || ''}`);
    let melhor = null, melhorScore = 0;
    for (const p of pubChaves) {
      // não comparar com a versão dele mesmo já subida
      if (novosSlugs.size && p.t === n.title) continue;
      const comum = [...k].filter(x => p.k.has(x));
      const score = comum.length / Math.max(1, Math.min(k.size, p.k.size));
      if (score > melhorScore) { melhorScore = score; melhor = { p, comum }; }
    }
    if (melhorScore >= 0.34) {
      alertas++;
      console.log(`⚠️  ${n.slug}`);
      console.log(`    novo : ${n.title}`);
      console.log(`    já tem: ${melhor.p.t}`);
      console.log(`    em comum: ${melhor.comum.join(', ')}  (${(melhorScore * 100).toFixed(0)}%)\n`);
    }
  }
  console.log(alertas ? `${alertas} tema(s) com sobreposição — revisar antes de publicar`
                      : 'nenhuma sobreposição relevante');
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
