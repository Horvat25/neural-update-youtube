'use strict';

// =====================================================================
// ASS CAPTIONS — Legenda estilo "Opus Clip" via libass.
// Recebe palavras com timing EXATO (word boundaries do Edge TTS) e gera
// um arquivo .ass com: fonte grande + contorno grosso (sem caixa),
// acentos preservados (UTF-8) e a PALAVRA ATIVA destacada (karaokê).
// =====================================================================

function toAssTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.round((sec - Math.floor(sec)) * 100);
  const cc = cs >= 100 ? 99 : cs;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cc).padStart(2, '0')}`;
}

// Mantém só palavras "de verdade" (descarta boundaries de pontuação pura)
function isRealWord(w) {
  return w && w.text && /[\p{L}\p{N}]/u.test(w.text);
}

function buildAss(words, opts = {}) {
  const {
    width = 1080,
    height = 1920,
    group = 2,            // 2 palavras por grupo — nunca quebra linha, posição 100% estável
    fontName = 'Arial',
    fontSize = 88,        // grande o suficiente para ser lido em tela de celular
    highlight = '&H0000FFFF&', // amarelo (#FFFF00) — padrão viral Shorts/TikTok, máximo contraste
    marginV = 360,        // mais alto do rodapé (não sobrepõe o botão de curtir do YouTube)
    outline = 8,          // contorno mais grosso = legível sobre qualquer imagem
    shadow = 2,
    uppercase = true,
    maxGap = Infinity,    // pausa maior que isso inicia um novo grupo visual
  } = opts;

  // Mantém só palavras reais, MAS anexa pontuação de impacto (? ! …) à palavra anterior
  // (o Edge TTS manda "?" como token separado; sem isso a pergunta final fica sem "?").
  const clean = [];
  for (const w of (words || [])) {
    const t = (w.text || '');
    if (isRealWord(w)) {
      clean.push({
        text: (uppercase ? t.toUpperCase() : t).replace(/[{}\\]/g, ''),
        start: w.start,
        end: w.end,
      });
    } else {
      const keep = (t.match(/[?!…]/g) || []).join('');
      if (keep && clean.length) clean[clean.length - 1].text += keep;
    }
  }

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,${fontName},${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,${outline},${shadow},2,90,90,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Posição explícita fixada: bottom-center a marginV do rodapé — nunca se move
  const posY = height - marginV;
  const posTag = `{\\an2\\pos(${Math.round(width / 2)},${posY})}`;

  // Agrupa palavras e destaca a palavra ativa. Pausas longas podem reiniciar
  // o agrupamento para não antecipar visualmente a próxima frase.
  const events = [];
  const blocks = [];
  let block = [];
  for (const word of clean) {
    const previous = block[block.length - 1];
    if (previous && word.start - previous.end > maxGap) {
      blocks.push(block);
      block = [];
    }
    block.push(word);
  }
  if (block.length) blocks.push(block);

  for (const captionBlock of blocks) {
    for (let i = 0; i < captionBlock.length; i += group) {
      const line = captionBlock.slice(i, i + group);
      for (let j = 0; j < line.length; j++) {
        const w = line[j];
        const next = line[j + 1];
        // Sem próxima palavra no grupo → estende até o início do próximo grupo (sem piscar entre grupos)
        const nextGroupWord = !next ? captionBlock[i + group] : null;
        const end = next ? next.start : (nextGroupWord ? nextGroupWord.start : w.end);
        const text = line
          .map((x, idx) => (idx === j ? `{\\1c${highlight}\\b1}${x.text}{\\r}` : x.text))
          .join(' ');
        events.push(`Dialogue: 0,${toAssTime(w.start)},${toAssTime(Math.max(end, w.start + 0.12))},Cap,,0,0,0,,${posTag}${text}`);
      }
    }
  }

  return header + events.join('\n') + '\n';
}

module.exports = { buildAss };
