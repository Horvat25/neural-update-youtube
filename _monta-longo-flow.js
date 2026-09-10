'use strict';
/**
 * _monta-longo-flow.js — monta um vídeo LONGO 16:9 a partir dos clipes verticais do Google Flow.
 *
 * POR QUE EXISTE: o `_monta-flow.js` entrega Short 9:16 e o `make-longo.js` só aceita imagem
 * estática. Este junta os dois mundos: clipe de vídeo do Flow, saída 1920x1080.
 *
 * Os clipes do Flow são 9:16. Em vez de centralizar com barra borrada (a autópsia dos longos
 * chama isso de "cara de amador"), aqui o clipe é CORTADO no centro para 16:9 — testado em
 * 28/08 e o enquadramento fica mais cinematográfico, porque o sujeito já vem centralizado.
 *
 * Entrada em exports/<slug>/:
 *   roteiro.txt     — blocos separados por linha em branco
 *   cenas.txt       — 1 linha por bloco, no formato <grupo>/<clipe> (ver MAPA abaixo)
 *   _longo_narr.mp3 — narração
 *   _words.json     — timings palavra a palavra (gerado pelo _narra-longo.js)
 *
 *   node _monta-longo-flow.js <slug>
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('./node_modules/ffmpeg-static');

const slug = process.argv[2];
if (!slug) { console.error('uso: node _monta-longo-flow.js <slug>'); process.exit(1); }
const dir = path.join('exports', slug);

// De onde vem cada grupo de clipe. Mantém cenas.txt legível ("pl34/cena2") em vez de caminho cru.
const MAPA = {
  pl33: 'exports/pl33-nucleossintese-estelar',
  pl34: 'exports/pl34-diagrama-hr',
  pl27: 'exports/pl27-espaco-tempo',
  roman: 'exports/roman-telescope-lancamento',
  portal: 'exports/portal-buraco-de-minhoca',
  sagi: 'exports/sagitario-a-star',
};

function dur(f) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', f], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) : 0;
}

const narr = path.join(dir, '_longo_narr.mp3');
const durNarr = dur(narr);
const ALVO = durNarr + 1.5;                    // respiro no fim

const blocos = fs.readFileSync(path.join(dir, 'roteiro.txt'), 'utf8').trim().split(/\n\n+/);
const linhas = fs.readFileSync(path.join(dir, 'cenas.txt'), 'utf8').trim().split(/\r?\n/).filter(Boolean);
if (linhas.length !== blocos.length) {
  console.error(`✗ cenas.txt tem ${linhas.length} linhas para ${blocos.length} blocos — precisa ser 1:1`);
  process.exit(1);
}

// Blocos de tensão que pedem movimento mais forte (opcional).
const fClimax = path.join(dir, 'climax.txt');
const CLIMAX = new Set(fs.existsSync(fClimax)
  ? fs.readFileSync(fClimax, 'utf8').split(/\r?\n/).map(n => parseInt(n, 10)).filter(n => !isNaN(n))
  : []);
if (CLIMAX.size) console.log(`clímax: ${CLIMAX.size} bloco(s) com movimento acentuado`);

const clipes = linhas.map(l => {
  const [g, c] = l.trim().split('/');
  const f = path.join(MAPA[g] || g, c + '.mp4');
  if (!fs.existsSync(f)) { console.error(`✗ clipe não existe: ${l} → ${f}`); process.exit(1); }
  return f;
});

// ── onde cada bloco começa na narração ──────────────────────────────────────
// Usa os timings reais do TTS: conta as palavras acumuladas de cada bloco e lê
// o start da primeira palavra dele. Sem isso a imagem troca no relógio, não no assunto.
const words = JSON.parse(fs.readFileSync(path.join(dir, '_words.json'), 'utf8'));
let acc = 0;
const inicio = blocos.map(b => {
  const t = words[acc] ? words[acc].start : null;
  acc += b.split(/\s+/).filter(Boolean).length;
  return t;
});
if (inicio.some(t => t === null)) { console.error('✗ timings não cobrem todos os blocos'); process.exit(1); }

const durAlvo = inicio.map((t0, i) => {
  const t1 = (i + 1 < inicio.length) ? inicio[i + 1] : ALVO;
  return +(t1 - t0).toFixed(3);
});

console.log(`narração ${durNarr.toFixed(1)}s · ${blocos.length} blocos · ${clipes.length} clipes`);
const curtos = durAlvo.filter(d => d < 1.5).length;
if (curtos) console.log(`  ⚠️ ${curtos} bloco(s) abaixo de 1,5s — troca de imagem rápida`);

// ── 1. normalizar cada clipe para 1920x1080, cortado no centro ──────────────
const tmp = [];
clipes.forEach((c, i) => {
  const o = path.join(dir, `_n${String(i).padStart(2, '0')}.mp4`);
  const dOrig = dur(c);
  const dQuero = durAlvo[i];
  const args = ['-v', 'error', '-y'];
  let f = 1;
  if (dQuero < dOrig - 0.05) {
    args.push('-t', dQuero.toFixed(3), '-i', c);              // corta o fim
  } else {
    f = Math.min(dQuero / dOrig, 1.6);                        // estica devagar (longo aguenta mais)
    args.push('-i', c);
  }
  // Se nem esticando 1,6x o clipe cobre o bloco, o resto vira quadro congelado (tpad).
  // Sem isso o vídeo terminava mais curto que a narração e a fala ficava sobrando no escuro.
  const falta = dQuero - dOrig * f;
  const congela = falta > 0.05 ? `,tpad=stop_mode=clone:stop_duration=${(falta + 0.3).toFixed(3)}` : '';

  // KINETIC PACING (28/08). O Marcelo assistiu a v1 e disse: "o flow tá top mas tá morto".
  // A regra profissional é trocar algo visual a cada 5-7s e NUNCA deixar quadro parado —
  // "movimento indica que algo está acontecendo". Aqui cada plano ganha um zoom lento
  // contínuo, alternando push-in e pull-out para o ritmo não ficar repetitivo.
  // O crop é feito MAIOR que 16:9 e o zoom passeia dentro dessa sobra, então não perde nitidez.
  // CLÍMAX (28/08): nos blocos de tensão o zoom é mais agressivo e mais rápido, para o
  // ritmo do vídeo reagir ao que está sendo narrado. Fora deles o movimento é sutil.
  // Os blocos vêm de `climax.txt` (1 número por linha, 1-indexado).
  const empurra = i % 2 === 0;                          // alterna aproxima / afasta
  const forte = CLIMAX.has(i + 1);
  const amp = forte ? 0.26 : 0.10;
  const z0 = empurra ? 1.0 : 1 + amp, z1 = empurra ? 1 + amp : 1.0;
  const frames = Math.max(2, Math.round(dQuero * 24));
  const zoom = `,zoompan=z='${z0}+(${(z1 - z0).toFixed(4)})*on/${frames}':d=1` +
    `:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=24`;

  // crop central 16:9 do vertical, depois escala para 1920x1080 (+10% de sobra para o zoom)
  const vf = (f !== 1 ? `setpts=${f.toFixed(6)}*PTS,` : '') +
    'crop=iw:iw*9/16,scale=2112:1188:flags=lanczos,setsar=1,fps=24' + congela + zoom;

  // SOM DOS OBJETOS (28/08). Todo clipe do Flow vem com áudio ambiente próprio — explosão,
  // zumbido, vento — e a v1 jogava tudo fora com "-an". Pedido do Marcelo: manter esse som
  // junto da trilha, "pra deixar o vídeo mais interativo".
  // O áudio fica em VELOCIDADE NORMAL mesmo quando o vídeo estica (regra do playbook: esticar
  // deforma efeito e música); o que falta é preenchido com silêncio pelo apad.
  const af = `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,apad`;
  args.push('-vf', vf, '-af', af, '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2');
  args.push('-t', dQuero.toFixed(3));
  args.push(o);
  const r = spawnSync(ffmpeg, args, { encoding: 'utf8' });
  if (r.status !== 0) { console.error(`✗ normalizar ${c}: ${(r.stderr || '').slice(-300)}`); process.exit(1); }
  tmp.push(o);
});
console.log('  ✓ clipes normalizados para 1920x1080 @24fps (crop central 16:9)');

// ── 2. concatenar ───────────────────────────────────────────────────────────
const lista = path.join(dir, '_lista.txt');
fs.writeFileSync(lista, tmp.map(f => `file '${path.resolve(f).replace(/\\/g, '/')}'`).join('\n'), 'utf8');
const mudo = path.join(dir, '_mudo.mp4');
let r = spawnSync(ffmpeg, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista,
  '-c', 'copy', mudo], { encoding: 'utf8' });
if (r.status !== 0) { console.error('✗ concat: ' + (r.stderr || '').slice(-400)); process.exit(1); }
console.log(`  ✓ concatenado: ${dur(mudo).toFixed(2)}s`);

module.exports = {};
console.log(`\n✓ base montada: ${mudo}`);
