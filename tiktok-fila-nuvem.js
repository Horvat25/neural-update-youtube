'use strict';
/**
 * tiktok-fila-nuvem.js — mantém a fila do TikTok no Buffer sempre com os 10 PRÓXIMOS posts do
 * plano (tiktok-plano.json), na ordem do horário. Roda no GitHub Actions a cada 6h (PC desligado).
 *
 * POR QUE (11/09/2026): o plano grátis do Buffer segura só 10 agendados por canal e o TikTok
 * posta 3 por dia — a fila acaba em ~3 dias. Este robô repõe sozinho.
 *
 *   node tiktok-fila-nuvem.js            # sincroniza
 *   node tiktok-fila-nuvem.js --seco     # só mostra o que faria
 *
 * Regras de segurança:
 *  - só mexe no canal TikTok "neuralupdate1";
 *  - só APAGA post agendado que ele reconhece como item do plano (pela 1ª linha do texto) e que
 *    ficou fora dos 10 próximos — ele volta pra fila sozinho quando chegar a vez;
 *  - post criado à mão no Buffer, que não está no plano, nunca é tocado.
 * Sem dependência nenhuma (fetch nativo do Node 18+). Chave: BUFFER_API_KEY (secret do GitHub
 * ou .env local).
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
if (!process.env.BUFFER_API_KEY && fs.existsSync(path.join(ROOT, '.env'))) {
  for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^BUFFER_API_KEY=(.+)$/); if (m) process.env.BUFFER_API_KEY = m[1].trim();
  }
}
const KEY = process.env.BUFFER_API_KEY;
const CANAL = 'neuralupdate1';
const FILA_MAX = 10;
const SECO = process.argv.includes('--seco');
const q = s => JSON.stringify(String(s));
const titulo = t => String(t || '').split('\n')[0].trim();

async function gql(query) {
  const r = await fetch('https://api.buffer.com', { method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 500));
  return j.data;
}

(async () => {
  if (!KEY) throw new Error('falta BUFFER_API_KEY');
  const plano = JSON.parse(fs.readFileSync(path.join(ROOT, 'tiktok-plano.json'), 'utf8'));
  const org = (await gql('query { account { organizations { id } } }')).account.organizations[0].id;
  const canal = (await gql(`query { channels(input: { organizationId: ${q(org)} }) { id service name } }`))
    .channels.find(c => c.service === 'tiktok' && c.name === CANAL);
  if (!canal) throw new Error(`canal ${CANAL} não está conectado no Buffer`);

  const agendados = (await gql(`query { posts(input: { organizationId: ${q(org)}, filter: { status: [scheduled] },
    sort: [{ field: dueAt, direction: asc }] }) { edges { node { id text dueAt channelId } } } }`))
    .posts.edges.map(e => e.node).filter(n => n.channelId === canal.id);

  const limite = new Date(Date.now() + 15 * 60e3).toISOString();
  const futuros = plano.itens.filter(i => i.dueAt > limite).sort((a, b) => a.dueAt < b.dueAt ? -1 : 1);
  const desejados = futuros.slice(0, FILA_MAX);
  const titulosDesejados = new Set(desejados.map(i => titulo(i.texto)));
  const titulosDoPlano = new Set(plano.itens.map(i => titulo(i.texto)));
  const titulosNaFila = new Set(agendados.map(p => titulo(p.text)));

  // 1) tira da fila o que é do plano mas ficou pra depois dos 10 próximos (volta sozinho depois)
  const sair = agendados.filter(p => titulosDoPlano.has(titulo(p.text)) && !titulosDesejados.has(titulo(p.text)));
  for (const p of sair) {
    console.log(`${SECO ? '[seco] ' : ''}− sai por enquanto: ${p.dueAt.slice(0, 16)}  ${titulo(p.text).slice(0, 60)}`);
    if (!SECO) await gql(`mutation { deletePost(input: { id: ${q(p.id)} }) { __typename ... on MutationError { message } } }`);
  }
  // 2) põe o que falta dos 10 próximos
  let vagas = FILA_MAX - (agendados.length - sair.length);
  for (const i of desejados) {
    if (titulosNaFila.has(titulo(i.texto))) continue;
    if (vagas <= 0) { console.log(`· sem vaga para ${i.slug} (fila cheia com posts fora do plano)`); break; }
    console.log(`${SECO ? '[seco] ' : ''}+ entra: ${i.dueAt.slice(0, 16)}  ${i.tipo.padEnd(7)} ${i.slug}`);
    if (!SECO) {
      const r = await gql(`mutation { createPost(input: {
          text: ${q(i.texto)}, channelId: ${q(canal.id)}, schedulingType: automatic, mode: customScheduled,
          dueAt: ${q(i.dueAt)}, assets: [{ video: { url: ${q(i.url)}, metadata: { thumbnailOffset: 1500 } } }],
          metadata: { tiktok: { title: ${q(i.titulo)}, isAiGenerated: true } }
        }) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }`);
      if (!r.createPost.post) throw new Error(`${i.slug}: ${r.createPost.message}`);
    }
    vagas--;
  }
  const restam = futuros.length - desejados.length;
  console.log(`\nfila: ${Math.min(FILA_MAX, desejados.length)} próximos garantidos · depois deles ainda há ${restam} no plano (até ${plano.ate})`);
  if (futuros.length <= 6) console.log('⚠️ o plano está acabando — rodar tiktok-plano.js depois do próximo lote do Insta/YouTube');
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
