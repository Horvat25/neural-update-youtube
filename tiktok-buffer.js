'use strict';
/**
 * tiktok-buffer.js — mantém a fila do TikTok no Buffer sempre com 10 vídeos (5 dias, 2 por dia).
 *
 * POR QUE (11/09/2026): o TikTok não aprova app de uso pessoal para publicar sozinho
 * ("Apps must not be for private or personal use"), então a publicação automática vai pelo
 * Buffer, que é um app aprovado. Plano grátis: 10 posts na fila por canal. A chave da API
 * (BUFFER_API_KEY) mora no .env — nunca no Git.
 *
 *   node tiktok-buffer.js status                          # canal conectado + o que está na fila
 *   node tiktok-buffer.js completa                        # completa a fila até 10 (monta, hospeda, agenda)
 *   node tiktok-buffer.js agenda <slug>                   # agenda só esse, no horário dele
 *   node tiktok-buffer.js agenda <slug> --agora           # publica já
 *   node tiktok-buffer.js agenda <slug> --quando <ISO>    # num horário escolhido (UTC)
 *
 * Horários (BRT): notícia do dia D → D 12:17 · viral do dia D → D 20:23 (picos do TikTok no
 * Brasil são almoço e noite; fugir da hora cheia). Aula não vai pro TikTok.
 * SÓ publica no canal TikTok cujo nome é exatamente "neuralupdate1" — em 11/09 a conta antiga
 * (@neural.update, a do shadowban) chegou a ser conectada por engano.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawnSync } = require('child_process');
const V = require('./tiktok-versao');

const API = 'https://api.buffer.com';
const KEY = process.env.BUFFER_API_KEY;
const CANAL = 'neuralupdate1';
const FILA_MAX = 10;
const HORA_UTC = { news: '15:17', viral: '23:23' }; // = 12:17 e 20:23 em Brasília
const ESTADO = path.join(__dirname, 'data', 'tiktok-buffer.json');

const lerEstado = () => { try { return JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch { return {}; } };
const salvarEstado = e => fs.writeFileSync(ESTADO, JSON.stringify(e, null, 2));
const q = s => JSON.stringify(String(s));

async function gql(query) {
  if (!KEY) throw new Error('falta BUFFER_API_KEY no .env');
  const { data } = await axios.post(API, { query }, {
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, timeout: 60000 });
  if (data.errors) throw new Error(JSON.stringify(data.errors).slice(0, 600));
  return data.data;
}

async function contexto() {
  const a = await gql('query { account { organizations { id name } } }');
  const org = a.account.organizations[0].id;
  const c = await gql(`query { channels(input: { organizationId: ${q(org)} }) { id service name } }`);
  const canal = c.channels.find(x => x.service === 'tiktok' && x.name === CANAL);
  if (!canal) throw new Error(`canal ${CANAL} não está conectado. Conectados: ${c.channels.map(x => `${x.service}:${x.name}`).join(', ') || 'nenhum'}`);
  return { org, canal };
}

async function naFila(org, canalId) {
  const p = await gql(`query { posts(input: { organizationId: ${q(org)}, filter: { status: [scheduled] },
    sort: [{ field: dueAt, direction: asc }] }) { edges { node { id text dueAt channelId } } } }`);
  return p.posts.edges.map(e => e.node).filter(n => n.channelId === canalId);
}

function horario(it) {
  // data em Brasília do publishAt original (UTC-3) + horário do TikTok para aquele slot
  const brt = new Date(new Date(it.publishAt).getTime() - 3 * 3600e3).toISOString().slice(0, 10);
  return `${brt}T${HORA_UTC[it.stream] || HORA_UTC.viral}:00.000Z`;
}

function hospeda(mp4) {
  const cache = mp4.replace(/\.mp4$/, '.url');
  if (fs.existsSync(cache) && fs.statSync(cache).mtimeMs >= fs.statSync(mp4).mtimeMs) return fs.readFileSync(cache, 'utf8').trim();
  const r = spawnSync(`higgsfield upload create "${mp4}" --json`, { cwd: __dirname, encoding: 'utf8', shell: true, timeout: 900000 });
  const m = ((r.stdout || '') + (r.stderr || '')).match(/https:\/\/[^\s"]+\.mp4/);
  if (!m) throw new Error('upload falhou: ' + ((r.stdout || '') + (r.stderr || '')).trim().slice(-200));
  fs.writeFileSync(cache, m[0]);
  return m[0];
}

async function agenda(it, canal, estado, opc = {}) {
  const quando = opc.quando || horario(it);
  if (!opc.agora && quando <= new Date(Date.now() + 10 * 60e3).toISOString()) { console.log(`· ${it.slug} — horário ${quando} já passou`); return false; }
  const mp4 = V.monta(it);
  if (!mp4) return false;
  const url = hospeda(mp4);
  const texto = fs.readFileSync(mp4.replace(/\.mp4$/, '.legenda.txt'), 'utf8').trim();
  const titulo = texto.split('\n')[0].slice(0, 90);
  const modo = opc.agora ? 'mode: shareNow' : `mode: customScheduled, dueAt: ${q(quando)}`;
  const r = await gql(`mutation { createPost(input: {
      text: ${q(texto)}, channelId: ${q(canal.id)}, schedulingType: automatic, ${modo},
      assets: [{ video: { url: ${q(url)}, metadata: { thumbnailOffset: 1500 } } }],
      metadata: { tiktok: { title: ${q(titulo)}, isAiGenerated: true } }
    }) { ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }`);
  const res = r.createPost;
  if (!res.post) throw new Error(`${it.slug}: ${res.message || JSON.stringify(res)}`);
  estado[it.slug] = { postId: res.post.id, dueAt: res.post.dueAt || new Date().toISOString(), url, agendadoEm: new Date().toISOString() };
  salvarEstado(estado);
  console.log(`✓ ${it.slug.padEnd(42)} → ${opc.agora ? 'publicando agora' : res.post.dueAt}`);
  return true;
}

(async () => {
  const cmd = process.argv[2] || 'status';
  const { org, canal } = await contexto();
  const fila = await naFila(org, canal.id);
  const estado = lerEstado();
  if (cmd === 'status') {
    console.log(`canal: ${canal.name} (${canal.service}) · na fila: ${fila.length}/${FILA_MAX}`);
    fila.forEach(p => console.log(`  ${p.dueAt}  ${String(p.text || '').split('\n')[0].slice(0, 70)}`));
    return;
  }
  const grade = V.grade();
  if (cmd === 'agenda') {
    const it = grade.find(x => x.slug === process.argv[3]);
    if (!it) throw new Error('slug não está em nenhum lote');
    const iQ = process.argv.indexOf('--quando');
    await agenda(it, canal, estado, { agora: process.argv.includes('--agora'), quando: iQ > -1 ? process.argv[iQ + 1] : null });
    return;
  }
  if (cmd === 'completa') {
    let falta = FILA_MAX - fila.length;
    console.log(`na fila: ${fila.length} · faltam ${Math.max(0, falta)}`);
    const agora = new Date(Date.now() + 10 * 60e3).toISOString();
    for (const it of grade) {
      if (falta <= 0) break;
      if (!V.vaiProTikTok(it) || estado[it.slug] || horario(it) <= agora) continue;
      if (await agenda(it, canal, estado)) falta--;
    }
    if (falta > 0) console.log(`⚠️ faltaram ${falta} vídeos prontos na grade para encher a fila`);
  }
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
