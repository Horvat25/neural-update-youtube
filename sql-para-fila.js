'use strict';
/**
 * sql-para-fila.js — converte o INSERT gerado pro Supabase da Lovable numa
 * fila.json simples, pro publicador do GitHub Actions.
 *
 * POR QUE: em 10/ago/2026 o banco que guardava a fila do Instagram saiu do ar e
 * levou junto o cron que publicava. A fila não pode morar num serviço que
 * terceiro pausa — agora ela é um arquivo versionado no repositório.
 *
 *   node sql-para-fila.js insta-lote-ago.sql <fila.json> [AAAA-MM-DD de corte]
 */
const fs = require('fs');

const [, , SQL, OUT, CORTE] = process.argv;
if (!SQL || !OUT) { console.error('uso: node sql-para-fila.js <arquivo.sql> <fila.json> [corte]'); process.exit(1); }

const txt = fs.readFileSync(SQL, 'utf8');
const i = txt.indexOf('VALUES');
if (i < 0) { console.error('não achei o VALUES'); process.exit(1); }

// Tokenizador: anda caractere a caractere respeitando string SQL ('' = aspa
// escapada). Regex não serve porque as legendas têm parênteses e quebra de linha.
const corpo = txt.slice(i + 6);
const tuplas = [];
let prof = 0, atual = '', dentro = false;
for (let p = 0; p < corpo.length; p++) {
  const ch = corpo[p];
  if (dentro) {
    if (ch === "'" && corpo[p + 1] === "'") { atual += "''"; p++; continue; }
    if (ch === "'") dentro = false;
    atual += ch;
    continue;
  }
  if (ch === "'") { dentro = true; atual += ch; continue; }
  if (ch === '(') { prof++; if (prof === 1) { atual = ''; continue; } }
  if (ch === ')') { prof--; if (prof === 0) { tuplas.push(atual); continue; } }
  if (prof > 0) atual += ch;
}

// Quebra a tupla nas vírgulas de topo (fora de string e fora de parênteses)
function campos(t) {
  const out = []; let cur = '', d = 0, s = false;
  for (let p = 0; p < t.length; p++) {
    const ch = t[p];
    if (s) {
      if (ch === "'" && t[p + 1] === "'") { cur += "'"; p++; continue; }
      if (ch === "'") { s = false; continue; }
      cur += ch; continue;
    }
    if (ch === "'") { s = true; continue; }
    if (ch === '(' || ch === '[') d++;
    if (ch === ')' || ch === ']') d--;
    if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

// ordem das colunas do INSERT: caption, video_url, media_type, status,
// scheduled_for, platforms, post_type, overlay_metadata, workspace_id, user_id
const itens = [];
for (const t of tuplas) {
  const c = campos(t);
  if (c.length < 5) continue;
  const [caption, video, tipo, , quando] = c;
  if (!/^https?:\/\//.test(video)) continue;
  const iso = quando.replace(/::timestamptz$/, '').trim();
  if (CORTE && iso.slice(0, 10) < CORTE) continue;
  itens.push({
    quando: iso,
    tipo: tipo === 'reels' ? 'reels' : tipo,
    midia: video,
    legenda: caption,
    status: 'agendado',
  });
}

itens.sort((a, b) => (a.quando < b.quando ? -1 : 1));
fs.writeFileSync(OUT, JSON.stringify(itens, null, 2) + '\n', 'utf8');
console.log(`${itens.length} item(ns) -> ${OUT}`);
for (const it of itens) {
  const d = new Date(it.quando);
  console.log(`  ${it.quando.slice(0, 10)} ${String(d.getUTCHours() - 3).padStart(2, '0')}h BRT  ${it.legenda.slice(0, 52).replace(/\n/g, ' ')}…`);
}
