'use strict';
/**
 * Short barato a partir de 4 imagens: Ken Burns + TTS + legenda + trilha.
 *
 * Uso:
 *   $env:SHORT_SCRIPT='roteiro...'
 *   node make-short-img-flex.js <img_dir> <out.mp4> <topic> [track-file.mp3]
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { generateTTSWithTimings } = require('./tts');
const { buildAss } = require('./ass-captions');
const { ensureMusicCached, selectTrackForTopic } = require('./music-manager');

const IMG_DIR = process.argv[2];
const OUT = process.argv[3];
const TOPIC = process.argv[4] || 'tech cinematic short';
const FORCED_TRACK = process.argv[5] || '';
const SCRIPT_FILE = path.join(IMG_DIR, 'roteiro.txt');
const SCRIPT = fs.existsSync(SCRIPT_FILE)
  ? fs.readFileSync(SCRIPT_FILE, 'utf8').trim()
  : (process.env.SHORT_SCRIPT || 'A tecnologia muda quando alguem ousa construir o impossivel. E o impossivel fica real quando a maquina aprende a lutar.');
const SEG = parseFloat(process.env.SHORT_SEG || '7.2');
const FPS = 24;
// Preset do x264: só afeta VELOCIDADE/tamanho do arquivo, NÃO a qualidade visual (isso é o CRF).
// Default 'veryfast' (encode ~3x mais rápido, mesma nitidez). Override via env X264_PRESET.
const PRESET = process.env.X264_PRESET || 'veryfast';
const ZOOM_END = [1.15, 1.22, 1.12, 1.18, 1.20, 1.14, 1.24];

function durOf(file) {
  const p = spawnSync(ffmpeg, ['-i', file], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 0;
}

(async () => {
  if (!IMG_DIR || !OUT) {
    console.error('uso: node make-short-img-flex.js <img_dir> <out.mp4> <topic> [track-file.mp3]');
    process.exit(1);
  }

  // absoluto: com caminho relativo, o compose final (que roda com cwd:work) aninhava
  // o path dos clipes (exports/x/exports/x/...) e o ffmpeg não os encontrava.
  const work = path.resolve(path.dirname(OUT));
  fs.mkdirSync(work, { recursive: true });
  const tmp = path.join(work, '_clips_' + Date.now());
  fs.mkdirSync(tmp, { recursive: true });

  const imgs = fs.readdirSync(IMG_DIR)
    // só imgN.ext — exclui qualquer arquivo de debug/temp (ex: _fr0.jpg, frame.jpg) que tenha
    // sobrado na pasta de capturas de verificação anteriores.
    .filter(f => /^img\d+\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort((a, b) => (parseInt(a.match(/\d+/)?.[0] || 0, 10)) - (parseInt(b.match(/\d+/)?.[0] || 0, 10)))
    // Teto era 7 (herdado de quando as cenas eram fatias iguais e longas). Com sincronia por
    // deixa de fala (cues.txt) as cenas ficam curtas e a imagem acompanha o assunto — pedido do
    // Marcelo em 06/08: "mais imagem, e o que eu falo tem que estar na tela naquele momento".
    .slice(0, 16);
  // ⚠️ TRAVA (09/09/2026): o `_prep-flow.js` grava PNGs PRETOS de propósito, como
  // placeholder pro Flow trocar depois pelos clipes reais. Em 04/09 esses pretos vazaram
  // para pl35-pl38 e o build montou 4 aulas COMPLETAMENTE PRETAS sem reclamar — log verde,
  // duração certa, trilha certa. Foram parar agendadas no canal e na fila do Insta.
  // Se as imagens forem todas idênticas, é placeholder, não arte. Aborta.
  if (imgs.length >= 2 && !process.env.PERMITIR_PLACEHOLDER) {
    const crypto = require('crypto');
    const hash = f => crypto.createHash('md5').update(fs.readFileSync(path.join(IMG_DIR, f))).digest('hex');
    const primeiro = hash(imgs[0]);
    if (imgs.every(f => hash(f) === primeiro)) {
      console.error(`[flex] ABORTADO: as ${imgs.length} imagens de ${IMG_DIR} sao o MESMO arquivo (md5 ${primeiro.slice(0, 8)}).`);
      console.error('[flex] Isso e o placeholder preto do _prep-flow.js. Gere as imagens antes de montar.');
      console.error('[flex] Se for intencional (preparo de Flow), rode com PERMITIR_PLACEHOLDER=1.');
      process.exit(1);
    }
  }
  if (imgs.length < 2) {
    console.error(`[flex] preciso de ao menos 2 imagens, encontrei ${imgs.length} em ${IMG_DIR}`);
    process.exit(1);
  }
  console.log(`[flex] ${imgs.length} cenas: ${imgs.join(', ')}`);

  // 1) Narração PRIMEIRO — pra dimensionar as cenas e nunca cortar a fala.
  // VOZ POR STREAM (padrão fixado pelo Marcelo em 06/08/2026): **aula = voz feminina (Thalita)**,
  // todo o resto = masculina (Antonio). Antes dependia da env SHORTS_VOICE e o padrão tinha
  // derivado — as aulas pl12/pl13 saíram com voz masculina por esquecimento. Agora o próprio
  // meta.json manda: _prod.voice, ou _prod.stream === 'aula' → feminina. Env continua vencendo.
  let voice = process.env.SHORTS_VOICE || '';
  if (!voice) {
    try {
      const mp = path.join(IMG_DIR, 'meta.json');
      const pm = fs.existsSync(mp) ? (JSON.parse(fs.readFileSync(mp, 'utf8'))._prod || {}) : {};
      voice = pm.voice || (pm.stream === 'aula' ? 'female' : 'male');
    } catch { voice = 'male'; }
  }
  console.log(`[flex] voz: ${voice}`);
  const narr = path.join(work, 'narr.mp3');
  let audioPath, words;
  // Intro acelerada: se existir intro.txt na pasta, ela é falada ~1.28x (bordão da série,
  // rápido) e o roteiro.txt vem em velocidade normal — evita o bordão comer o vídeo.
  const introFile = path.join(IMG_DIR, 'intro.txt');
  if (fs.existsSync(introFile)) {
    const introTxt = fs.readFileSync(introFile, 'utf8').trim();
    const tempo = parseFloat(process.env.INTRO_TEMPO || '1.28');
    const introRaw = path.join(work, '_intro_raw.mp3');
    const introMp3 = path.join(work, '_intro.mp3');
    const bodyMp3 = path.join(work, '_body.mp3');
    const ri = await generateTTSWithTimings(introTxt, introRaw, voice);
    spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', introRaw, '-filter:a', `atempo=${tempo}`, '-y', introMp3], { timeout: 30000 });
    const introDur = durOf(introMp3);
    const introWords = (ri.words || []).map(w => ({ text: w.text, start: +(w.start / tempo).toFixed(3), end: +(w.end / tempo).toFixed(3) }));
    const rb = await generateTTSWithTimings(SCRIPT, bodyMp3, voice);
    const bodyWords = (rb.words || []).map(w => ({ text: w.text, start: +(w.start + introDur).toFixed(3), end: +(w.end + introDur).toFixed(3) }));
    spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', introMp3, '-i', bodyMp3,
      '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[a]', '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', '24000', '-y', narr], { timeout: 40000 });
    [introRaw, introMp3, bodyMp3].forEach(p => { try { fs.unlinkSync(p); } catch {} });
    audioPath = narr;
    words = [...introWords, ...bodyWords];
    console.log(`[flex] intro acelerada ${tempo}x (${introDur.toFixed(1)}s) + corpo normal`);
  } else {
    const r = await generateTTSWithTimings(SCRIPT, narr, voice);
    audioPath = r.audioPath; words = r.words;
  }
  // 1b) "STOP" sensorial (método Stop-Hook-Payoff, revisão 06/08/2026 do PLAYBOOK).
  // Os primeiros ~0,5s têm que ser imagem+som SEM narração: paralisa o polegar da audiência
  // fria antes de ela decidir pular. Aqui só atrasamos a voz; o punch-in da cena 1 e a trilha
  // continuam rodando desde o frame 0. Desliga com STOP_MS=0.
  const stopMs = parseInt(process.env.STOP_MS || '500', 10);
  if (stopMs > 0) {
    const delayed = path.join(work, '_narr_stop.mp3');
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', audioPath,
      '-af', `adelay=${stopMs}|${stopMs}`, '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', '24000', '-y', delayed], { timeout: 40000 });
    if (r.status === 0 && fs.existsSync(delayed)) {
      fs.copyFileSync(delayed, narr);
      try { fs.unlinkSync(delayed); } catch {}
      audioPath = narr;
      const shift = stopMs / 1000;
      words = (words || []).map(w => ({ text: w.text, start: +(w.start + shift).toFixed(3), end: +(w.end + shift).toFixed(3) }));
      console.log(`[flex] STOP sensorial: ${stopMs}ms sem narração no início`);
    } else {
      console.warn('[flex] ⚠️ falhou aplicar o STOP silencioso — seguindo sem ele');
    }
  }

  const narrDur = durOf(audioPath);
  // Duração por formato (PLAYBOOK-SHORTS.md, revisão 06/08/2026 — a regra antiga de "nunca passar
  // de 35s" foi derrubada pelos dados: os 3 melhores em "continuaram assistindo" têm 47s, 54s e 63s).
  // Sweet spot geral 40-45s; notícia/descoberta pode ir a ~54s; existencial curto 34-44s.
  if (narrDur > 56) {
    console.warn(`[flex] ⚠️⚠️ NARRAÇÃO ${narrDur.toFixed(1)}s — passou do teto de ~54s até pra notícia de descoberta. Enxugue. Ver PLAYBOOK-SHORTS.md.`);
  } else if (narrDur < 30) {
    console.warn(`[flex] ⚠️ NARRAÇÃO ${narrDur.toFixed(1)}s — abaixo de 30s o mistério não tem espaço pra montar tensão (payoff imediato = sem graça). Alvo: 40-45s.`);
  }
  const seg = Math.min(11, Math.max(6, (narrDur + 0.6) / imgs.length)); // cada cena cobre sua fatia
  const frames = Math.round(seg * FPS);
  console.log(`[flex] narracao ${narrDur.toFixed(2)}s | ${seg.toFixed(2)}s/cena | ${words ? words.length : 0} palavras`);

  // 1c) SINCRONIA IMAGEM×FALA (06/08/2026 — pedido do Marcelo: "quando eu falo do dia tem que
  // estar mostrando o dia"). Sem isso as cenas eram fatias IGUAIS da narração: a imagem trocava
  // no relógio, não no assunto, e a voz já estava em outro tema quando a imagem chegava.
  // Com `cues.txt` na pasta (1 linha por imagem = trecho do roteiro onde ela deve ENTRAR),
  // cada cena passa a durar exatamente o tempo daquele trecho falado.
  const normW = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  let sceneStarts = null;
  const cuesFile = path.join(IMG_DIR, 'cues.txt');
  if (fs.existsSync(cuesFile) && words && words.length) {
    const cues = fs.readFileSync(cuesFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
    const wNorm = words.map(w => normW(w.text));
    const starts = [];
    let from = 0;
    for (const cue of cues) {
      const cw = cue.split(/\s+/).map(normW).filter(Boolean);
      let found = -1;
      for (let i = from; i <= wNorm.length - cw.length; i++) {
        if (cw.every((c, k) => wNorm[i + k] === c || wNorm[i + k].startsWith(c))) { found = i; break; }
      }
      if (found === -1) { console.warn(`[flex] ⚠️ deixa não encontrada no roteiro: "${cue}"`); starts.push(null); }
      else { starts.push(words[found].start); from = found + 1; }
    }
    if (starts.length === imgs.length && starts.every(s => s !== null)) {
      starts[0] = 0; // a 1ª cena sempre cobre o STOP sensorial
      let ok = true;
      for (let i = 1; i < starts.length; i++) if (starts[i] <= starts[i - 1] + 0.8) ok = false;
      if (ok) { sceneStarts = starts; console.log('[flex] 🎯 cenas sincronizadas pela FALA (cues.txt)'); }
      else console.warn('[flex] ⚠️ deixas fora de ordem ou muito juntas (<0,8s) — usando fatias iguais');
    } else {
      console.warn(`[flex] ⚠️ cues.txt tem ${cues.length} deixas pra ${imgs.length} imagens (ou alguma falhou) — usando fatias iguais`);
    }
  }
  // duração de cada cena: da sua deixa até a deixa seguinte (a última vai até o fim da narração)
  let sceneImgs = imgs;
  let segs;
  if (sceneStarts) {
    // PISO DE DURAÇÃO (06/08 — Marcelo: "2 ou 3 imagens mudaram rápido demais, dá ânsia").
    // Corte abaixo de ~3,5s lê como pressa e cansa. Enquanto houver cena curta, removemos a
    // MENOR delas e a imagem vai embora junto — a cena anterior absorve o tempo. Some imagem,
    // mas o ritmo respira; é preferível 8 cenas boas a 11 com três soluços.
    const MIN_SCENE = parseFloat(process.env.MIN_SCENE_S || '3.5');
    let ks = sceneStarts.slice(), ki = imgs.slice();
    const durs = () => ks.map((s, i) => +(((i === ks.length - 1) ? narrDur + 0.6 : ks[i + 1]) - s).toFixed(2));
    let d = durs(), removidas = 0;
    while (ks.length > 2) {
      let worst = -1, worstV = Infinity;
      d.forEach((v, i) => { if (v < MIN_SCENE && v < worstV) { worstV = v; worst = i; } });
      if (worst === -1) break;
      // nunca remove a 1ª cena (ela cobre o STOP): nesse caso tira a seguinte
      const rm = worst === 0 ? 1 : worst;
      ks.splice(rm, 1); ki.splice(rm, 1); removidas++;
      d = durs();
    }
    if (removidas) console.log(`[flex] piso de ${MIN_SCENE}s: ${removidas} cena(s) curta(s) absorvida(s) — ${ki.length} imagens usadas de ${imgs.length}`);
    sceneImgs = ki; segs = d;
  } else {
    segs = imgs.map(() => +seg.toFixed(2));
  }
  if (sceneStarts) console.log('[flex] cenas (s): ' + segs.join(' · ') + `  [min ${Math.min(...segs).toFixed(2)}s]`);

  // 2) Cada imagem vira um clipe com zoom dimensionado pela narração.
  //    Cenas normais: "punch-in" (zoom rápido no início, suaviza com sqrt) — mais dinâmico
  //    sem virar caos (achado NotebookLM: ciência precisa de tempo de processamento, não
  //    velocidade frenética). Última cena: RECUA o zoom (sensação de fechar/voltar),
  //    reforçando o loop de fechamento do roteiro (ver inteligencia-viral-shorts.md).
  const clips = [];
  sceneImgs.forEach((im, i) => {
    const out = path.join(tmp, `scene${i + 1}.mp4`);
    const isLast = i === sceneImgs.length - 1;
    const zEnd = ZOOM_END[i % ZOOM_END.length];
    const segI = segs[i];                       // cada cena tem a duração da SUA fala
    const framesI = Math.max(2, Math.round(segI * FPS));
    const zExpr = isLast
      ? `${zEnd.toFixed(3)}-${(zEnd - 1.04).toFixed(3)}*sqrt(on/${framesI})`
      : `1.04+${(zEnd - 1.04).toFixed(3)}*sqrt(on/${framesI})`;
    const vf = `scale=1600:2844:force_original_aspect_ratio=increase,crop=1600:2844,` +
      `zoompan=z='${zExpr}':x='iw/2-(iw/zoom/2)+sin(on/42)*36':y='ih/2-(ih/zoom/2)+sin(on/68)*24':d=${framesI}:s=720x1280:fps=${FPS},` +
      `noise=alls=5:allf=t,vignette=angle=PI/4.5,format=yuv420p`;
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-loop', '1', '-i', path.join(IMG_DIR, im),
      '-t', segI.toFixed(2), '-vf', vf, '-c:v', 'libx264', '-preset', PRESET, '-crf', '19', '-y', out], { timeout: 120000 });
    if (r.status === 0 && fs.existsSync(out)) { clips.push(out); console.log(`[flex] cena ${i + 1} ok`); }
    else console.error(`[flex] falha cena ${i + 1}:`, (r.stderr || '').toString().slice(-300));
  });
  if (clips.length !== sceneImgs.length) process.exit(1);

  const vidTotal = segs.reduce((a, b) => a + b, 0);
  const DUR = +(Math.min(narrDur + 0.8, vidTotal + 0.3)).toFixed(2);
  console.log(`[flex] final ${DUR}s`);

  const ass = path.join(work, 'captions.ass');
  fs.writeFileSync(ass, buildAss(words || [], { width: 720, height: 1280, fontSize: 56, marginV: 225, outline: 5, shadow: 2, group: 2 }), 'utf8');

  const tracks = await ensureMusicCached();
  let track = null;
  if (FORCED_TRACK) {
    const forced = path.join(__dirname, 'assets', 'music-real', FORCED_TRACK);
    if (fs.existsSync(forced)) track = { name: FORCED_TRACK, path: forced };
  }
  if (!track) track = selectTrackForTopic(TOPIC, tracks);
  console.log(`[flex] trilha: ${track.name}`);

  // ANTI-REPETIÇÃO DE TRILHA (06/08/2026). Os scripts de lote passam a trilha na mão, o que pula
  // o sorteio ponderado do music-manager — foi assim que 'quantum-investigations' saiu em 6 dos 10
  // últimos vídeos e 5 SEGUIDAS, até o Marcelo mandar banir. Aqui só olhamos os meta.json já
  // construídos e AVISAMOS alto (não bloqueia, pra não travar um lote no meio).
  try {
    const expDir = path.resolve(__dirname, 'exports');
    const recentes = fs.readdirSync(expDir)
      .map(s => { try {
        const j = JSON.parse(fs.readFileSync(path.join(expDir, s, 'meta.json'), 'utf8'));
        const q = j.builtAt || j.publishAt;
        return (q && j.track && s !== path.basename(IMG_DIR)) ? { s, t: j.track, q } : null;
      } catch { return null; } })
      .filter(Boolean)
      .sort((a, b) => new Date(b.q) - new Date(a.q))
      .slice(0, 5);
    const seguidas = recentes.findIndex(r => r.t !== track.name);
    const emRepeticao = seguidas === -1 ? recentes.length : seguidas;
    if (emRepeticao >= 2) {
      console.warn(`[flex] 🚨 TRILHA REPETIDA: "${track.name}" já foi nos ${emRepeticao} vídeos anteriores seguidos.`);
      console.warn(`[flex]    Últimos: ${recentes.map(r => r.t.replace('.mp3', '')).join(' · ')}`);
      console.warn(`[flex]    Troque a trilha (ou não passe o 5º argumento e deixe o sorteio ponderado escolher).`);
    }
  } catch {}

  // Registra a trilha no meta.json. Sem isso o dado se perde no log e fica IMPOSSÍVEL
  // saber depois qual música cada vídeo usou — logo, impossível cruzar com o Analytics
  // e descobrir qual trilha retém melhor. Ideia do usuário (15/07): medir a preferência
  // musical da audiência. Custa zero e o dado só existe se for gravado na hora.
  try {
    const metaPath = path.join(IMG_DIR, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      meta.track = track.name;
      meta.builtAt = new Date().toISOString();
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    }
  } catch (e) { console.warn('[flex] não deu pra registrar a trilha no meta:', e.message); }

  // Hook na tela (texto-bomba amarelo nos primeiros 3s). Prioridade da fonte:
  //   1) IMG_DIR/hook.txt   2) env SHORT_HOOK   3) fallback = 1ª frase do roteiro.
  // O fallback GARANTE que todo Short leva gancho no 1º frame mesmo se ninguém
  // criar o hook.txt — achado viral 27-28/06: 85% assistem sem som, então o
  // primeiro frame precisa carregar o choque sozinho, sem depender da narração.
  let hookDraw = '';
  // Auto-quebra o hook em linhas curtas (<=18 chars) pra NUNCA vazar a tela em 720px
  // (essencial pro inglês, que é mais longo). Preserva os hooks BR de 2 linhas.
  const wrapHook = (txt, max = 18) => {
    const words = txt.replace(/\s+/g, ' ').trim().split(' ');
    const lines = []; let cur = '';
    for (const w of words) {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3).join('\n');
  };
  const hookSrc = path.join(IMG_DIR, 'hook.txt');
  let hookText = '';
  let hookOrigem = '';
  if (fs.existsSync(hookSrc)) { hookText = fs.readFileSync(hookSrc, 'utf8'); hookOrigem = 'hook.txt'; }
  else if (process.env.SHORT_HOOK) { hookText = process.env.SHORT_HOOK; hookOrigem = 'env'; }
  else {
    // fallback: 1ª frase do roteiro (até ~9 palavras — o wrapHook corta em 3 linhas)
    const firstSentence = (SCRIPT.split(/(?<=[.!?])\s/)[0] || SCRIPT).trim();
    hookText = firstSentence.split(' ').slice(0, 9).join(' ');
    hookOrigem = 'roteiro(fallback)';
  }
  if (hookText.trim() && process.env.HOOK_BIG_FIRST === '1') {
    // Modo "número gigante" (série O Universo em Números): a 1ª linha do hook.txt
    // vira um número ENORME no 1º frame (identidade visual da série), o resto fica
    // no tamanho normal embaixo. Fonte segoeuib: arialbd não tem o glifo ⁻ (U+207B)
    // dos expoentes negativos (10⁻³²) — Segoe UI Bold tem todos (testado 08/07).
    const rawLines = hookText.replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean);
    const line1 = rawLines[0];
    const rest = rawLines.slice(1).join(' ');
    // auto-fit: nunca vazar os 720px de largura (0,58em/char é a média do Segoe Bold)
    const size1 = Math.max(72, Math.min(150, Math.floor(660 / (0.58 * Math.max(4, line1.length)))));
    fs.writeFileSync(path.join(work, '_hook1.txt'), line1, 'utf8');
    hookDraw = `,drawtext=fontfile='C\\:/Windows/Fonts/segoeuib.ttf':textfile='_hook1.txt':fontcolor=yellow:fontsize=${size1}:x=(w-text_w)/2:y=140:box=1:boxcolor=black@0.6:boxborderw=26:enable='between(t,0,3.2)'`;
    if (rest) {
      const wrapped2 = wrapHook(rest);
      fs.writeFileSync(path.join(work, '_hook2.txt'), wrapped2, 'utf8');
      const y2 = 140 + Math.round(size1 * 1.25) + 52;
      hookDraw += `,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':textfile='_hook2.txt':fontcolor=yellow:fontsize=52:line_spacing=12:x=(w-text_w)/2:y=${y2}:box=1:boxcolor=black@0.6:boxborderw=20:enable='between(t,0,3.2)'`;
    }
    console.log(`[flex] hook GIGANTE (${hookOrigem}): "${line1}" ${size1}px${rest ? ` + "${rest.replace(/\n/g, ' / ')}"` : ''}`);
  } else if (hookText.trim()) {
    const wrapped = wrapHook(hookText);
    fs.writeFileSync(path.join(work, '_hook.txt'), wrapped, 'utf8');
    hookDraw = `,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':textfile='_hook.txt':fontcolor=yellow:fontsize=56:line_spacing=12:x=(w-text_w)/2:y=170:box=1:boxcolor=black@0.6:boxborderw=24:enable='between(t,0,3.2)'`;
    console.log(`[flex] hook na tela ativo (${hookOrigem}): "${wrapped.replace(/\n/g, ' / ')}"`);
  }

  // Marca NEURAL UPDATE — persistente em todo vídeo (regra fixa, ver CLAUDE.md).
  // Preferência: LOGO (assets/brand/nu-logo.png, PNG transparente) no canto sup. direito.
  // Fallback: drawtext "NEURAL UPDATE" (se o logo sumir). Ambos discretos.
  const logoPath = path.join(__dirname, 'assets', 'brand', 'nu-logo.png');
  const hasLogo = fs.existsSync(logoPath);
  const LOGO_W = parseInt(process.env.BRAND_LOGO_W || '168', 10); // largura do logo na tela
  // Atraso da marca (ver revisão 06/08 do PLAYBOOK). Default = mesmo tempo do STOP sensorial.
  const LOGO_DELAY_MS = parseInt(process.env.LOGO_DELAY_MS || String(stopMs), 10);
  const brandTxt = `,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='NEURAL UPDATE':fontcolor=white@0.6:fontsize=30:x=(w-text_w)/2:y=46:shadowcolor=black@0.7:shadowx=2:shadowy=2`;

  const inputs = [];
  clips.forEach(c => inputs.push('-i', c));
  inputs.push('-i', audioPath, '-i', track.path);
  if (hasLogo) inputs.push('-i', logoPath);
  const vIdx = clips.map((_, i) => `[${i}:v]`).join('');
  const aNarr = clips.length;
  const aMus = clips.length + 1;
  const logoIdx = clips.length + 2;
  // SEM_LEGENDA=1 monta o vídeo sem queimar a legenda no pixel.
  // ⚠️ 29/08/2026 — POR QUE EXISTE: a Bilibili sobrepõe a PRÓPRIA camada de legenda
  // traduzida, e a orientação deles é explícita — "evite empilhar legendas em chinês
  // sobre legendas já queimadas no vídeo". Somem-se os danmaku, os comentários que
  // atravessam a tela por cima do vídeo e disputam o mesmo espaço.
  // O captions.ass continua sendo gerado normalmente; só não entra no filtro. Assim o
  // mesmo material serve para as duas saídas sem remontar do zero.
  const SEM_LEGENDA = process.env.SEM_LEGENDA === '1';
  const subs = SEM_LEGENDA ? '' : ',subtitles=captions.ass';
  if (SEM_LEGENDA) console.log('[legenda] SEM_LEGENDA=1 — legenda NÃO será queimada');

  // Cadeia de vídeo: concat -> legenda -> hook -> (logo overlay | drawtext fallback) -> [v]
  const vChain = hasLogo
    ? `${vIdx}concat=n=${clips.length}:v=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=2,trim=0:${DUR},setpts=PTS-STARTPTS${subs}${hookDraw}[vb];` +
      // LOGO_DELAY: a marca entra só DEPOIS do "Stop" sensorial. Logo no frame 0 grita
      // "institucional" pra audiência fria e aciona o swipe reflexo (NotebookLM 06/08/2026).
      // A marca d'água segue persistente no resto do vídeo — regra do CLAUDE.md preservada.
      `[${logoIdx}:v]scale=${LOGO_W}:-1[lg];[vb][lg]overlay=W-w-20:20:format=auto:enable='gte(t,${(LOGO_DELAY_MS / 1000).toFixed(2)})',format=yuv420p[v];`
    : `${vIdx}concat=n=${clips.length}:v=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=2,trim=0:${DUR},setpts=PTS-STARTPTS${subs}${hookDraw}${brandTxt}[v];`;
  const filter = vChain +
    `[${aMus}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.72[mus];` +
    `[${aNarr}:a]aformat=sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS,volume=1.35,asplit=2[voice][key];` +
    `[mus][key]sidechaincompress=threshold=0.035:ratio=4:attack=8:release=180[duck];` +
    `[duck][voice]amix=inputs=2:duration=first:weights=1 1:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=8,afade=t=out:st=${(DUR - 0.8).toFixed(2)}:d=0.8[a]`;

  const args = ['-hide_banner', '-loglevel', 'error', '-stats', ...inputs,
    '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-t', String(DUR),
    '-c:v', 'libx264', '-preset', PRESET, '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', path.basename(OUT)];

  const r = spawnSync(ffmpeg, args, { cwd: work, stdio: 'inherit', timeout: 240000 });
  try { clips.forEach(c => fs.unlinkSync(c)); fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  if (r.status === 0 && fs.existsSync(OUT)) console.log(`[flex] PRONTO: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
  else { console.error('[flex] falhou:', r.status); process.exit(1); }
})();
