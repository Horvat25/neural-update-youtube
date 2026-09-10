'use strict';
/**
 * cue-check.js — valida as DEIXAS (cues.txt) contra o TTS ANTES de gastar crédito de imagem.
 *
 * Nasceu de um erro real (06/08/2026): montei dois vídeos, o piso de 3,5s absorveu cenas e só
 * então descobri que as deixas estavam a 2-3s uma da outra — depois de já ter gerado as imagens.
 * Este script roda o TTS (grátis), acha cada deixa e mostra a duração que cada cena TERIA.
 * Assim a gente corrige o cues.txt antes de gerar 1 crédito sequer.
 *
 * Uso:
 *   node cue-check.js <slug> [slug2 ...]     valida pastas de exports/
 *   node cue-check.js --all-pendentes        valida toda pasta que tenha cues.txt e nenhum .mp4
 *   node cue-check.js <slug> --timeline      imprime a linha do tempo palavra a palavra
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { generateTTSWithTimings } = require('./tts');

const MIN = parseFloat(process.env.MIN_SCENE_S || '3.5');
const STOP = parseInt(process.env.STOP_MS || '500', 10) / 1000;
const EXPORTS = path.join(__dirname, 'exports');
const TMP = path.join(require('os').tmpdir(), 'cue-check');
fs.mkdirSync(TMP, { recursive: true });

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

async function check(slug, showTimeline) {
  const dir = path.join(EXPORTS, slug);
  const rot = path.join(dir, 'roteiro.txt');
  const cue = path.join(dir, 'cues.txt');
  if (!fs.existsSync(rot)) return console.log(`\n❌ ${slug}: sem roteiro.txt`);
  if (!fs.existsSync(cue)) return console.log(`\n❌ ${slug}: sem cues.txt`);

  const txt = fs.readFileSync(rot, 'utf8').trim();
  const r = await generateTTSWithTimings(txt, path.join(TMP, slug + '.mp3'), process.env.SHORTS_VOICE || 'male');
  const words = (r.words || []).map(w => ({ t: w.text, s: +(w.start + STOP).toFixed(2) }));
  const fim = +(words[words.length - 1].s + 0.8).toFixed(2);
  const cues = fs.readFileSync(cue, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  const imgs = fs.readdirSync(dir).filter(f => /^img\d+\.(png|jpg|jpeg|webp)$/i.test(f)).length;

  if (showTimeline) {
    let line = '';
    words.forEach((w, i) => { line += `${w.t}[${w.s}] `; if ((i + 1) % 8 === 0) { console.log('   ' + line); line = ''; } });
    if (line) console.log('   ' + line);
  }

  const wn = words.map(w => norm(w.t));
  const starts = []; let from = 0; let erro = null;
  for (const c of cues) {
    const cw = c.split(/\s+/).map(norm).filter(Boolean);
    let f = -1;
    for (let i = from; i <= wn.length - cw.length; i++) {
      if (cw.every((x, k) => wn[i + k] === x || wn[i + k].startsWith(x))) { f = i; break; }
    }
    if (f === -1) { erro = `deixa não encontrada (ou fora de ordem): "${c}"`; break; }
    starts.push(words[f].s); from = f + 1;
  }

  console.log(`\n── ${slug}  (${fim}s · ${cues.length} deixas · ${imgs} imagens na pasta)`);
  if (erro) return console.log(`   ❌ ${erro}`);
  if (imgs && imgs !== cues.length) console.log(`   ⚠️  ${cues.length} deixas × ${imgs} imagens — tem que bater`);

  starts[0] = 0;
  const durs = starts.map((s, i) => +(((i === starts.length - 1) ? fim : starts[i + 1]) - s).toFixed(2));
  let ruins = 0;
  durs.forEach((d, i) => {
    const flag = d < MIN ? '  ❌ CURTA' : (d > 9 ? '  ⚠️ longa' : '');
    if (d < MIN) ruins++;
    console.log(`   ${String(i + 1).padStart(2)}. ${String(d).padStart(6)}s  @${String(starts[i]).padStart(6)}s  ${cues[i].slice(0, 40)}${flag}`);
  });
  console.log(ruins
    ? `   ❌ ${ruins} cena(s) abaixo de ${MIN}s — o build vai ABSORVER e você perde imagem. Ajuste antes de gerar.`
    : `   ✅ todas ≥ ${MIN}s (menor ${Math.min(...durs)}s, maior ${Math.max(...durs)}s)`);
}

(async () => {
  let args = process.argv.slice(2);
  const showTimeline = args.includes('--timeline');
  args = args.filter(a => a !== '--timeline');
  let slugs = args;
  if (!slugs.length || slugs[0] === '--all-pendentes') {
    slugs = fs.readdirSync(EXPORTS).filter(s => {
      const d = path.join(EXPORTS, s);
      try {
        return fs.statSync(d).isDirectory() && fs.existsSync(path.join(d, 'cues.txt'))
          && !fs.readdirSync(d).some(f => f.endsWith('.mp4'));
      } catch { return false; }
    });
    console.log(`Pendentes com cues.txt e sem mp4: ${slugs.length}`);
  }
  for (const s of slugs) await check(s, showTimeline);
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
