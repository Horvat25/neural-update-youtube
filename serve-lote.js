'use strict';
// serve-lote.js — servidor estático mínimo com CORS pro tiktok-lote (porta 8090).
// Permite que a página do TikTok Studio (via fetch no navegador) leia os mp4 locais
// pra injeção direta no input de upload — sem janela de arquivo do Windows.
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'tiktok-lote');
http.createServer((req, res) => {
  const name = decodeURIComponent((req.url || '/').slice(1).split('?')[0]);
  const file = path.join(DIR, path.basename(name)); // basename = sem traversal
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Private Network Access (Chrome): página https só acessa 127.0.0.1 se o
  // preflight for respondido com este header.
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (!name || !fs.existsSync(file) || !name.endsWith('.mp4')) { res.writeHead(404); res.end('nope'); return; }
  const stat = fs.statSync(file);
  res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': stat.size });
  fs.createReadStream(file).pipe(res);
}).listen(8090, '127.0.0.1', () => console.log('serve-lote em http://127.0.0.1:8090'));
