'use strict';
/**
 * cta-kindle-lote.js — cola o CTA do Kindle no fim de VÁRIOS Shorts.
 *
 *   node cta-kindle-lote.js A slug1 slug2 slug3 ...
 *
 * POR QUE ESTE ARQUIVO EXISTE (16/08/2026):
 * o `append-isca-cta.js` remonta a CENA DE CTA a cada vídeo. Mas a cena é
 * IDÊNTICA nos 7 vídeos do lote — mesmo texto, mesma narração, mesma trilha.
 * Renderizar 7 vezes a mesma coisa é o que estava fazendo cada vídeo demorar,
 * e cada render é onde estourava o tempo.
 *
 * Aqui a cena é montada UMA VEZ, guardada em `assets/cta/kindle-<VAR>.mp4`, e
 * depois só CONCATENADA em cada vídeo (que é rápido). Efeito colateral bom:
 * o CTA fica visualmente igual em todo vídeo, então o público reconhece.
 *
 * ⚠️ A cena usa fundo PRÓPRIO (assets/cta/fundo.png), não a img1 de cada vídeo —
 * é o que permite reaproveitar. Se quiser voltar a usar o fundo de cada vídeo,
 * o caminho é o `append-isca-cta.js`, não este.
 *
 * 🚨 CONFORMIDADE AMAZON: nunca preço, nota em estrelas ou nº de avaliações.
 *    Ver neural-update-forge/COMISSOES-AFILIADO.md.
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { generateTTSWithTimings } = require('./tts');

// Fatos conferidos em 16/08 — ver memória meta-kindle-2-meses. NÃO alterar de cabeça:
// catálogo = +5 MILHÕES (o "1 milhão" era número antigo, só de ebook); o teste EXIGE
// cartão e esse é o maior travão; dá pra cancelar no mesmo minuto e ficar com os 30
// dias — e a Amazon paga a bonificação mesmo se a pessoa não usar o teste.
// SEM ACENTO e SEM VÍRGULA nas linhas de TELA (drawtext do ffmpeg no Windows).
const VARIACOES = {
  // ⚠️ LIÇÃO DE 16/08 — a primeira versão do A foi reprovada, com razão. Ela abria
  // com "O TRUQUE / assina e cancela na hora": escrito pra quem JÁ SABE o que é
  // Kindle Unlimited. Quem nunca ouviu falar não entende assina o quê, nem por quê,
  // nem o que ganha. O macete é TRANQUILIZAÇÃO, não manchete.
  // A ordem certa num CTA de 10s pra quem não conhece nada:
  //   1. o que eu ganho  2. de quem é (confiança)  3. quanto custa  4. e o risco?
  A: { // A OFERTA — completa e na ordem, com o truque no fim como garantia
    // 39 palavras deram 18s de cartaz num video de 53s — longo demais. Teto pratico:
    // ~26 palavras (~12s). O que nao couber na voz vai pra TELA, que sai de graca.
    L1: '30 DIAS GRATIS', S1: 78, L2: '5 milhoes de livros da Amazon', L4: 'sem precisar ter Kindle',
    narr: 'Trinta dias de livros de graça, da Amazon. Cinco milhões de títulos, e lê no seu celular. Não gostou? Cancela em um minuto. Ta na bio.',
  },
  B: { // O TAMANHO — mata as duas objeções: vale a pena? preciso do aparelho?
    L1: '5 MILHOES', S1: 104, L2: 'de livros da Amazon em 30 dias', L4: 'no seu celular sem Kindle',
    narr: 'Cinco milhões de livros da Amazon. Trinta dias de graça. E não precisa ter Kindle: roda no celular que você ta segurando agora.',
  },
  C: { // O DEFEITO PRIMEIRO — quem avisa do problema ganha o direito de ser ouvido
    L1: 'PEDE CARTAO', S1: 90, L2: 'e mesmo assim vale a pena', L4: 'cancela no 1o minuto e fica',
    narr: 'Vou te contar o problema antes: pede cartão, mesmo sendo de graça. Mas dá pra cancelar no primeiro minuto e ficar com os trinta dias inteiros.',
  },
};

const VAR = (process.argv[2] || 'A').toUpperCase();
const SLUGS = process.argv.slice(3);
const v = VARIACOES[VAR];
if (!v || !SLUGS.length) {
  console.error('uso: node cta-kindle-lote.js <A|B|C> <slug> [slug...]');
  process.exit(1);
}

const FONT = 'C\\:/Windows/Fonts/arialbd.ttf';
const TRILHA = path.join(__dirname, 'assets', 'music-real', 'dark-some-amount-of-evil.mp3');
const LOGO = path.join(__dirname, 'assets', 'brand', 'nu-logo.png');
const CTA_DIR = path.join(__dirname, 'assets', 'cta');
const CENA = path.join(CTA_DIR, `kindle-${VAR}.mp4`);

function durOf(f) {
  const p = spawnSync(ffmpeg, ['-i', f], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 0;
}

function erro(etapa, r) {
  console.error(`✗ ${etapa}: status=${r.status} signal=${r.signal}` +
    (r.signal === 'SIGTERM' ? ' (estourou o tempo)' : ''));
  console.error((r.stderr || '').toString().slice(-600) || '(stderr vazio)');
  process.exit(1);
}

(async () => {
  fs.mkdirSync(CTA_DIR, { recursive: true });

  // ── 1) a cena, UMA vez ────────────────────────────────────────────────────
  // 16/08: checar so a existencia nao basta — uma tentativa que falhou no meio
  // deixa um mp4 truncado, o cache aceita ele e TODOS os concats falham depois.
  const cenaValida = fs.existsSync(CENA) && fs.statSync(CENA).size > 50000 && durOf(CENA) > 3;
  if (!cenaValida) {
    try { fs.unlinkSync(CENA); } catch {}
    const fundo = path.join(CTA_DIR, 'fundo.png');
    if (!fs.existsSync(fundo)) {
      console.error(`falta o fundo do CTA: ${fundo}\n` +
        '(copie qualquer img1.png de exports/ pra lá — ele sai desfocado, então serve qualquer uma)');
      process.exit(1);
    }
    console.log(`[cta] montando a cena ${VAR} (só desta vez — depois fica em cache)`);
    const narrMp3 = path.join(CTA_DIR, `_narr-${VAR}.mp3`);
    await generateTTSWithTimings(v.narr, narrMp3, 'male');
    const TEMPO = 1.22;
    const DUR = +(durOf(narrMp3) / TEMPO + 0.5).toFixed(2);
    if (!(DUR > 0 && DUR <= 30)) { console.error(`[cta] duração absurda: ${DUR}s`); process.exit(1); }
    console.log(`[cta] cena de ${DUR}s`);

    const txt = (t, cor, tam, y) =>
      `drawtext=fontfile='${FONT}':text='${t}':fontcolor=${cor}:fontsize=${tam}:x=(w-text_w)/2:y=${y}:shadowcolor=black:shadowx=2:shadowy=2`;
    const vf = 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=16:2,eq=brightness=-0.36:saturation=1.05,' +
      `drawtext=fontfile='${FONT}':text='${v.L1}':fontcolor=yellow:fontsize=${v.S1}:x=(w-text_w)/2:y=440:box=1:boxcolor=black@0.55:boxborderw=22:shadowcolor=black:shadowx=3:shadowy=3,` +
      txt(v.L2, 'white', 46, 580) + ',' + txt('LINK NA BIO', '0x33ccff', 64, 690) + ',' + txt(v.L4, 'white', 40, 770);

    // ⚠️ 16/08: montar vídeo E áudio no MESMO filter_complex trava (SIGTERM, stderr
    // mudo) nesta máquina. Vídeo sozinho roda em segundos; junto com o amix, nunca
    // termina. Não perdi mais tempo caçando a causa: as três etapas abaixo usam só
    // pedaços já provados e o resultado é idêntico. Se for mexer, teste separado.
    const tmpV = path.join(CTA_DIR, `_v-${VAR}.mp4`);
    const tmpA = path.join(CTA_DIR, `_a-${VAR}.m4a`);

    // 1/3 vídeo: fundo desfocado + texto + logo
    let r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error',
      '-loop', '1', '-t', String(DUR), '-i', fundo, '-i', LOGO,
      '-filter_complex', `[0:v]${vf},format=yuv420p[vbg];[1:v]scale=168:-1[lg];[vbg][lg]overlay=W-w-20:20[v]`,
      '-map', '[v]', '-t', String(DUR), '-r', '24',
      '-c:v', 'libx264', '-crf', '19', '-pix_fmt', 'yuv420p', '-y', tmpV], { timeout: 300000 });
    if (r.status !== 0) erro('cena/video', r);

    // 2/3 áudio: narração acelerada + trilha ao fundo
    r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error',
      '-i', narrMp3, '-t', String(DUR), '-i', TRILHA,
      '-filter_complex',
      `[0:a]aresample=44100,aformat=channel_layouts=stereo,atempo=${TEMPO},volume=1.5[voz];` +
      '[1:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.5[mus];' +
      '[voz][mus]amix=inputs=2:duration=longest:weights=1 1:normalize=0,loudnorm=I=-16:TP=-1.5[a]',
      '-map', '[a]', '-t', String(DUR), '-c:a', 'aac', '-b:a', '192k', '-y', tmpA], { timeout: 300000 });
    if (r.status !== 0) erro('cena/audio', r);

    // 3/3 junta sem recodificar
    r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', tmpV, '-i', tmpA,
      '-c', 'copy', '-shortest', '-y', CENA], { timeout: 120000 });
    if (r.status !== 0) erro('cena/mux', r);
    for (const t of [tmpV, tmpA]) { try { fs.unlinkSync(t); } catch {} }
    console.log(`[cta] cena pronta: ${CENA}`);
  } else {
    console.log(`[cta] usando cena em cache: ${CENA}`);
  }

  // ── 2) concatena nos vídeos ───────────────────────────────────────────────
  const ok = [], falhas = [];
  for (const slug of SLUGS) {
    const base = path.join(__dirname, 'exports', slug, `${slug}.mp4`);
    const out = path.join(__dirname, 'exports', slug, `${slug}-kindle.mp4`);
    if (!fs.existsSync(base)) { falhas.push(`${slug}: sem mp4 base`); console.error(`✗ ${slug} — sem mp4`); continue; }
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', base, '-i', CENA,
      '-filter_complex',
      '[0:a]aresample=44100,aformat=channel_layouts=stereo[a0];[1:a]aresample=44100,aformat=channel_layouts=stereo[a1];' +
      '[0:v]scale=720:1280,fps=24[v0];[1:v]scale=720:1280,fps=24[v1];' +
      '[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]',
      '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
      '-y', out], { timeout: 300000 });
    if (r.status !== 0 || !fs.existsSync(out)) { falhas.push(slug); console.error(`✗ ${slug} — concat falhou (status=${r.status} signal=${r.signal})`); continue; }
    console.log(`✓ ${slug} — ${(fs.statSync(out).size / 1048576).toFixed(1)} MB  (${durOf(out).toFixed(1)}s)`);
    ok.push(slug);
  }
  console.log(`\n${ok.length} pronto(s) · ${falhas.length} falha(s)`);
  if (falhas.length) process.exit(1);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
