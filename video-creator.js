require('dotenv').config();
const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const { spawnSync } = require('child_process');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { generateTTS, generateTTSWithTimings } = require('./tts');
const { buildAss } = require('./ass-captions');
const { ensureMusicCached, selectTrackForTopic } = require('./music-manager');
const { fetchImagesFromWeb } = require('./image-search');
const { getVideoImages } = require('./image-client');

ffmpeg.setFfmpegPath(ffmpegStatic);

const WORK_DIR   = path.join(__dirname, '.video-work');
const OUTPUT_DIR = path.join(__dirname, 'videos');
[WORK_DIR, OUTPUT_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ─── Transliteração PT-BR → ASCII (para drawtext) ──────────────────────────
function transliterate(s) {
  return (s || '')
    .replace(/[ãâáàä]/gi, (c) => c === c.toUpperCase() ? 'A' : 'a')
    .replace(/[êéèë]/gi,  (c) => c === c.toUpperCase() ? 'E' : 'e')
    .replace(/[íîìï]/gi,  (c) => c === c.toUpperCase() ? 'I' : 'i')
    .replace(/[õôóòö]/gi, (c) => c === c.toUpperCase() ? 'O' : 'o')
    .replace(/[úûùü]/gi,  (c) => c === c.toUpperCase() ? 'U' : 'u')
    .replace(/[ç]/gi,     (c) => c === c.toUpperCase() ? 'C' : 'c')
    .replace(/[ñ]/gi,     (c) => c === c.toUpperCase() ? 'N' : 'n');
}

// ─── Gera filtros drawtext para legenda sincronizada com o roteiro ─────────
// Usa drawtext (não subtitles/SRT) para evitar problemas com paths Windows.
function generateSubtitleFilters(scriptText, totalDuration, fontArg, startOffset = 3.8) {
  // Sanitiza: transliteração + remoção de chars que quebram FFmpeg filter syntax
  const clean = transliterate(scriptText)
    .replace(/\[[^\]]*\]/g, '')              // remove [indicações de cena]
    .replace(/['":\\[\]{}|,;!?]/g, ' ')      // remove chars FFmpeg-special e pontuação
    .replace(/\s+/g, ' ')
    .trim();

  const allWords = clean.split(/\s+/).filter(w => w.length > 0);
  if (allWords.length < 3) return [];

  // Agrupa em frases de 5 palavras — cabe centralizado em 1080px com fonte 54px
  const WORDS_PER_LINE = 5;
  const phrases = [];
  for (let i = 0; i < allWords.length; i += WORDS_PER_LINE) {
    phrases.push(allWords.slice(i, i + WORDS_PER_LINE).join(' '));
  }

  // TTS PT-BR FranciscaNeural ≈ 2.4 palavras/segundo em velocidade normal
  const WPS   = 2.4;
  const availDuration = totalDuration - startOffset - 1.5;
  const scale = Math.min(1.0, (availDuration * 0.92) / (allWords.length / WPS));
  let t = startOffset; // começa após o hook (3.8s)

  const filters = [];
  for (const phrase of phrases) {
    if (t >= totalDuration - 1.5) break;
    const words = phrase.split(/\s+/).length;
    const dur   = Math.max(1.1, (words / WPS) * scale);
    const end   = Math.min(t + dur, totalDuration - 0.6);

    let f = `drawtext=text=${phrase.substring(0, 52).trim()}`;
    if (fontArg) f += `:${fontArg}`;
    f += `:fontcolor=white:fontsize=54`;
    f += `:x=(w-text_w)/2:y=(h-text_h)/2`;
    f += `:shadowcolor=black@0.95:shadowx=2:shadowy=2`;
    f += `:box=1:boxcolor=black@0.82:boxborderw=24`;
    f += `:enable=between(t\\,${t.toFixed(2)}\\,${end.toFixed(2)})`;

    filters.push(f);
    t = end + 0.06;
  }

  console.log(`[subs] ${filters.length} linhas de legenda geradas`);
  return filters;
}

// ─── neural-image-agent: imagens editoriais via image-client ─────────────
// Delega para image-client.js que baixa as imagens localmente e retorna paths.
async function fetchImagesFromAgent(script, count = 6, sceneQueries = null) {
  try {
    const result = await getVideoImages({ script, count, sceneQueries });
    if (result?.images?.length > 0) {
      const images = result.images.map(img => ({
        localPath: img.localPath,  // path local baixado por image-client
        query: img.paragraph,
        brand: img.brand,
        fromAgent: true,           // flag: já é 1080x1920 editorial, pula prepareImage
      }));
      console.log(`[images] ✓ ${images.length} imagens editoriais do agent`);
      images.forEach((img, i) => {
        console.log(`[images]   Cena ${i+1}: ${img.brand || '?'}`);
      });
      return images;
    }
  } catch (e) {
    const isOffline = e.message && e.message.includes('offline');
    const isTimeout = e.message && e.message.includes('timeout');
    if (isOffline) {
      console.warn('[images] neural-image-agent offline (porta 3030) — usando fallback');
    } else if (isTimeout) {
      console.warn('[images] neural-image-agent demorou demais — usando fallback');
    } else {
      console.warn('[images] neural-image-agent falhou:', e.message, '— usando fallback');
    }
  }
  return null; // null = usar fallback
}

// ─── Busca de imagens: agent primeiro, fallback para web/Pexels ───────────
async function fetchImages(queries, count = 6, jobDir, script) {
  // 1. Tenta o neural-image-agent (pessoas famosas + b-roll relevante via queries da IA)
  if (script) {
    // `queries` = image_queries da Maya (cena visual específica por trecho).
    // Passamos pro agente buscar+editar+cachear imagens relevantes ao tema.
    const agentImages = await fetchImagesFromAgent(script, count, Array.isArray(queries) ? queries : null);
    if (agentImages && agentImages.length >= 3) {
      return agentImages;
    }
  }

  // 2. Fallback: screenshots + Pexels (comportamento anterior)
  console.log('[images] Fallback: buscando na web...');
  const webImages = await fetchImagesFromWeb(queries, count, jobDir || WORK_DIR);

  if (webImages.length >= 3) {
    return webImages.map(img => ({ localPath: img.localPath, query: img.query, title: img.title }));
  }

  // 3. Fallback: Pexels direto se web falhar
  console.log('[images] Fallback para Pexels...');
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error('Imagens insuficientes e PEXELS_API_KEY não configurado');

  const images = [];
  const usedIds = new Set();
  for (const q of queries) {
    if (images.length >= count) break;
    try {
      const res = await axios.get('https://api.pexels.com/v1/search', {
        params: { query: q, per_page: 5, orientation: 'portrait', size: 'large' },
        headers: { Authorization: apiKey }, timeout: 10000
      });
      const best = (res.data?.photos || []).find(p => !usedIds.has(p.id) && p.width >= 800);
      if (best) {
        usedIds.add(best.id);
        images.push({ url: best.src.large2x || best.src.large, query: q });
        console.log(`[images] Pexels: "${q}" → ${best.photographer}`);
      }
    } catch {}
  }
  return images;
}

async function downloadImage(url, destPath) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 25000,
    headers: { 'User-Agent': 'Mozilla/5.0' } });
  fs.writeFileSync(destPath, res.data);
  return destPath;
}

// Prepara imagem: recorta para 1080x1920 (9:16), aplica leve enriquecimento de cor
async function prepareImage(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters([
        // Escala para cobrir 1080x1920 sem distorção
        'scale=1080:1920:force_original_aspect_ratio=increase',
        'crop=1080:1920',
        // Boost de contraste e saturação — estilo dark cinematográfico
        'eq=contrast=1.12:saturation=1.25:brightness=-0.05',
        'setsar=1'
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

// ─── Pipeline principal ─────────────────────────────────────────────────────

async function createVideo({ script, title, hashtags, hookTextOverlay, ctaTextOverlay, imageQueries, postId, topic, onProgress }) {
  const jobId = postId || Date.now().toString();
  const jobDir = path.join(WORK_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  // Reporta a etapa atual do pipeline (usado pelo dashboard para o stepper ao vivo)
  const report = (stage, message) => { try { if (onProgress) onProgress(stage, message); } catch {} };

  console.log(`\n[video] ═══ Iniciando criação — job ${jobId} ═══`);

  // 1. TTS Neural
  report('tts', 'Gerando narração neural...');
  console.log('[video] 1/5 Gerando narração neural...');
  const ttsPath = path.join(jobDir, 'narration.mp3');
  const ttsResult = await generateTTSWithTimings(script, ttsPath, 'female');
  const narrationFile = ttsResult && ttsResult.audioPath;
  const captionWords = (ttsResult && ttsResult.words) || null; // timing exato p/ legenda karaokê
  const sceneTimings = (ttsResult && ttsResult.sentenceTimings) || null; // p/ sincronizar imagens

  let narrationDuration = 24;
  if (narrationFile) {
    narrationDuration = await getAudioDuration(narrationFile);
    narrationDuration = Math.min(32, Math.max(16, narrationDuration + 1));
  }
  console.log(`[video] Duração: ${narrationDuration}s`);

  // 2. Música
  report('music', 'Carregando trilha sonora...');
  console.log('[video] 2/5 Carregando trilha sonora...');
  const cachedTracks = await ensureMusicCached();
  const musicTrack = selectTrackForTopic(topic || title, cachedTracks);
  if (musicTrack) console.log(`[video] Trilha: ${musicTrack.name || musicTrack.id}`);

  // 3. Imagens — tenta neural-image-agent primeiro (pessoas famosas + editorial)
  report('images', 'Gerando imagens editoriais (neural-image-agent)...');
  console.log('[video] 3/5 Buscando imagens cinematic...');
  const imageData = await fetchImages(
    imageQueries || ['technology futuristic dark', 'person shocked phone', 'digital world neon'],
    6,
    jobDir,
    script   // passa o roteiro → agent gera imagens certas por parágrafo
  );

  const preparedImages = [];
  for (let i = 0; i < imageData.length; i++) {
    const prepPath = path.join(jobDir, `img_${i}.jpg`);
    try {
      if (imageData[i].fromAgent && imageData[i].localPath && fs.existsSync(imageData[i].localPath)) {
        // Imagem do agent: já é 1080x1920 editorial, só copia (sem re-processar)
        fs.copyFileSync(imageData[i].localPath, prepPath);
        preparedImages.push(prepPath);
      } else {
        // Fallback: redimensiona/processa com FFmpeg normalmente
        const rawPath = imageData[i].localPath || path.join(jobDir, `raw_${i}.jpg`);
        if (!imageData[i].localPath && imageData[i].url) {
          await downloadImage(imageData[i].url, rawPath);
        }
        await prepareImage(rawPath, prepPath);
        preparedImages.push(prepPath);
      }
    } catch (e) { console.warn(`[video] Imagem ${i} falhou:`, e.message); }
  }
  if (!preparedImages.length) throw new Error('Falha ao preparar imagens');
  console.log(`[video] ${preparedImages.length} imagens preparadas`);

  // 4. Montar vídeo
  report('rendering', 'Montando vídeo com FFmpeg...');
  console.log('[video] 4/5 Montando com FFmpeg 6.1...');
  const outputPath = path.join(OUTPUT_DIR, `${jobId}.mp4`);
  await buildVideo({
    images: preparedImages,
    narrationFile,
    musicFile: musicTrack?.path || null,
    outputPath,
    totalDuration: narrationDuration,
    hookText: hookTextOverlay || title || '',
    ctaText: ctaTextOverlay || 'Segue pra mais IA',
    script: script || '',
    captionWords,
    sceneTimings,
    jobDir
  });

  try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch {}
  report('done', 'Vídeo pronto');
  console.log(`[video] 5/5 ✓ Pronto: ${path.basename(outputPath)} (${Math.round(fs.statSync(outputPath).size / 1e6 * 10) / 10}MB)\n`);
  return outputPath;
}

async function getAudioDuration(filePath) {
  // ffmpeg.ffprobe (fluent) precisa do binário ffprobe, que o ffmpeg-static NÃO
  // inclui → falhava e caía no default 45 (duração fantasma). Lemos a duração
  // direto do stderr do ffmpeg-static, que sempre existe.
  try {
    const r = spawnSync(ffmpegStatic, ['-i', filePath], { encoding: 'utf8' });
    const err = (r.stderr || '') + (r.stdout || '');
    const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (m) {
      const secs = (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
      if (secs > 0) return Math.ceil(secs);
    }
  } catch (e) { /* cai no fallback */ }
  // Fallback final: tenta o ffprobe do fluent (caso exista no ambiente)
  return new Promise(resolve => {
    try {
      ffmpeg.ffprobe(filePath, (err, meta) => resolve(err ? 40 : Math.ceil(meta.format?.duration || 40)));
    } catch { resolve(40); }
  });
}

// ─── FFmpeg: slideshow profissional com xfade ──────────────────────────────

async function buildVideo({ images, narrationFile, musicFile, outputPath, totalDuration, hookText, ctaText, script, captionWords, sceneTimings, jobDir }) {
  const imgCount  = images.length;
  const secPerImg = parseFloat((totalDuration / imgCount).toFixed(2));
  const fadeDur   = 0.5;
  const fps       = 30;   // 30fps = movimento mais suave/profissional no TikTok

  // ── Duração de cada imagem = duração da FRASE dela (sincronia imagem↔fala) ──
  let durations;
  if (Array.isArray(sceneTimings) && sceneTimings.length === imgCount) {
    durations = sceneTimings.map((s, i) => {
      const start = s.start;
      const end = (i < imgCount - 1) ? sceneTimings[i + 1].start : totalDuration; // cobre a pausa até a próxima
      return Math.max(1.4, +(end - start).toFixed(2));
    });
    console.log('[ffmpeg] Sincronizando imagens com a narração (duração por frase)');
  } else {
    durations = Array(imgCount).fill(secPerImg);
  }

  // Normaliza: após o xfade (que sobrepõe fadeDur entre clips) o vídeo precisa
  // durar EXATAMENTE a narração. Sem isso o vídeo ficava mais curto que o áudio
  // e o -shortest cortava o final (CTA + end-card sumiam).
  {
    const fadeTotal = fadeDur * Math.max(0, imgCount - 1);
    const targetSum = totalDuration + fadeTotal;
    const rawSum = durations.reduce((a, b) => a + b, 0) || 1;
    durations = durations.map(d => +(d * targetSum / rawSum).toFixed(3));
    console.log(`[ffmpeg] Durações normalizadas → vídeo cobre ${totalDuration}s de narração`);
  }

  // ── Passo 1: Ken Burns por clip ──────────────────────────────────────────
  console.log('[ffmpeg] Renderizando clips com Ken Burns...');
  const clips = [];

  for (let i = 0; i < imgCount; i++) {
    const clipPath = path.join(jobDir, `clip_${i}.mp4`);
    const dseg     = durations[i];
    const frames   = Math.floor(dseg * fps);
    const kbEffect = i % 4;
    let zExpr, xExpr, yExpr;
    const zSpd = 0.0006;

    switch (kbEffect) {
      case 0: zExpr = `min(1.4,zoom+${zSpd})`; xExpr = 'iw/2-(iw/zoom/2)'; yExpr = 'ih/2-(ih/zoom/2)'; break;
      case 1: zExpr = `max(1.0,zoom-${zSpd})`; xExpr = 'iw/2-(iw/zoom/2)'; yExpr = 'ih/2-(ih/zoom/2)'; break;
      case 2: zExpr = `min(1.2,zoom+${zSpd*0.5})`; xExpr = 'if(gte(zoom,1.2),iw/2-(iw/zoom/2),0)'; yExpr = 'ih/2-(ih/zoom/2)'; break;
      case 3: zExpr = `min(1.2,zoom+${zSpd*0.5})`; xExpr = `if(gte(zoom,1.2),iw/2-(iw/zoom/2),iw-(iw/zoom))`; yExpr = 'ih/2-(ih/zoom/2)'; break;
    }

    await new Promise((res, rej) => {
      ffmpeg(images[i])
        .inputOptions(['-loop 1'])
        .complexFilter([
          `[0:v]scale=2160:3840,` +
          `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=1080x1920:fps=${fps},` +
          `setsar=1,` +
          (i === 0 ? `fade=t=in:st=0:d=0.5,` : '') +
          `fade=t=out:st=${Math.max(0.3, dseg - 0.5).toFixed(2)}:d=0.45[vz]`
        ])
        .map('[vz]')
        .outputOptions(['-c:v libx264', '-preset ultrafast', '-crf 26', '-pix_fmt yuv420p', `-t ${dseg}`, '-an'])
        .output(clipPath)
        .on('end', () => { clips.push(clipPath); res(); })
        .on('error', (err, stdout, stderr) => { console.error('[ffmpeg-stderr]', stderr); rej(err); })
        .run();
    });
    process.stdout.write(`\r[ffmpeg] Ken Burns: ${i + 1}/${imgCount}`);
  }
  console.log('');

  // ── Passo 2: xfade entre clips ────────────────────────────────────────────
  console.log('[ffmpeg] Aplicando xfade transitions...');
  const concatPath = path.join(jobDir, 'concat.mp4');

  if (clips.length === 1) {
    fs.copyFileSync(clips[0], concatPath);
  } else {
    await new Promise((resolve, reject) => {
      const cmd = ffmpeg();
      clips.forEach(c => cmd.input(c));
      // Transições variadas e suaves (sem flashes pretos) — dá ritmo cinematográfico
      const TRANSITIONS = ['fade', 'smoothleft', 'smoothright', 'fade', 'smoothup'];
      const filters = [];
      let prev = '[0:v]';
      let cum = 0;
      for (let i = 1; i < clips.length; i++) {
        cum += durations[i - 1];
        const offset = (cum - fadeDur * i).toFixed(2);
        const out    = i === clips.length - 1 ? '[vfx]' : `[xf${i}]`;
        const trans  = TRANSITIONS[(i - 1) % TRANSITIONS.length];
        filters.push(`${prev}[${i}:v]xfade=transition=${trans}:duration=${fadeDur}:offset=${offset}${out}`);
        prev = `[xf${i}]`;
      }
      cmd.complexFilter(filters)
        .map('[vfx]')
        .outputOptions(['-c:v libx264', '-preset fast', '-crf 22', '-pix_fmt yuv420p', '-an'])
        .output(concatPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }
  console.log('[ffmpeg] Transitions OK');

  // ── Passo 3: áudio mix ────────────────────────────────────────────────────
  const audioPath = path.join(jobDir, 'audio_mix.mp3');
  if (narrationFile && musicFile) {
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(narrationFile)
        .input(musicFile)
        .complexFilter([
          // narração dividida em 2: uma p/ o mix, outra como "chave" do ducking
          '[0:a]volume=1.0,asplit=2[narr][narrkey]',
          // música em loop, volume base mais alto (vai abaixar sob a voz)
          '[1:a]aloop=loop=-1:size=2e+09,volume=0.30[musloop]',
          // SIDECHAIN DUCKING: a música abaixa automaticamente quando a voz fala
          '[musloop][narrkey]sidechaincompress=threshold=0.05:ratio=6:attack=15:release=260[mduck]',
          // mistura voz + música duckada e normaliza loudness (padrão streaming -14 LUFS)
          '[narr][mduck]amix=inputs=2:duration=first:dropout_transition=2[mix]',
          '[mix]loudnorm=I=-14:TP=-1.5:LRA=11[aout]'
        ])
        .map('[aout]')
        .audioCodec('libmp3lame').audioBitrate('192k')
        .outputOptions([`-t ${totalDuration}`])
        .output(audioPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    console.log('[ffmpeg] Mix audio OK (ducking + loudnorm)');
  }

  const finalAudio = (narrationFile && musicFile) ? audioPath : narrationFile;

  // ── Passo 4+5: Textos overlay + legendas sincronizadas ────────────────────
  // Sanitiza textos para FFmpeg drawtext: transliteração + remove chars especiais
  const sanitize = s => transliterate(s || '')
    .replace(/[^\x20-\x7E]/g, '')        // tira emoji/glifos sem fonte (evita "□" no Arial)
    .replace(/['":\\[\]{}|,;]/g, ' ')   // inclui vírgula — FFmpeg usa como sep.
    .replace(/\s+/g, ' ')
    .substring(0, 50)
    .trim();

  const safeHook = sanitize(hookText);
  const safeCTA  = sanitize(ctaText) || 'Segue pra mais IA';
  const ctaStart = Math.max(totalDuration - 7, 0);

  // Fontes Windows (fontfile evita precisar de fontconfig)
  const W_REG  = 'C:/Windows/Fonts/arial.ttf';
  const W_BOLD = 'C:/Windows/Fonts/arialbd.ttf';
  const fReg   = fs.existsSync(W_REG)  ? `fontfile=C\\:/Windows/Fonts/arial.ttf`   : null;
  const fBold  = fs.existsSync(W_BOLD) ? `fontfile=C\\:/Windows/Fonts/arialbd.ttf` : fReg;

  function dt(text, fontArg, size, y, enableExpr, hasBox = false, yMode = 'ratio') {
    let f = `drawtext=text=${text}`;
    if (fontArg) f += `:${fontArg}`;
    if (yMode === 'center') {
      f += `:fontcolor=white:fontsize=${size}:x=(w-text_w)/2:y=(h-text_h)/2`;
    } else {
      f += `:fontcolor=white:fontsize=${size}:x=(w-text_w)/2:y=h*${y}`;
    }
    f += `:shadowcolor=black@0.9:shadowx=3:shadowy=3`;
    if (hasBox) f += `:box=1:boxcolor=black@0.82:boxborderw=22`;
    if (enableExpr) f += `:enable=${enableExpr}`;
    return f;
  }

  const vfParts = [];

  // NOTA: o selo "NEURAL UPDATE" já vem composto nas imagens do neural-image-agent
  // (canto sup. esquerdo). Não duplicamos a marca no topo-centro aqui.

  // ── Legendas estilo Opus Clip (ASS karaokê com timing exato + acentos) ──
  let assRelPath = null;
  if (captionWords && captionWords.length) {
    const ass = buildAss(captionWords, { width: 1080, height: 1920 });
    fs.writeFileSync(path.join(jobDir, 'subs.ass'), ass, 'utf8');
    assRelPath = 'subs.ass';
    console.log(`[subs] Legenda Opus Clip (ASS karaokê) — ${captionWords.length} palavras com timing exato`);
  } else if (script && script.trim().length > 10) {
    // Fallback: legenda drawtext estimada (sem timing exato)
    vfParts.push(...generateSubtitleFilters(script, totalDuration, fReg));
  }

  // TikTok / Reels / Instagram: NUNCA headline sobre a imagem — só a legenda
  // no rodapé. (O hook e o CTA ficam na narração + na própria legenda karaokê.)

  // End-card de CTA na reta final (últimos ~7s): reforça "seguir a marca"
  if (safeCTA) {
    const ctaEnable = `between(t\\,${ctaStart.toFixed(2)}\\,${totalDuration.toFixed(2)})`;
    vfParts.push(dt(safeCTA, fBold, 58, '0.72', ctaEnable, true));
  }

  // Marca d'água discreta no canto inferior (vídeo todo)
  vfParts.push(dt('neural-update.com.br', fReg, 28, '0.94', null, false));

  // ASS (legenda karaokê) entra no início da cadeia; caminho relativo (cwd=jobDir) evita escape do Windows
  const vfString = (assRelPath ? `subtitles=${assRelPath},` : '') + vfParts.join(',');

  // ── Passo 6: render final (spawnSync) ─────────────────────────────────────
  const finalArgs = ['-i', concatPath];
  if (finalAudio) finalArgs.push('-i', finalAudio);
  finalArgs.push(
    '-vf', vfString,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-t', String(totalDuration)
  );
  if (finalAudio) {
    finalArgs.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
  }
  finalArgs.push('-y', outputPath);

  console.log('[ffmpeg] Render final...');
  const result = spawnSync(ffmpegStatic, finalArgs, {
    cwd: jobDir,               // p/ subtitles=subs.ass (caminho relativo, sem escape de C:\)
    timeout: 300000,
    maxBuffer: 50 * 1024 * 1024
  });

  if (result.status !== 0) {
    const err = (result.stderr || Buffer.alloc(0)).toString().slice(-2000);
    console.error('[ffmpeg] Erro:\n', err);
    throw new Error(`FFmpeg render final falhou (código ${result.status})`);
  }
  console.log('[ffmpeg] ✓ Vídeo final pronto');
}

module.exports = { createVideo, fetchImages };
