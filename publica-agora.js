'use strict';
/**
 * publica-agora.js — publica no Instagram AGORA um ou mais vídeos, por slug.
 *
 * Existe pra soltar backlog: quando a fila automática cai, os vídeos atrasados
 * precisam sair na mão sem esperar o próximo ciclo do agendador.
 *
 * Espaça as publicações (POR_MINUTO) porque despejar tudo de uma vez faz o
 * Instagram tratar como spam e derruba o alcance dos dois.
 *
 *   IG_TOKEN=... node publica-agora.js <slug> [slug2 ...]
 */
const fs = require('fs');
const path = require('path');

const API = 'https://graph.facebook.com/v21.0';
const IG_ID = '17841478894893058';          // @neuralupdate — público, não é segredo
const CONTA = 'neuralupdate';
const ESPACO_MS = 90_000;                    // respiro entre um post e o outro

const TOKEN = process.env.IG_TOKEN;
if (!TOKEN) { console.error('falta IG_TOKEN'); process.exit(1); }

const slugs = process.argv.slice(2);
if (!slugs.length) { console.error('uso: node publica-agora.js <slug> [slug2 ...]'); process.exit(1); }

const dorme = ms => new Promise(r => setTimeout(r, ms));

// legenda + url vêm do mesmo lugar que alimentou a fila: o SQL do lote
function doLote() {
  const txt = fs.readFileSync(path.join(__dirname, 'insta-lote-ago.sql'), 'utf8');
  const dist = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/distribuicao.json'), 'utf8'));
  const porUrl = {};
  for (const [s, v] of Object.entries(dist)) porUrl[v.url] = s;

  const corpo = txt.slice(txt.indexOf('VALUES') + 6);
  const tuplas = []; let prof = 0, atual = '', dentro = false;
  for (let p = 0; p < corpo.length; p++) {
    const ch = corpo[p];
    if (dentro) {
      if (ch === "'" && corpo[p + 1] === "'") { atual += "''"; p++; continue; }
      if (ch === "'") dentro = false;
      atual += ch; continue;
    }
    if (ch === "'") { dentro = true; atual += ch; continue; }
    if (ch === '(') { prof++; if (prof === 1) { atual = ''; continue; } }
    if (ch === ')') { prof--; if (prof === 0) { tuplas.push(atual); continue; } }
    if (prof > 0) atual += ch;
  }
  const mapa = {};
  for (const t of tuplas) {
    const m = t.match(/'((?:[^']|'')*)'\s*,\s*'(https:\/\/[^']+\.mp4)'/);
    if (!m) continue;
    const slug = porUrl[m[2]];
    if (slug) mapa[slug] = { legenda: m[1].replace(/''/g, "'"), url: m[2] };
  }
  return mapa;
}

async function post(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return (await fetch(u, { method: 'POST' })).json();
}

(async () => {
  // trava de conta: nunca publicar o conteúdo do canal na conta de um cliente
  const c = new URL(`${API}/${IG_ID}`);
  c.searchParams.set('fields', 'username');
  c.searchParams.set('access_token', TOKEN);
  const conta = await (await fetch(c)).json();
  if (conta.error) { console.error('token inválido:', conta.error.message); process.exit(1); }
  if (conta.username !== CONTA) { console.error(`ABORTADO: token é de @${conta.username}`); process.exit(1); }
  console.log(`token ok — @${conta.username}\n`);

  const lote = doLote();
  let n = 0;
  for (const slug of slugs) {
    const item = lote[slug];
    if (!item) { console.error(`✗ ${slug}: não achei no lote`); continue; }
    if (n++) { console.log(`   (respiro de ${ESPACO_MS / 1000}s)`); await dorme(ESPACO_MS); }

    process.stdout.write(`${slug} … `);
    try {
      const cria = await post(`${API}/${IG_ID}/media`, {
        video_url: item.url, media_type: 'REELS',
        caption: item.legenda, access_token: TOKEN,
      });
      if (cria.error) throw new Error(cria.error.message);

      let ok = false;
      for (let i = 0; i < 60; i++) {
        await dorme(5000);
        const s = new URL(`${API}/${cria.id}`);
        s.searchParams.set('fields', 'status_code');
        s.searchParams.set('access_token', TOKEN);
        const st = await (await fetch(s)).json();
        if (st.status_code === 'FINISHED') { ok = true; break; }
        if (st.status_code === 'ERROR') throw new Error('processamento falhou');
      }
      if (!ok) throw new Error('tempo esgotado no processamento');

      let pub = await post(`${API}/${IG_ID}/media_publish`, { creation_id: cria.id, access_token: TOKEN });
      if (!pub.id && JSON.stringify(pub).includes('not available')) {
        await dorme(8000);
        pub = await post(`${API}/${IG_ID}/media_publish`, { creation_id: cria.id, access_token: TOKEN });
      }
      if (!pub.id) throw new Error(JSON.stringify(pub));
      console.log(`PUBLICADO (${pub.id})`);
    } catch (e) {
      console.log(`FALHOU — ${e.message}`);
    }
  }
})();
