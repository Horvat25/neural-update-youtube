'use strict';
/**
 * append-longo-cta.js — A "MÃOZINHA": aponta o espectador do Short pro vídeo LONGO.
 *
 * O YouTube recomenda 3 coisas pra aumentar o clique no "Vídeo relacionado"
 * (blog.youtube): CTA falado, PISTA VISUAL apontando pro link, e casar a intenção.
 * Canal sem rosto não tem dedo pra apontar → a seta desenhada faz esse papel.
 *
 * ⚠️ DECISÃO DE DESIGN: isto NÃO acrescenta segundos ao vídeo — faz OVERLAY nos
 * últimos segundos. Retenção do Short = 25s ÷ duração; append de 2s num vídeo de
 * 30s derrubaria a retenção de 83% pra 78% de graça. Overlay custa ZERO duração.
 *
 * Uso:
 *   node append-longo-cta.js <entrada.mp4> <thumb-do-longo.jpg> <saida.mp4> [segundos]
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');

const IN = process.argv[2];
const THUMB = process.argv[3];
const OUT = process.argv[4];
const DUR = parseFloat(process.argv[5] || '2.6'); // quanto tempo a mãozinha fica na tela

if (!IN || !THUMB || !OUT) {
  console.error('uso: node append-longo-cta.js <entrada.mp4> <thumb.jpg> <saida.mp4> [segundos]');
  process.exit(1);
}
for (const f of [IN, THUMB]) {
  if (!fs.existsSync(f)) { console.error('nao encontrei:', f); process.exit(1); }
}

function duracao(f) {
  const p = spawnSync(ffmpeg, ['-i', f], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 0;
}

const total = duracao(IN);
if (!total) { console.error('nao consegui ler a duracao de', IN); process.exit(1); }
const inicio = Math.max(0, total - DUR);

// Vídeo é 720x1280. No player do Short o link "Vídeo relacionado" fica logo ABAIXO
// do título, no rodapé. A mãozinha aponta pra lá, mas fica ACIMA da UI do YouTube
// (que come ~200px de baixo) pra não ser encoberta.
const FONT = 'C\\:/Windows/Fonts/arialbd.ttf';
const W_CARD = 260, H_CARD = 146;
const X_CARD = Math.round((720 - W_CARD) / 2);
const Y_TXT = 852;                 // "VÍDEO COMPLETO"
const Y_CARD = 906;                // card com a thumbnail do longo
const Y_SETA = Y_CARD + H_CARD + 8;

// textos em arquivo UTF-8: acento e o "▼" quebram se forem pela linha de comando
const dirTmp = path.dirname(OUT);
const f1 = path.join(dirTmp, '_cta_l1.txt'); fs.writeFileSync(f1, 'VÍDEO COMPLETO', 'utf8');
const f2 = path.join(dirTmp, '_cta_l2.txt'); fs.writeFileSync(f2, '▼', 'utf8');
const esc = p => p.replace(/\\/g, '/').replace(/:/g, '\\:');

const t0 = inicio.toFixed(2);
const filtro = [
  // ⚠️ a imagem estática vira stream pelo `-loop 1 -t` na ENTRADA (ver args abaixo).
  // Sem isso ela só existe em t=0 e o overlay no FIM do vídeo saía VAZIO (só a
  // moldura ciano aparecia). E `loop=-1` no FILTRO trava o encode (stream infinito).
  `[1:v]scale=${W_CARD}:${H_CARD}:force_original_aspect_ratio=increase,crop=${W_CARD}:${H_CARD}[card]`,
  // moldura ciano atrás do card
  `[0:v]drawbox=x=${X_CARD - 5}:y=${Y_CARD - 5}:w=${W_CARD + 10}:h=${H_CARD + 10}:` +
  `color=0x00E5FF@0.95:t=fill:enable='gte(t,${t0})'[base]`,
  `[base][card]overlay=x=${X_CARD}:y=${Y_CARD}:enable='gte(t,${t0})'[comcard]`,
  // título centralizado ACIMA do card (antes vazava pela direita)
  `[comcard]drawtext=fontfile='${FONT}':textfile='${esc(f1)}':fontcolor=white:fontsize=44:` +
  `borderw=6:bordercolor=black:x=(w-text_w)/2:y=${Y_TXT}:enable='gte(t,${t0})'[t1]`,
  // A SETA: triângulo ▼ de verdade (não a letra "v"), PULSANDO.
  // O olho persegue movimento — seta parada num feed vira decoração.
  `[t1]drawtext=fontfile='${FONT}':textfile='${esc(f2)}':fontcolor=0xFFD447:fontsize=86:` +
  `borderw=6:bordercolor=black:x=(w-text_w)/2:y=${Y_SETA}+16*sin(4.2*t):` +
  `enable='gte(t,${t0})'[v]`,
].join(';');

const args = [
  '-hide_banner', '-loglevel', 'error',
  '-i', IN,
  '-loop', '1', '-t', String(total.toFixed(2)), '-i', THUMB, // imagem vira stream com a duracao do video
  '-filter_complex', filtro,
  '-map', '[v]', '-map', '0:a?',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-c:a', 'copy', '-movflags', '+faststart',
  '-y', OUT,
];

console.log(`[maozinha] ${path.basename(IN)}  (${total.toFixed(1)}s)  ->  overlay de ${DUR}s a partir de ${inicio.toFixed(1)}s`);
const r = spawnSync(ffmpeg, args, { stdio: 'inherit', timeout: 300000 });
if (r.status !== 0 || !fs.existsSync(OUT)) { console.error('[maozinha] FALHOU'); process.exit(1); }
const antes = fs.statSync(IN).size, depois = fs.statSync(OUT).size;
console.log(`[maozinha] OK -> ${OUT}  (${(depois / 1e6).toFixed(1)}MB, era ${(antes / 1e6).toFixed(1)}MB)`);
console.log(`[maozinha] duracao preservada: ${duracao(OUT).toFixed(1)}s (nao mexeu na retencao)`);
