const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');

const VOICES = {
  female: 'pt-BR-ThalitaMultilingualNeural',
  male: 'pt-BR-AntonioNeural',
  englishFemale: 'en-US-JennyNeural',
  englishMale: 'en-US-GuyNeural',
  fallback: 'pt-BR-FranciscaNeural',
};

const VOICE_CHAIN = {
  female: ['pt-BR-ThalitaMultilingualNeural', 'pt-BR-ThalitaNeural', 'pt-BR-FranciscaNeural'],
  male: ['pt-BR-AntonioNeural', 'pt-BR-FranciscaNeural'],
  englishFemale: ['en-US-JennyNeural', 'en-US-AriaNeural'],
  englishMale: ['en-US-GuyNeural', 'en-US-ChristopherNeural', 'en-US-JennyNeural'],
};

// PAUSA_TTS: multiplicador de respiro entre frases (longo pede mais que Short).
// Pedido do Marcelo em 21/08: "o vídeo fala muito rápido e fica difícil entender".
const PAUSA = Number(process.env.PAUSA_TTS || 1);

function countWords(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean).length;
}

function buildSpeechSegments(text) {
  const raw = String(text || '')
    .replace(/\s+/g, ' ')
    .match(/[^.!?;:,]+[.!?;:,]?/g) || [text];

  const segments = [];
  let buffer = '';
  for (const chunk of raw) {
    const part = chunk.trim();
    if (!part) continue;
    buffer = buffer ? `${buffer} ${part}` : part;
    const punct = /[.!?;:,]$/.test(part) ? part.slice(-1) : '';
    const enough = countWords(buffer) >= 3;
    const strong = /[.!?]/.test(punct);
    const medium = /[;:]/.test(punct);
    const comma = punct === ',';

    if (strong || medium || (comma && enough)) {
      segments.push({
        text: buffer.replace(/,$/, '').trim(),
        gapAfter: (strong ? 0.24 : medium ? 0.18 : 0.12) * PAUSA
      });
      buffer = '';
    }
  }
  if (buffer.trim()) segments.push({ text: buffer.trim(), gapAfter: 0.2 * PAUSA });
  return segments.filter(s => s.text.length > 1);
}

function mergeLongSpeechSegments(segments, maxWords = 38) {
  const merged = [];
  let buffer = '';
  let gapAfter = 0.2;
  for (const seg of segments) {
    const candidate = buffer ? `${buffer} ${seg.text}` : seg.text;
    if (buffer && countWords(candidate) > maxWords) {
      merged.push({ text: buffer, gapAfter });
      buffer = seg.text;
    } else {
      buffer = candidate;
    }
    gapAfter = seg.gapAfter;
  }
  if (buffer.trim()) merged.push({ text: buffer.trim(), gapAfter });
  return merged;
}

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

async function generateTTSWithTimings(text, outputPath, voice = 'female') {
  const cleanText = (text || '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/["""''«»]/g, '') // aspas quebram o Edge TTS (trunca o áudio) — remover sempre
    .replace(/\s+/g, ' ')
    .trim();

  let segments = buildSpeechSegments(cleanText);
  if (countWords(cleanText) > 350) {
    segments = mergeLongSpeechSegments(segments);
  }
  const chain = VOICE_CHAIN[voice] || VOICE_CHAIN.female;
  const dir = path.dirname(outputPath);

  const audioItems = [];
  const allWords = [];
  const sentenceTimings = [];
  let cursor = 0;
  let voiceName = null;

  for (let i = 0; i < segments.length; i++) {
    const part = path.join(dir, `s_${i}.mp3`);

    // MARCADOR ">>" = FALA ACELERADA neste trecho (13/08/2026, pedido do Marcelo).
    // Nasceu da aula: "senti que metade do vídeo era ela falando o bordão e a próxima
    // aula". O anúncio da próxima aula é obrigatório (cria encontro marcado), mas é
    // recado, não conteúdo — então ele passa mais rápido e devolve segundos pro ensino.
    // Como o TTS já sintetiza SEGMENTO a segmento e soma o cursor, o trecho acelerado
    // entra com a duração real dele e as legendas continuam sincronizadas sozinhas.
    // TTS_RATE_BASE: ritmo de TODOS os segmentos. O longo pede fala mais lenta —
    // pedido do Marcelo em 21/08 ("fala muito rápido e fica difícil entender").
    // Vazio = ritmo natural, então Short nenhum muda.
    // TTS_PITCH_BASE (ex.: '-2Hz'): tom do segmento. Usado pelo narrador "humano" do longo, que varia
    // ritmo e tom frase a frase. Vazio = igual a antes.
    let prosody = process.env.TTS_RATE_BASE || process.env.TTS_PITCH_BASE
      ? { ...(process.env.TTS_RATE_BASE ? { rate: process.env.TTS_RATE_BASE } : {}), ...(process.env.TTS_PITCH_BASE ? { pitch: process.env.TTS_PITCH_BASE } : {}) }
      : null;
    if (/^\s*>>/.test(segments[i].text)) {
      segments[i].text = segments[i].text.replace(/^\s*>>\s*/, '');
      prosody = { rate: process.env.TTS_RATE_RAPIDO || '+22%' };
    }

    let result = null;
    for (const v of (voiceName ? [voiceName] : chain)) {
      try {
        result = await synthWithBoundaries(segments[i].text, part, v, prosody);
        if (result && fs.existsSync(part) && fs.statSync(part).size > 700) {
          voiceName = v;
          break;
        }
      } catch {
        // Try the next voice.
      }
    }
    if (!result || !fs.existsSync(part)) continue;

    // TTS_CORTA_CAUDA=1: o Edge deixa ~1,3 s de silêncio depois de TODA pergunta (medido 24/09). Corta a cauda
    // muda de cada segmento (fica ~0,1 s) e deixa só o gapAfter decidir a pausa. Padrão desligado.
    if (process.env.TTS_CORTA_CAUDA === '1') {
      const cut = part.replace(/\.mp3$/, '_c.mp3');
      const rc = spawnSync(ffmpegStatic, ['-hide_banner', '-loglevel', 'error', '-i', part, '-af',
        'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,areverse', '-y', cut], { timeout: 20000 });
      if (rc.status === 0 && fs.existsSync(cut) && fs.statSync(cut).size > 700) fs.renameSync(cut, part);
    }
    const dur = getAudioDurationSync(part);
    // O Edge TTS não emite a pontuação como token → a pergunta final ficava sem "?".
    // Reanexa ? ! … pegando do roteiro original por índice (só quando o token casa com a palavra).
    const segToks = segments[i].text.split(/\s+/);
    (result.words || []).forEach((w, j) => {
      let text = w.text;
      const tk = segToks[j];
      if (tk) {
        const m = tk.match(/[?!…]+$/);
        if (m && tk.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').startsWith(w.text.toLowerCase().slice(0, 3))) {
          text += m[0];
        }
      }
      allWords.push({
        text,
        start: +(cursor + w.start).toFixed(3),
        end: +(cursor + w.end).toFixed(3),
      });
    });
    sentenceTimings.push({ start: +cursor.toFixed(3), end: +(cursor + dur).toFixed(3) });
    audioItems.push(part);
    cursor += dur;

    if (i < segments.length - 1) {
      const gapPath = path.join(dir, `_sil_${i}.mp3`);
      const gap = segments[i].gapAfter;
      spawnSync(ffmpegStatic, ['-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(gap), '-q:a', '9', '-y', gapPath], { timeout: 20000 });
      if (fs.existsSync(gapPath)) {
        audioItems.push(gapPath);
        cursor += gap;
      }
    }
  }

  if (!audioItems.length) {
    await generateEdgeTTS(cleanText, outputPath, VOICES.fallback);
    return { audioPath: outputPath, words: null, sentenceTimings: null };
  }

  const listFile = path.join(dir, '_tts_list.txt');
  fs.writeFileSync(listFile, audioItems.map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n'));
  const res = spawnSync(ffmpegStatic, ['-f', 'concat', '-safe', '0', '-i', listFile, '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', '24000', '-y', outputPath], { timeout: 60000 });

  [...audioItems, listFile].forEach(p => {
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
  });

  if (res.status === 0 && fs.existsSync(outputPath)) {
    console.log(`[tts] ${segments.length} grupos de fala | voz ${voiceName} | ${allWords.length} palavras com timing`);
    return { audioPath: outputPath, words: allWords.length ? allWords : null, sentenceTimings };
  }

  await generateEdgeTTS(cleanText, outputPath, VOICES.fallback);
  return { audioPath: outputPath, words: null, sentenceTimings: null };
}

function synthWithBoundaries(text, outputPath, voiceName, prosody) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (val, err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      err ? reject(err) : resolve(val);
    };
    const timer = setTimeout(() => finish(null, new Error('timeout 90s')), 90000);

    (async () => {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
      // `prosody` chega só quando o segmento pede ritmo diferente (ver o marcador ">>"
      // em generateTTSWithTimings). Sem ele, a chamada é idêntica à de antes.
      const { audioStream, metadataStream } = prosody ? tts.toStream(text, prosody) : tts.toStream(text);

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
          } catch {
            // Ignore partial metadata chunks.
          }
        });
      }

      let audioDone = false;
      let metaDone = !metadataStream;
      const maybe = () => {
        if (audioDone && metaDone) finish({ audioPath: outputPath, words: words.length ? words : null });
      };

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
  const result = spawnSync(ffmpegStatic, ['-i', filePath], { timeout: 10000 });
  const output = (result.stderr || Buffer.alloc(0)).toString();
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  if (match) {
    return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseFloat(match[3]);
  }
  return 1.5;
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
        if (err) { console.warn('[tts] Google TTS falhou tambem'); return resolve(null); }
        console.log('[tts] Google TTS (fallback):', path.basename(outputPath));
        resolve(outputPath);
      });
    } catch {
      resolve(null);
    }
  });
}

module.exports = { generateTTS, generateTTSWithTimings };
