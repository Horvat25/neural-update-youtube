'use strict';
/**
 * _monta-flow.js — monta um vídeo do canal usando CLIPES DE VÍDEO do Google Flow
 * no lugar das imagens estáticas.
 *
 * POR QUE EXISTE: o `make-short-img-flex.js` é o coração da fábrica, mas só aceita
 * `img1..imgN.png`. Os vídeos do Flow são clipes de 8s. Em vez de mexer no coração
 * (arriscado), este script REUSA o que ele já produziu — `narr.mp3` e `captions.ass`,
 * que ficam salvos em `exports/<slug>/` — e aplica a mesma receita de áudio, legenda
 * e marca por cima dos clipes reais.
 *
 * Fluxo:
 *   1. rode a montagem normal uma vez (com imagens pretas) para gerar narr.mp3 + captions.ass
 *   2. ponha os clipes como exports/<slug>/cena1.mp4 .. cenaN.mp4, na ordem da narração
 *   3. node _monta-flow.js <slug>
 *
 * Ele estica os clipes proporcionalmente para casar com a duração exata da narração,
 * então não há corte seco no fim nem imagem congelada.
 *
 * ⚠️ AULA não leva vinheta de bordão — ela termina no anúncio da próxima aula.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('./node_modules/ffmpeg-static');

const slug = process.argv[2];
if (!slug) { console.error('uso: node _monta-flow.js <slug>'); process.exit(1); }
const dir = path.join('exports', slug);

const narr = path.join(dir, 'narr.mp3');
const ass = path.join(dir, 'captions.ass');
const ptAss = ass;
// 16/09/2026: a trilha vem do meta.json (_prod.track) — a regra é trilha por slot (aula 14h =
// cosmic-ice-flow/ambient). Sem campo, fica a de antes.
let trilhaNome = 'dark-some-amount-of-evil.mp3';
// 26/09/2026: o lote 25–27 gravou a trilha em `track` (raiz), não em `_prod.track` — o buraco negro saiu com a
// default (some-amount) e o TikTok silenciou. Lê os dois campos.
try { const m = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); trilhaNome = m._prod?.track || m.track || trilhaNome; } catch {}
// 17/09/2026: versão do TikTok — lá some-amount/rising-tide saem MUDOS. TRILHA troca só a música e
// SAIDA grava em outro arquivo, sem tocar no .mp4 que já foi pro YouTube/Insta.
if (process.env.TRILHA) trilhaNome = process.env.TRILHA;
const trilha = path.join('assets', 'music-real', trilhaNome);
const logo = path.join('assets', 'brand', 'nu-logo.png');
for (const f of [narr, ass, trilha, logo]) {
  if (!fs.existsSync(f)) { console.error(`✗ falta ${f}`); process.exit(1); }
}

const cenas = fs.readdirSync(dir).filter(f => /^cena\d+\.mp4$/i.test(f))
  .sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
if (!cenas.length) { console.error(`✗ nenhum cenaN.mp4 em ${dir}`); process.exit(1); }
console.log(`${cenas.length} clipe(s): ${cenas.join(', ')}`);

function dur(f) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', f], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
}

const durNarr = dur(narr);
// RESPIRO_EXTRA_S: segundos a mais de imagem+trilha depois da última palavra (24/09: Marcelo pediu +1 s só na Lua).
const ALVO = durNarr + 0.9 + parseFloat(process.env.RESPIRO_EXTRA_S || '0');   // STOP de 500ms antes da fala + respiro no fim

// ---- SINCRONIA IMAGEM x FALA (lei do canal) ----
// Um clipe de 8s não pode trocar no relógio: ele tem que trocar QUANDO a frase troca.
// `cenas.txt` diz qual bloco do roteiro cada clipe cobre (1 linha por clipe, o nº do bloco
// onde ele COMEÇA). Sem esse arquivo, cai no modo antigo de esticar tudo igual.
function temposDosBlocos() {
  // Cada linha de Dialogue do .ass destaca UMA palavra (karaokê), na ordem da fala.
  // Então a n-ésima linha é a n-ésima palavra — dá pra achar o tempo de cada bloco
  // contando palavras, sem depender de casar texto (a legenda agrupa 3 e quebra o match).
  const linhas = fs.readFileSync(ptAss, 'utf8').split(String.fromCharCode(10))
    .filter(l => l.startsWith('Dialogue:'))
    .map(l => {
      const m = l.match(/^Dialogue: \d+,(\d+):(\d+):([\d.]+),/);
      return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : null;
    }).filter(t => t !== null);
  const blocos = fs.readFileSync(path.join(dir, 'roteiro.txt'), 'utf8')
    .split(String.fromCharCode(10) + String.fromCharCode(10))
    .map(b => b.replace(/^>>\s*/, '').trim()).filter(Boolean);
  const out = []; let acc = 0;
  for (const b of blocos) {
    out.push(acc < linhas.length ? linhas[acc] : null);
    acc += b.split(/\s+/).filter(Boolean).length;
  }
  const palavras = blocos.reduce((n, b) => n + b.split(/\s+/).filter(Boolean).length, 0);
  if (Math.abs(palavras - linhas.length) > 3) {
    console.warn(`  ⚠️ ${palavras} palavras no roteiro x ${linhas.length} linhas de legenda — sincronia pode escorregar`);
  }
  return out;
}

let durAlvo = null;
const fFatias = path.join(dir, 'cenas.txt');
if (fs.existsSync(fFatias)) {
  const inicios = fs.readFileSync(fFatias, 'utf8').split(String.fromCharCode(10))
    .map(l => parseInt(l.trim(), 10)).filter(n => !isNaN(n));
  const tb = temposDosBlocos();
  if (inicios.length === cenas.length && tb.every(t => t !== null)) {
    // Duas ou mais cenas podem apontar para o MESMO bloco de fala — nesse caso elas
    // dividem a janela daquele bloco em partes iguais. Sem isso a segunda ficava com
    // duracao zero e sumia do video.
    durAlvo = inicios.map((b, k) => {
      const t0base = k === 0 ? 0 : tb[b - 1] + 0.5;
      let prox = k + 1;
      while (prox < inicios.length && inicios[prox] === b) prox++;
      const t1base = prox >= inicios.length ? ALVO : tb[inicios[prox] - 1] + 0.5;
      let quantos = 0, ondeEstou = 0;
      for (let q = 0; q < inicios.length; q++) {
        if (inicios[q] === b) { if (q === k) ondeEstou = quantos; quantos++; }
      }
      const fatia = (t1base - t0base) / quantos;
      return +fatia.toFixed(3);
    });
    console.log('sincronia por fala: ' + durAlvo.map(d => d.toFixed(1) + 's').join(' · '));
  } else {
    console.warn(`⚠️ cenas.txt tem ${inicios.length} linhas para ${cenas.length} clipes, ou faltou casar bloco — usando fatia igual`);
  }
}

const durClipes = cenas.reduce((s2, c) => s2 + dur(path.join(dir, c)), 0);
const fator = ALVO / durClipes;
if (!durAlvo) console.log(`narração ${durNarr.toFixed(2)}s · clipes ${durClipes.toFixed(1)}s · esticando ${((fator - 1) * 100).toFixed(1)}%`);
if (!durAlvo && (fator < 0.85 || fator > 1.35)) {
  console.error(`✗ diferença grande demais (${fator.toFixed(2)}x). Gere mais/menos clipes em vez de esticar.`);
  process.exit(1);
}

// 1. normalizar cada clipe: 1080x1920, 24fps, esticado pelo fator, sem áudio
const tmp = [];
cenas.forEach((c, i) => {
  const o = path.join(dir, `_n${i}.mp4`);
  // Cada clipe recebe a duração do bloco de fala dele.
  // ENCURTAR: corta o fim (acelerar 2x fica horrível num plano cinematográfico).
  // ALONGAR: estica com setpts, o que vira slow motion suave — teto de 1,5x.
  const dOrig = dur(path.join(dir, c));
  const dQuero = durAlvo ? durAlvo[i] : dOrig * fator;
  const args = ['-v', 'error', '-y'];
  let f = 1;
  if (dQuero < dOrig - 0.05) {
    args.push('-t', dQuero.toFixed(3), '-i', path.join(dir, c));   // corta
  } else {
    f = Math.min(dQuero / dOrig, 1.5);
    args.push('-i', path.join(dir, c));
  }
  const vfN = (f !== 1 ? `setpts=${f.toFixed(6)}*PTS,` : '') +
    'scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1,fps=24';
  args.push('-an', '-vf', vfN, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18');
  if (f !== 1 && dQuero < dOrig * f) args.push('-t', dQuero.toFixed(3));
  args.push(o);
  console.log(`    ${c}: ${dOrig.toFixed(1)}s → ${dQuero.toFixed(1)}s ${dQuero < dOrig ? '(corte)' : `(${f.toFixed(2)}x lento)`}`);
  const r = spawnSync(ffmpeg, args, { encoding: 'utf8' });
  if (r.status !== 0) { console.error(`✗ normalizar ${c}: ${r.stderr.slice(-300)}`); process.exit(1); }
  // 24/09 (padrão novo aprovado pelo Marcelo): número/rótulo/círculo por cima do clipe. overlayN.png = PNG
  // transparente 1080x1920 casado com a cenaN; entra com fade de 0,3 s. Sem o arquivo, nada muda.
  const ov = path.join(dir, `overlay${i + 1}.png`);
  if (fs.existsSync(ov)) {
    const oo = o.replace(/\.mp4$/, '_ov.mp4');
    const ro = spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', o, '-loop', '1', '-i', ov, '-filter_complex',
      '[1:v]format=rgba,fade=t=in:st=0.15:d=0.3:alpha=1[ov];[0:v][ov]overlay=0:0:shortest=1,format=yuv420p',
      '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', oo], { encoding: 'utf8' });
    if (ro.status === 0 && fs.existsSync(oo)) { fs.renameSync(oo, o); console.log(`      + overlay${i + 1}.png`); }
    else console.warn(`      ! overlay${i + 1}.png falhou: ${(ro.stderr || '').slice(-200)}`);
  }
  tmp.push(o);
});
console.log('  ✓ clipes normalizados para 1080x1920 @24fps');

// 2. concatenar
const lista = path.join(dir, '_lista.txt');
fs.writeFileSync(lista, tmp.map(f => `file '${path.resolve(f).replace(/\\/g, '/')}'`).join('\n'), 'utf8');
const bruto = path.join(dir, '_bruto.mp4');
let r = spawnSync(ffmpeg, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista,
  '-c', 'copy', bruto], { encoding: 'utf8' });
if (r.status !== 0) { console.error(`✗ concat: ${r.stderr.slice(-300)}`); process.exit(1); }
// Se o video ficou mais curto que a narracao (o teto de 1,5x de esticamento nao alcancou),
// estende congelando o ultimo quadro. Melhor um quadro parado no fim do que cortar a fala —
// e no fim da aula a fala e o anuncio da proxima, que nao pode sumir.
{
  const dB = dur(bruto);
  const falta = ALVO - dB;
  if (falta > 0.3) {
    const esticado = path.join(dir, '_bruto2.mp4');
    const r2 = spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', bruto,
      '-vf', 'tpad=stop_mode=clone:stop_duration=' + falta.toFixed(2),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', esticado], { encoding: 'utf8' });
    if (r2.status === 0 && fs.existsSync(esticado)) {
      fs.unlinkSync(bruto); fs.renameSync(esticado, bruto);
      console.log('  + ultimo quadro congelado por ' + falta.toFixed(1) + 's para cobrir a narracao');
    } else {
      console.warn('  ! nao consegui congelar o fim: ' + (r2.stderr || '').slice(-200));
    }
  }
}
const durBruto = dur(bruto);
console.log(`  ✓ concatenado: ${durBruto.toFixed(2)}s`);

// 3. legenda + HOOK + logo + mix de áudio (mesma receita do make-short-img-flex)
const mp4 = process.env.SAIDA || path.join(dir, `${slug}.mp4`);

// HOOK na tela — lei do canal: 85% assiste sem som, o texto grande é o scroll-stopper.
// Mesmos parâmetros do make-short-img-flex: Arial Bold 56, amarelo, caixa preta 60%, 0-3,2s.
let hookDraw = '';
const fHook = path.join(dir, 'hook.txt');
if (fs.existsSync(fHook)) {
  const bruto = fs.readFileSync(fHook, 'utf8').split(String.fromCharCode(13)).join('').trim();
  if (bruto) {
    // auto-quebra em linhas de até 18 chars, para nunca vazar a largura
    const palavras = bruto.split(/\s+/);
    const linhas = []; let atual = '';
    for (const w of palavras) {
      if ((atual + ' ' + w).trim().length <= 18) atual = (atual + ' ' + w).trim();
      else { if (atual) linhas.push(atual); atual = w; }
    }
    if (atual) linhas.push(atual);
    const arq = path.join(dir, '_hooktmp.txt');
    fs.writeFileSync(arq, linhas.join(String.fromCharCode(10)), 'utf8');
    const BS = String.fromCharCode(92);
    const arqFF = path.resolve(arq).split(BS).join(String.fromCharCode(47)).split(String.fromCharCode(58)).join(BS + String.fromCharCode(58));
    const fonte = String.fromCharCode(67) + BS + String.fromCharCode(58) + String.fromCharCode(47) + String.fromCharCode(87) + 'indows/Fonts/arialbd.ttf';
    hookDraw = `,drawtext=fontfile='${fonte}':textfile='${arqFF}':fontcolor=yellow:fontsize=56:line_spacing=12:x=(w-text_w)/2:y=170:box=1:boxcolor=black@0.6:boxborderw=24:enable='between(t,0,3.2)'`;
    console.log(`  hook na tela: "${linhas.join(' / ')}"`);
  }
}
const assFF = path.resolve(ass).replace(/\\/g, '/').replace(/:/g, '\\:');
// Bilibili usa a legenda como faixa SRT e pode sobrepor tradução própria.
// SEM_LEGENDA=1 conserva o timing em captions.ass, mas não queima texto no pixel.
const SEM_LEGENDA = process.env.SEM_LEGENDA === '1';
const legendaVideo = SEM_LEGENDA ? 'null' : `subtitles='${assFF}'`;
if (SEM_LEGENDA) console.log('  legenda  : faixa externa; texto NÃO queimado no vídeo');
const LOGO_W = 168, LOGO_DELAY = 0.5;
const vf =
  `[0:v]${legendaVideo}${hookDraw}[vb];` +
  `[3:v]scale=${LOGO_W}:-1[lg];` +
  `[vb][lg]overlay=W-w-20:20:format=auto:enable='gte(t,${LOGO_DELAY})',format=yuv420p[v];` +
  `[2:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.72[mus];` +
  `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=500|500,volume=1.35,asplit=2[voice][key];` +
  `[mus][key]sidechaincompress=threshold=0.035:ratio=4:attack=8:release=180[duck];` +
  `[duck][voice]amix=inputs=2:duration=first:weights=1 1:normalize=0,` +
  `loudnorm=I=-16:TP=-1.5:LRA=8,afade=t=out:st=${(durBruto - 0.8).toFixed(2)}:d=0.8[a]`;

r = spawnSync(ffmpeg, ['-v', 'error', '-y',
  '-i', bruto, '-i', narr, '-stream_loop', '-1', '-i', trilha, '-i', logo,
  '-filter_complex', vf, '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-t', durBruto.toFixed(2), '-movflags', '+faststart', mp4],
  { encoding: 'utf8' });
if (r.status !== 0) { console.error(`✗ montagem final:\n${r.stderr.slice(-800)}`); process.exit(1); }

// limpeza
tmp.forEach(f => { try { fs.unlinkSync(f); } catch {} });
try { fs.unlinkSync(path.join(dir, '_hooktmp.txt')); } catch {}
[lista, bruto].forEach(f => { try { fs.unlinkSync(f); } catch {} });

// 4. auditoria
const info = (spawnSync(ffmpeg, ['-hide_banner', '-i', mp4], { encoding: 'utf8' }).stderr) || '';
const segs = dur(mp4);
const res = (info.match(/, (\d{3,4}x\d{3,4})/) || [])[1];
console.log(`\nauditoria:`);
console.log(`  duração  : ${segs.toFixed(1)}s ${segs > 48 ? '⚠ ACIMA DE 48s' : '✓'}`);
console.log(`  resolução: ${res} ${res === '1080x1920' ? '✓' : '⚠'}`);
const ln = spawnSync(ffmpeg, ['-hide_banner', '-i', mp4, '-af', 'loudnorm=print_format=summary', '-f', 'null', '-'], { encoding: 'utf8' });
const lufs = ((ln.stderr || '').match(/Input Integrated:\s*(-?[\d.]+)/) || [])[1];
if (lufs) console.log(`  loudness : ${lufs} LUFS`);

// tira de frames
const pts = [0.8, 8, 16, 24, 31, 37, Math.max(39, segs - 3)];
const fr = pts.map((t, i) => {
  const o = path.join(dir, `_f${i}.jpg`);
  spawnSync(ffmpeg, ['-v', 'error', '-y', '-ss', String(t), '-i', mp4, '-frames:v', '1', '-vf', 'scale=170:-1', o], { encoding: 'utf8' });
  return o;
}).filter(f => fs.existsSync(f));
if (fr.length === 7) {
  spawnSync(ffmpeg, ['-v', 'error', '-y', ...fr.flatMap(f => ['-i', f]),
    '-filter_complex', '[0:v][1:v][2:v][3:v][4:v][5:v][6:v]hstack=inputs=7', path.join(dir, '_tira.jpg')], { encoding: 'utf8' });
  console.log(`  tira     : ${path.join(dir, '_tira.jpg')}`);
}
fr.forEach(f => { try { fs.unlinkSync(f); } catch {} });

console.log(`\n✓ ${mp4}`);
