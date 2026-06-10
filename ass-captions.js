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
    group = 3,            // palavras por linha de legenda
    fontName = 'Arial',
    fontSize = 74,        // um pouco maior
    highlight = '&H00FFBB33&', // cor da palavra ativa (BGR de #33bbff — azul Neural)
    marginV = 270,        // sobe um pouco do rodapé (parte de baixo, mas não colado)
    outline = 6,
    shadow = 3,
    uppercase = true,
  } = opts;

  const clean = (words || []).filter(isRealWord).map(w => ({
    text: (uppercase ? w.text.toUpperCase() : w.text).replace(/[{}\\]/g, ''),
    start: w.start,
    end: w.end,
  }));

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

  // Agrupa em linhas e destaca a palavra ativa (um evento por palavra)
  const events = [];
  for (let i = 0; i < clean.length; i += group) {
    const line = clean.slice(i, i + group);
    for (let j = 0; j < line.length; j++) {
      const w = line[j];
      // a palavra ativa fica até o início da próxima (sem buracos)
      const next = line[j + 1];
      const end = next ? next.start : w.end;
      const text = line
        .map((x, idx) => (idx === j ? `{\\1c${highlight}\\b1}${x.text}{\\r}` : x.text))
        .join(' ');
      events.push(`Dialogue: 0,${toAssTime(w.start)},${toAssTime(Math.max(end, w.start + 0.12))},Cap,,0,0,0,,${text}`);
    }
  }

  return header + events.join('\n') + '\n';
}

module.exports = { buildAss };
