'use strict';
/**
 * cmp-yt-ig.js — alinha YouTube × Instagram dia a dia e mostra o que ficou pra trás.
 *
 * POR QUE: o Instagram espelha o YouTube (mesmo vídeo, mesmos horários). Quando o
 * publicador cai, a diferença aparece como buraco — e só se enxerga colocando os
 * dois lados lado a lado. Foi assim que descobrimos os 5 posts perdidos de 10-12/ago.
 *
 *   IG_TOKEN=... node cmp-yt-ig.js [dias]
 */
require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const DIAS = parseInt(process.argv[2] || '14', 10);
const IG_ID = '17841478894893058';
const TOKEN = process.env.IG_TOKEN;
if (!TOKEN) { console.error('falta IG_TOKEN'); process.exit(1); }

const BRT = ms => new Date(ms - 3 * 3600e3);           // o PC roda em UTC
const dia = d => d.toISOString().slice(0, 10);
const hora = d => String(d.getUTCHours()).padStart(2, '0') + 'h';

(async () => {
  // ---- YouTube
  const tok = JSON.parse(fs.readFileSync(path.join(__dirname, '.yt-tokens.json'), 'utf8'));
  const oauth = new google.auth.OAuth2(process.env.YT_CLIENT_ID, process.env.YT_CLIENT_SECRET);
  oauth.setCredentials(tok);
  const yt = google.youtube({ version: 'v3', auth: oauth });

  const busca = await yt.search.list({ part: 'id', forMine: true, type: 'video', maxResults: 50, order: 'date' });
  const ids = busca.data.items.map(i => i.id.videoId);
  const det = await yt.videos.list({ part: 'snippet,status', id: ids.join(',') });

  const ytPosts = det.data.items.map(v => {
    const quando = v.status.publishAt || v.snippet.publishedAt;
    return { ms: new Date(quando).getTime(), titulo: v.snippet.title, agendado: !!v.status.publishAt };
  });

  // ---- Instagram
  const u = new URL(`https://graph.facebook.com/v21.0/${IG_ID}/media`);
  u.searchParams.set('fields', 'timestamp,caption');
  u.searchParams.set('limit', '60');
  u.searchParams.set('access_token', TOKEN);
  const r = await (await fetch(u)).json();
  if (r.error) { console.error('Instagram:', r.error.message); process.exit(1); }
  const igPosts = (r.data || []).map(p => ({ ms: new Date(p.timestamp).getTime(), cap: (p.caption || '').replace(/\n/g, ' ') }));

  // ---- alinha por dia+slot (o Instagram espelha o horário do YouTube)
  const corte = Date.now() - DIAS * 86400e3;
  const chaves = new Set();
  const idx = {};
  for (const v of ytPosts) {
    if (v.ms < corte) continue;
    const d = BRT(v.ms); const k = dia(d) + ' ' + hora(d);
    chaves.add(k); (idx[k] ||= {}).yt = v;
  }
  for (const p of igPosts) {
    if (p.ms < corte) continue;
    const d = BRT(p.ms); const k = dia(d) + ' ' + hora(d);
    chaves.add(k); (idx[k] ||= {}).ig = p;
  }

  const ordem = [...chaves].sort();
  let faltaIG = 0, faltaYT = 0, ok = 0;
  console.log(`\n${'DIA/HORA (BRT)'.padEnd(16)} ${'YOUTUBE'.padEnd(46)} INSTAGRAM`);
  console.log('-'.repeat(110));
  let diaAnt = '';
  for (const k of ordem) {
    const e = idx[k];
    const d = k.slice(0, 10);
    if (diaAnt && diaAnt !== d) console.log('');
    diaAnt = d;
    const marca = e.yt && e.ig ? '  ' : e.yt ? '⚠ ' : '± ';
    if (e.yt && e.ig) ok++; else if (e.yt) faltaIG++; else faltaYT++;
    const t = e.yt ? (e.yt.titulo.slice(0, 44) + (e.yt.agendado ? ' ⏳' : '')) : '—';
    const i = e.ig ? e.ig.cap.slice(0, 44) : '❌ NAO SAIU';
    console.log(`${marca}${k.padEnd(14)} ${t.padEnd(46)} ${i}`);
  }
  console.log('-'.repeat(110));
  console.log(`${ok} pareados · ${faltaIG} no YouTube SEM Instagram · ${faltaYT} no Instagram sem YouTube`);
  console.log('⏳ = ainda agendado no YouTube (não publicado)');
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
