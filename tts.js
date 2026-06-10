const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');

// Vozes PT-BR neurais (Microsoft Edge TTS - gratuito)
// Multilingual = geração mais recente, soa bem mais natural que a Francisca.
const VOICES = {
  female: 'pt-BR-ThalitaMultilingualNeural',
  male:   'pt-BR-AntonioNeural',
  fallback: 'pt-BR-FranciscaNeural',
};
// Cadeia de fallback (se a 1ª voz falhar, tenta a próxima)
const VOICE_CHAIN = {
  female: ['pt-BR-ThalitaMultilingualNeural', 'pt-BR-ThalitaNeural', 'pt-BR-FranciscaNeural'],
  male:   ['pt-BR-AntonioNeural', 'pt-BR-FranciscaNeural'],
};

// Gera TTS e retorna path do áudio
async function generateTTS(text, outputPath, voice = 'female') {
  const voiceName = VOICES[voice] || VOICES.female;
  try {
    await generateEdgeTTS(text, outputPath, voiceName);
    console.log(`[tts] Neural TTS gerado (${voiceName}):`, path.basename(outputPath));
    return outputPath;
  } catch (err) {
    console.warn('[tts] Edge TTS falhou:', err.message);
    return fallbackTTS(text, outputPath);
  }
}

// Gera TTS em UMA passada (prosódia natural) + captura word boundaries
// (timing EXATO por palavra) pra legenda karaokê.
// Retorna { audioPath, words: [{text, start, end}] }
async function generateTTSWithTimings(text, outputPath, voice = 'female') {
  const cleanText = (text || '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Frases (cada uma vira um pedaço com prosódia natural; respiro entre elas)
  const sentences = cleanText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 1);
  const chain = VOICE_CHAIN[voice] || VOICE_CHAIN.female;
  const dir = path.dirname(outputPath);
  const GAP = 0.5; // pausa entre frases (segundos) — voz mais calma entre as cenas

  const partFiles = [];
  const allWords = [];
  const sentenceTimings = []; // janela de tempo de cada frase (pra sincronizar imagens)
  let cursor = 0;
  let voiceName = null;

  for (let i = 0; i < sentences.length; i++) {
    const part = path.join(dir, `s_${i}.mp3`);
    let r = null;
    for (const v of (voiceName ? [voiceName] : chain)) {
      try {
        r = await synthWithBoundaries(sentences[i], part, v);
        if (r && fs.existsSync(part) && fs.statSync(part).size > 700) { voiceName = v; break; }
      } catch (e) { /* tenta próxima voz */ }
    }
    if (!r || !fs.existsSync(part)) continue;
    const dur = getAudioDurationSync(part);
    (r.words || []).forEach(w => allWords.push({
      text: w.text,
      start: +(cursor + w.start).toFixed(3),
      end: +(cursor + w.end).toFixed(3),
    }));
    sentenceTimings.push({ start: +cursor.toFixed(3), end: +(cursor + dur).toFixed(3) });
    partFiles.push(part);
    cursor += dur + GAP;
  }

  if (!partFiles.length) {
    await generateEdgeTTS(cleanText, outputPath, VOICES.fallback);
    return { audioPath: outputPath, words: null };
  }

  // Silêncio entre frases + concatena tudo num áudio só
  const silence = path.join(dir, '_sil.mp3');
  spawnSync(ffmpegStatic, ['-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(GAP), '-q:a', '9', '-y', silence], { timeout: 20000 });
  const items = [];
  partFiles.forEach((p, idx) => { items.push(p); if (idx < partFiles.length - 1 && fs.existsSync(silence)) items.push(silence); });
  const listFile = path.join(dir, '_tts_list.txt');
  fs.writeFileSync(listFile, items.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  const res = spawnSync(ffmpegStatic, ['-f', 'concat', '-safe', '0', '-i', listFile, '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', '24000', '-y', outputPath], { timeout: 60000 });

  partFiles.forEach(p => { try { fs.unlinkSync(p); } catch {} });
  try { fs.unlinkSync(silence); } catch {}
  try { fs.unlinkSync(listFile); } catch {}

  if (res.status === 0 && fs.existsSync(outputPath)) {
    console.log(`[tts] ${sentences.length} frases c/ pausa ${GAP}s | voz ${voiceName} | ${allWords.length} palavras com timing`);
    return { audioPath: outputPath, words: allWords.length ? allWords : null, sentenceTimings };
  }
  await generateEdgeTTS(cleanText, outputPath, VOICES.fallback);
  return { audioPath: outputPath, words: null, sentenceTimings: null };
}

// Sintetiza o texto inteiro de uma vez, coletando word boundaries.
function synthWithBoundaries(text, outputPath, voiceName) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (val, err) => { if (settled) return; settled = true; clearTimeout(timer); err ? reject(err) : resolve(val); };
    const timer = setTimeout(() => finish(null, new Error('timeout 90s')), 90000);

    (async () => {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
      const { audioStream, metadataStream } = tts.toStream(text);

      const words = [];
      if (metadataStream) {
        metadataStream.on('data', (chunk) => {
          try {
            const obj = JSON.parse(chunk.toString());
            for (const m of (obj.Metadata || [])) {
              if (m.Type === 'WordBoundary' && m.Data) {
                const t = m.Data.text || {};
                if (t.Text) words.push({
                  text: t.Text,
                  start: m.Data.Offset / 1e7,
                  end: (m.Data.Offset + m.Data.Duration) / 1e7,
                });
              }
            }
          } catch { /* ignora chunk inválido */ }
        });
      }

      let audioDone = false;
      let metaDone = !metadataStream;
      const maybe = () => { if (audioDone && metaDone) finish({ audioPath: outputPath, words: words.length ? words : null }); };

      const out = fs.createWriteStream(outputPath);
      audioStream.pipe(out);
      out.on('finish', () => { audioDone = true; maybe(); });
      out.on('error', (e) => finish(null, e));
      audioStream.on('error', (e) => finish(null, e));
      if (metadataStream) {
        metadataStream.on('close', () => { metaDone = true; maybe(); });
        metadataStream.on('end', () => { metaDone = true; maybe(); });
        metadataStream.on('error', () => { metaDone = true; maybe(); });
      }
    })().catch((e) => finish(null, e));
  });
}

function getAudioDurationSync(filePath) {
  const result = spawnSync(ffmpegStatic, ['-i', filePath], {
    timeout: 10000
  });
  const output = (result.stderr || Buffer.alloc(0)).toString();
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  if (match) {
    return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
  }
  return 1.5; // fallback
}

async function generateEdgeTTS(text, outputPath, voiceName) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  return new Promise((resolve, reject) => {
    const { audioStream } = tts.toStream(text);
    const out = fs.createWriteStream(outputPath);
    audioStream.pipe(out);
    out.on('finish', resolve);
    out.on('error', reject);
    audioStream.on('error', reject);
  });
}

async function fallbackTTS(text, outputPath) {
  console.log('[tts] Tentando Google TTS como fallback...');
  return new Promise((resolve) => {
    try {
      const gtts = require('node-gtts')('pt');
      gtts.save(outputPath, text, (err) => {
        if (err) { console.warn('[tts] Google TTS falhou também'); return resolve(null); }
        console.log('[tts] Google TTS (fallback):', path.basename(outputPath));
        resolve(outputPath);
      });
    } catch { resolve(null); }
  });
}

module.exports = { generateTTS, generateTTSWithTimings };
