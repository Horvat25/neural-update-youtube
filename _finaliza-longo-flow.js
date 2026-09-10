'use strict';
/**
 * _finaliza-longo-flow.js — pega a base muda do `_monta-longo-flow.js` e entrega o vídeo final:
 * narração + trilha duckada + legenda + marca do canal + loudnorm.
 *
 * Os parâmetros de legenda são os mesmos do `make-longo.js` (52px, margem 70, 3 palavras),
 * já calibrados para 1920x1080 — não reinventar aqui.
 *
 *   node _finaliza-longo-flow.js <slug>
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('./node_modules/ffmpeg-static');
const { buildAss } = require('./ass-captions');

const slug = process.argv[2];
if (!slug) { console.error('uso: node _finaliza-longo-flow.js <slug>'); process.exit(1); }
const dir = path.join('exports', slug);
const TRILHA = process.env.TRILHA || 'dark-some-amount-of-evil.mp3';

function dur(f) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', f], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) : 0;
}

const mudo = path.join(dir, '_mudo.mp4');
const narr = path.join(dir, '_longo_narr.mp3');
const out = path.join(dir, `${slug}.mp4`);
for (const f of [mudo, narr]) if (!fs.existsSync(f)) { console.error('✗ falta ' + f); process.exit(1); }

// ── legenda ─────────────────────────────────────────────────────────────────
const words = JSON.parse(fs.readFileSync(path.join(dir, '_words.json'), 'utf8'));
const ass = path.join(dir, '_longo_caps.ass');
fs.writeFileSync(ass, buildAss(words, {
  width: 1920, height: 1080, fontSize: 52, marginV: 70, outline: 4, shadow: 2, group: 3,
}), 'utf8');
console.log('  ✓ legenda gerada');

// ── trilha ──────────────────────────────────────────────────────────────────
let trilha = null;
for (const base of ['assets/music-real', 'assets/music']) {
  const p = path.join(base, TRILHA);
  if (fs.existsSync(p)) { trilha = p; break; }
}
if (!trilha) console.log(`  ⚠️ trilha "${TRILHA}" não encontrada — vídeo sai só com narração`);
else console.log(`  ✓ trilha: ${trilha}`);

const total = dur(mudo);
// Mesma fonte do make-longo. Caminho do Windows precisa do escape "C\:/" — sem ele
// o drawtext falha em silêncio e cai numa fonte serifada.
const FONT = 'C\\:/Windows/Fonts/arialbd.ttf';

const args = ['-v', 'error', '-y', '-i', mudo, '-i', narr];
if (trilha) args.push('-stream_loop', '-1', '-i', trilha);

const assPath = path.resolve(ass).replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:');
const marca = `drawtext=fontfile='${FONT}':text='NEURAL UPDATE':fontsize=30:fontcolor=white@0.55` +
  `:x=w-text_w-46:y=44:shadowcolor=black@0.7:shadowx=2:shadowy=2`;

// Marcas de tempo calculadas a partir dos timings reais da narração (_marcas.json).
// CTA: a pesquisa de retenção diz que pedido FALADO + elemento NA TELA converte muito mais
// que só falado, e que o melhor lugar é logo depois do pico de valor — não no fim.
// BORDÃO: a vinheta oficial é 9:16 e o playbook proíbe recortá-la, então o fecho de marca
// do longo 16:9 é feito aqui, em texto, sobre o último plano.
let extras = '';

// ── CARTELAS DE CAPÍTULO (28/08) ────────────────────────────────────────────
// "01 · NOME · de 6". O molde do canal pede isso desde 21/08 e nunca tinha sido usado.
// Saber quanto falta segura o espectador — e a primeira cartela cai por volta dos 30s,
// que é justamente a zona de sangria, funcionando também como pattern interrupt.
const fCart = path.join(dir, '_cartelas.json');
if (fs.existsSync(fCart)) {
  const cart = JSON.parse(fs.readFileSync(fCart, 'utf8'));
  const DUR = 3.6, FADE = 0.45;
  for (const c of cart) {
    const t0 = c.t, t1 = c.t + DUR;
    // alpha sobe, segura, desce — sem isso a cartela "pisca" e parece erro
    const a = `if(lt(t,${(t0 + FADE).toFixed(2)}),(t-${t0.toFixed(2)})/${FADE}` +
      `,if(lt(t,${(t1 - FADE).toFixed(2)}),1,(${t1.toFixed(2)}-t)/${FADE}))`;
    const on = `between(t,${t0.toFixed(2)},${t1.toFixed(2)})`;
    extras +=
      `,drawtext=fontfile='${FONT}':text='${c.n}':fontsize=132:fontcolor=white:alpha='${a}'` +
      `:x=140:y=h*0.34:shadowcolor=black@0.85:shadowx=4:shadowy=4:enable='${on}'` +
      `,drawtext=fontfile='${FONT}':text='${c.nome}':fontsize=46:fontcolor=white:alpha='${a}'` +
      `:x=310:y=h*0.38:shadowcolor=black@0.85:shadowx=3:shadowy=3:enable='${on}'` +
      `,drawtext=fontfile='${FONT}':text='de ${cart.length}':fontsize=26:fontcolor=white@0.7:alpha='${a}'` +
      `:x=312:y=h*0.46:shadowcolor=black@0.8:shadowx=2:shadowy=2:enable='${on}'`;
  }
}

// ── FLASH DA SUPERNOVA ──────────────────────────────────────────────────────
// A estrela explode e a tela estoura junto. Dois quadros brancos e um rastro curto:
// é o momento mais violento do roteiro e o vídeo precisa reagir a ele.
const fClimax = path.join(dir, '_climax.json');
if (fs.existsSync(fClimax)) {
  const s = JSON.parse(fs.readFileSync(fClimax, 'utf8')).supernova;
  extras +=
    `,drawbox=x=0:y=0:w=iw:h=ih:color=white@0.92:t=fill:enable='between(t,${s.toFixed(2)},${(s + 0.10).toFixed(2)})'` +
    `,drawbox=x=0:y=0:w=iw:h=ih:color=white@0.45:t=fill:enable='between(t,${(s + 0.10).toFixed(2)},${(s + 0.22).toFixed(2)})'` +
    `,drawbox=x=0:y=0:w=iw:h=ih:color=white@0.18:t=fill:enable='between(t,${(s + 0.22).toFixed(2)},${(s + 0.40).toFixed(2)})'`;
}

const fMarcas = path.join(dir, '_marcas.json');
if (fs.existsSync(fMarcas)) {
  const m = JSON.parse(fs.readFileSync(fMarcas, 'utf8'));
  const cta0 = m.cta.toFixed(2), cta1 = (m.cta + 7).toFixed(2);
  extras +=
    // sem emoji: a Arial não tem glifo de emoji e o drawtext desenha um quadrado vazio
    `,drawtext=fontfile='${FONT}':text='COMENTA AÍ':fontsize=54:fontcolor=white` +
    `:box=1:boxcolor=black@0.55:boxborderw=22:x=(w-text_w)/2:y=h*0.16` +
    `:shadowcolor=black@0.8:shadowx=3:shadowy=3:enable='between(t,${cta0},${cta1})'`;
  const b0 = m.bordao.toFixed(2), b1 = (m.fim + 2.2).toFixed(2);
  extras +=
    `,drawtext=fontfile='${FONT}':text='NEURAL UPDATE':fontsize=104:fontcolor=white` +
    `:x=(w-text_w)/2:y=h/2-90:shadowcolor=black@0.85:shadowx=4:shadowy=4` +
    `:enable='between(t,${b0},${b1})'` +
    `,drawtext=fontfile='${FONT}':text='O universo está te esperando':fontsize=44:fontcolor=white@0.85` +
    `:x=(w-text_w)/2:y=h/2+40:shadowcolor=black@0.85:shadowx=3:shadowy=3` +
    `:enable='between(t,${b0},${b1})'`;
}

let filtro;
if (trilha) {
  // sidechaincompress: a trilha abaixa sozinha quando a narração entra.
  // asplit é obrigatório: a voz é consumida DUAS vezes (como sidechain e no amix) e
  // um label de saída do ffmpeg só pode ser lido uma vez.
  // TRÊS CAMADAS DE SOM (28/08). A v1 tinha só voz + trilha em volume 0.16 com ratio 9 —
  // tecnicamente correta e emocionalmente morta. Agora:
  //   1. VOZ      — sempre na frente, é ela que carrega a informação
  //   2. EFEITOS  — o áudio nativo de cada clipe do Flow (explosão, zumbido, vento).
  //                 É o "som dos objetos" que o Marcelo pediu, e estava sendo descartado.
  //   3. TRILHA   — fundo contínuo, volume quase o dobro da v1 e ducking bem mais suave,
  //                 então respira entre as frases em vez de sumir.
  // Voz e efeitos passam pelo mesmo sidechain, então ambos abaixam quando ela fala.
  filtro =
    `[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asplit=3[voz1][voz2][voz3];` +
    `[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=0.34[sfx];` +
    `[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=0.30[mus];` +
    `[sfx][voz1]sidechaincompress=threshold=0.10:ratio=3:attack=20:release=500[sfxd];` +
    `[mus][voz2]sidechaincompress=threshold=0.10:ratio=3.5:attack=25:release=700[musd];` +
    `[voz3][sfxd][musd]amix=inputs=3:duration=first:dropout_transition=0:normalize=0,` +
    `loudnorm=I=-16:TP=-1.5:LRA=11[a];` +
    `[0:v]subtitles='${assPath}',${marca}${extras}[v]`;
} else {
  filtro =
    `[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asplit=2[voz1][voz2];` +
    `[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=0.34[sfx];` +
    `[sfx][voz1]sidechaincompress=threshold=0.10:ratio=3:attack=20:release=500[sfxd];` +
    `[voz2][sfxd]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,` +
    `loudnorm=I=-16:TP=-1.5:LRA=11[a];` +
    `[0:v]subtitles='${assPath}',${marca}${extras}[v]`;
}

args.push('-filter_complex', filtro, '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-t', total.toFixed(2), '-movflags', '+faststart', out);

console.log('  … renderizando (pode levar alguns minutos)');
const r = spawnSync(ffmpeg, args, { encoding: 'utf8' });
if (r.status !== 0) { console.error('✗ render: ' + (r.stderr || '').slice(-700)); process.exit(1); }

const d = dur(out);
console.log(`\n✓ ${out}`);
console.log(`  duração : ${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, '0')}`);
console.log(`  tamanho : ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
