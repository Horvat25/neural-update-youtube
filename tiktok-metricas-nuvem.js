'use strict';
/**
 * tiktok-metricas-nuvem.js — snapshot diário das métricas dos vídeos do TikTok pelo Buffer (18/10/2026).
 * Roda no GitHub Actions (tiktok-metricas.yml), 1x/dia perto das 22h BRT. SÓ LEITURA no Buffer: não toca
 * em plano, fila nem conta. Acrescenta 1 linha por vídeo em metricas/tiktok-metricas.jsonl.
 *
 *   node tiktok-metricas-nuvem.js            # lê o Buffer e acrescenta as linhas do dia
 *   node tiktok-metricas-nuvem.js --seco     # só mostra (não escreve nada)
 *   node tiktok-metricas-nuvem.js --forcar   # permite 2 linhas do mesmo vídeo no mesmo dia (BRT)
 *   node tiktok-metricas-nuvem.js --desde=2026-10-16
 *
 * Por que: o TikTok não libera comentário por API oficial para nós; o TOTAL de comentários do Buffer é o
 * termômetro do ROTINA (14 vídeos com CTA × 7 aulas sem CTA). O Buffer atualiza os números ~1x/dia, então a
 * linha de hoje pode ter vídeo de hoje com null.
 * Linha: {"quando","dia","rede":"tt","video","tipo","views","curtidas","comentarios","compartilhamentos","cta","arte","buffer_atualizado","comentarios_antes","alerta"}
 * ALARME (18/10): "alerta":true quando um vídeo COM CTA tem mais comentários do que na linha anterior dele no jsonl (sem linha
 * anterior, conta a partir de 0). A Direção avisa o Marcelo para abrir aquele vídeo no app (comentário não vem por API).
 * Chave BUFFER_API_KEY: secret do GitHub ou .env local. Sem dependência (fetch do Node 18+).
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
const SECO = process.argv.includes('--seco');
const FORCAR = process.argv.includes('--forcar');
const DESDE = (process.argv.find(a => a.startsWith('--desde=')) || '--desde=2026-10-16').slice(8);
const MAPA = path.join(ROOT, 'metricas', 'rotina-videos-16a22.json');
const SAIDA = path.join(ROOT, 'metricas', 'tiktok-metricas.jsonl');
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
  const mapa = new Map(JSON.parse(fs.readFileSync(MAPA, 'utf8')).itens.map(i => [i.titulo, i]));
  const org = (await gql('query { account { organizations { id } } }')).account.organizations[0].id;
  const canal = (await gql(`query { channels(input: { organizationId: ${q(org)} }) { id service name } }`))
    .channels.find(c => c.service === 'tiktok' && c.name === CANAL);
  if (!canal) throw new Error(`canal ${CANAL} não está conectado no Buffer`);

  // todos os enviados do canal, do mais novo pro mais antigo, até passar do início
  const inicio = `${DESDE}T03:00:00.000Z`; // 00h BRT
  const posts = []; let after = null;
  for (let pg = 0; pg < 10; pg++) {
    const p = await gql(`query { posts(first: 100${after ? `, after: ${q(after)}` : ''}, input: { organizationId: ${q(org)},
      filter: { status: [sent], channelIds: [${q(canal.id)}] }, sort: [{ field: dueAt, direction: desc }] }) {
      edges { node { id text dueAt sentAt channelId externalLink metricsUpdatedAt metrics { name value } } }
      pageInfo { hasNextPage endCursor } } }`);
    for (const { node } of p.posts.edges) if (node.channelId === canal.id) posts.push(node);
    const velho = p.posts.edges.length && p.posts.edges[p.posts.edges.length - 1].node.dueAt < inicio;
    if (velho || !p.posts.pageInfo?.hasNextPage) break;
    after = p.posts.pageInfo.endCursor;
  }

  const agoraBRT = new Date(Date.now() - 3 * 3600e3);
  const quando = agoraBRT.toISOString().slice(0, 19) + '-03:00';
  const dia = quando.slice(0, 10);
  const ja = new Set(), ultimo = new Map(); // ultimo: slug -> comentários da linha anterior mais recente
  if (fs.existsSync(SAIDA)) {
    for (const l of fs.readFileSync(SAIDA, 'utf8').split('\n').filter(Boolean)) {
      try { const o = JSON.parse(l); ja.add(`${o.dia}|${o.video}`); if (o.comentarios != null) ultimo.set(o.video, o.comentarios); } catch { /* linha estranha: ignora */ }
    }
  }

  const linhas = []; let semMapa = 0; const vistos = new Set();
  for (const x of posts) {
    if ((x.sentAt || x.dueAt) < inicio) continue;
    const it = mapa.get(titulo(x.text));
    if (!it) { semMapa++; continue; }
    if (vistos.has(it.slug)) continue; // post repetido do mesmo vídeo: fica o 1º (mais novo)
    vistos.add(it.slug);
    const m = Object.fromEntries((x.metrics || []).map(k => [k.name, k.value]));
    linhas.push({ quando, dia, rede: 'tt', video: it.slug, tipo: it.tipo,
      views: m['Video Views'] ?? null, curtidas: m['Reactions'] ?? null, comentarios: m['Comments'] ?? null,
      compartilhamentos: m['Shares'] ?? null, cta: it.cta, arte: it.arte, buffer_atualizado: x.metricsUpdatedAt || null,
      comentarios_antes: ultimo.get(it.slug) ?? null, alerta: false, _saiu: x.sentAt || x.dueAt });
    const ult = linhas[linhas.length - 1];
    ult.alerta = !!(ult.cta && ult.comentarios != null && ult.comentarios > (ult.comentarios_antes ?? 0));
  }
  linhas.sort((a, b) => (a._saiu < b._saiu ? -1 : 1));

  // resumo CTA × sem CTA (só vídeos com número)
  const grupo = f => {
    const v = linhas.filter(l => l.cta === f && l.views != null && l.comentarios != null);
    const views = v.reduce((a, l) => a + l.views, 0), com = v.reduce((a, l) => a + l.comentarios, 0);
    return { n: v.length, views, comentarios: com, por_mil_views: views ? +(com / views * 1000).toFixed(2) : null };
  };
  console.log(`Buffer: ${posts.length} posts enviados lidos · ${linhas.length} vídeos do lote (desde ${DESDE}) · ${semMapa} fora do mapa`);
  for (const l of linhas) {
    console.log(`${l._saiu.slice(5, 16)}Z ${String(l.tipo).padEnd(5)} ${l.cta ? 'CTA arte ' + l.arte : 'sem CTA  '} ${String(l.views ?? '–').padStart(5)} views ${String(l.curtidas ?? '–').padStart(3)} curt ${String(l.comentarios ?? '–').padStart(3)} com ${String(l.compartilhamentos ?? '–').padStart(3)} shares  ${l.video}`);
  }
  console.log('com CTA   :', JSON.stringify(grupo(true)));
  console.log('sem CTA   :', JSON.stringify(grupo(false)));

  const alertas = linhas.filter(l => l.alerta && (FORCAR || !ja.has(`${l.dia}|${l.video}`)));
  console.log(alertas.length ? `🔔 ALERTA ROTINA: ${alertas.map(l => `${l.video} (${l.comentarios_antes ?? 0}→${l.comentarios})`).join(' · ')}` : 'sem alerta de comentário novo nos vídeos com CTA');
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, alertas.length
      ? `### 🔔 Comentário novo (CTA ROTINA)\n${alertas.map(l => `- ${l.video}: ${l.comentarios_antes ?? 0} → ${l.comentarios}`).join('\n')}\n`
      : 'Sem comentário novo nos vídeos com CTA.\n');
  }

  const novas = linhas.filter(l => FORCAR || !ja.has(`${l.dia}|${l.video}`)).map(({ _saiu, ...o }) => o);
  if (SECO) { console.log(`[seco] escreveria ${novas.length} linhas em ${path.relative(ROOT, SAIDA)}`); return; }
  if (novas.length) {
    fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
    fs.appendFileSync(SAIDA, novas.map(o => JSON.stringify(o)).join('\n') + '\n');
  }
  console.log(`+ ${novas.length} linhas em ${path.relative(ROOT, SAIDA)} (${linhas.length - novas.length} já existiam hoje)`);
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
