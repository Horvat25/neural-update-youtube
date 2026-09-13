'use strict';
/**
 * carrossel/poe-na-fila.js — junta carrossel/saida/_novos-fila.json na fila do Insta.
 *
 *   node carrossel/poe-na-fila.js <worktree-limpo-do-origin>/publicador/fila.json
 *
 * Rodar SEMPRE num worktree recém-resetado pro origin/main (a fila do GitHub é a autoridade;
 * push de cópia velha já republicou post). Não duplica: pula item com o mesmo slug e recusa
 * dois posts de FEED no mesmo horário (story no mesmo horário não conflita).
 */
const fs = require('fs');
const path = require('path');

const destino = process.argv[2];
if (!destino) { console.error('uso: node carrossel/poe-na-fila.js <.../publicador/fila.json>'); process.exit(1); }
const bruto = fs.readFileSync(destino, 'utf8');
const fila = JSON.parse(bruto);
const novos = JSON.parse(fs.readFileSync(path.join(__dirname, 'saida', '_novos-fila.json'), 'utf8'));
const FEED = new Set(['reels', 'video', 'post', 'carrossel']);

let entrou = 0;
for (const n of novos) {
  if (fila.some(i => i.slug === n.slug)) { console.log(`· ${n.slug} já está na fila`); continue; }
  const choque = fila.find(i => i.quando === n.quando && FEED.has(i.tipo) && !['perdido', 'cancelado'].includes(i.status));
  if (choque) throw new Error(`${n.slug}: o horário ${n.quando} já tem o post de feed ${choque.slug}`);
  fila.push(n);
  entrou++;
  console.log(`+ ${n.quando} ${n.tipo} ${n.slug}`);
}
fila.sort((a, b) => new Date(a.quando) - new Date(b.quando));
fs.writeFileSync(destino, JSON.stringify(fila, null, 2) + (bruto.endsWith('\n') ? '\n' : ''));
console.log(`${entrou} item(ns) novo(s) na fila (${fila.length} no total)`);
