'use strict';
/**
 * valida-cartelas.js — confere, DE GRAÇA, se toda deixa de cartelas.txt existe
 * mesmo na fala, antes de gastar 20 minutos montando o vídeo.
 *
 * POR QUE: uma cartela que não dispara não dá erro — o vídeo sai inteiro, só que
 * com o capítulo errado na tela. Descobrir isso depois do render custa o render
 * todo. Aqui o TTS é o mesmo, e é grátis.
 *
 *   node valida-cartelas.js <slug> [slug2 ...]
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { generateTTSWithTimings } = require('./tts');

const normN = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

(async () => {
  let ruim = 0;
  for (const slug of process.argv.slice(2)) {
    const dir = path.join(__dirname, 'exports', slug);
    const cart = path.join(dir, 'cartelas.txt');
    if (!fs.existsSync(cart)) { console.log(`${slug}: sem cartelas.txt`); continue; }

    const { words } = await generateTTSWithTimings(
      fs.readFileSync(path.join(dir, 'roteiro.txt'), 'utf8').trim(),
      path.join(require('os').tmpdir(), `valida-${slug}.mp3`),
      process.env.SHORTS_VOICE || 'male');

    // mesma busca do make-longo: texto contínuo, imune a token colado pelo TTS
    const wn = words.map(w => normN(w.text));
    const mapa = []; let blob = '';
    wn.forEach((w, i) => { for (const c of w) { blob += c; mapa.push(i); } });
    const ini = []; { let v = -1; mapa.forEach((p, c) => { if (p !== v) { ini[p] = c; v = p; } }); }

    console.log(`\n=== ${slug} (${(words[words.length - 1].end / 60).toFixed(1)} min) ===`);
    let from = 0;
    for (const l of fs.readFileSync(cart, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)) {
      const i = l.indexOf('=');
      const deixa = l.slice(0, i).trim();
      const alvo = deixa.split(/\s+/).map(normN).join('');
      let de = 0;
      for (let p = from; p < wn.length; p++) if (ini[p] !== undefined) { de = ini[p]; break; }
      const achou = blob.indexOf(alvo, de);
      if (achou < 0) { console.log(`  ✗ NÃO ACHOU: "${deixa}"`); ruim++; continue; }
      const w = mapa[achou];
      from = w + 1;
      const t = words[w].start;
      console.log(`  ✓ ${String(Math.floor(t / 60)).padStart(2)}:${String(Math.floor(t % 60)).padStart(2, '0')}  ${l.slice(i + 1).trim()}`);
    }
  }
  if (ruim) { console.log(`\n${ruim} deixa(s) sem par na fala — CORRIGIR antes de montar`); process.exit(1); }
  console.log('\ntodas as cartelas casaram');
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
