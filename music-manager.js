require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ffmpegStatic = require('ffmpeg-static');
const { spawnSync } = require('child_process');

const MUSIC_DIR = path.join(__dirname, 'assets', 'music');
if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });
// Trilhas REAIS royalty-free (Kevin MacLeod — domínio público / CC-BY). Prioritárias
// sobre a síntese. Arquivo prefixado pelo mood: cosmic-/dark-/tech-/news-/corp-/quantum-.
const REAL_DIR = path.join(__dirname, 'assets', 'music-real');

// ─────────────────────────────────────────────────────────────────────────────
// Trilhas 100% GERADAS LOCALMENTE com FFmpeg (sem rede, sem 403, som consistente).
// v3: pad enriquecido (2° harmônico + detune), swell LFO sin² (dinâmica dramática),
// shimmer de poeira estelar (Cosmic), bass sustentado drone (Cosmic),
// + novo bed "Quantum Tension" pra paradoxos e mistérios.
// Objetivo: soar como trilha de documentário científico (Interstellar / Cosmos).
// ─────────────────────────────────────────────────────────────────────────────
const BEDS = [
  { id: 'bed-tech-v2', name: 'Neural Tech', minor: false,
    mood: ['tech','ia','claude','openai','inovacao','futuro','positivo','digital','inteligencia','artificial','chatgpt','gemini','tutorial','como usar','como criar','aplicativo','ferramenta'],
    beat: 0.4839, kick: 60, sub: 55, bass: 110, arp: [440, 554, 659, 880],
    kickVol: 0.42, arpVol: 0.035, padVol: 0.040, hatVol: 0.10, hatDecay: 0.9,
    swellHz: 0.05, swellMin: 0.55,
    echo: '0.8:0.88:60:0.3', treble: 2 },
  { id: 'bed-news-v2', name: 'Breaking Impact', minor: true,
    mood: ['noticia','breaking','urgente','impacto','choque','demissao','corrida','disputa','regulacao','governo','mercado','brasil'],
    beat: 0.6, kick: 55, sub: 49, bass: 98, arp: [392, 466, 587, 784],
    kickVol: 0.46, arpVol: 0.032, padVol: 0.042, hatVol: 0.09, hatDecay: 0.9,
    swellHz: 0.06, swellMin: 0.50,
    echo: '0.8:0.88:70:0.32', treble: 1.5 },
  { id: 'bed-dark-v2', name: 'Dark Protocol', minor: true,
    // ⚠️ CONSERTO 25/07/2026: este mood ainda era do nicho VELHO (IA/tech: hacker,
    // deepfake, fraude). Nenhuma dessas palavras aparece em astronomia — resultado:
    // `dark-some-amount-of-evil`, a trilha de MELHOR retenção medida do canal
    // (147%, 144%), era INALCANÇÁVEL pelo roteador automático. Só entrava quando eu
    // passava a trilha na mão. Adicionadas as palavras de "astronomia sombria".
    // Cuidado ao mexer: termos que já vivem no mood cosmic (buraco negro, universo,
    // estrela) NÃO entram aqui, senão os dois moods empatam e a rota vira moeda.
    mood: ['morte','morrer','morto','fim de tudo','extincao','colapso','devora','devorando','engole','engolir',
           'dissolve','dissolver','solidao','sozinho','silencio','sombrio','assustador','ameaca','catastrofe',
           'apocalipse','vazio','escuro','escuridao','filtro','canibal','esmaga','violento',
           'golpe','deepfake','perigo','seguranca','hacker','virus','fraude','privacidade','vigilancia','alerta'],
    beat: 0.6667, kick: 50, sub: 41, bass: 82, arp: [330, 392, 494, 622],
    kickVol: 0.44, arpVol: 0.026, padVol: 0.046, hatVol: 0.04, hatDecay: 0.85,
    swellHz: 0.045, swellMin: 0.40,
    echo: '0.82:0.9:90:0.38', treble: 0.5 },
  { id: 'bed-corp-v2', name: 'Momentum', minor: false,
    mood: ['emprego','dinheiro','trabalho','carreira','salario','negocio','investimento','curriculo','vaga','profissao'],
    beat: 0.5357, kick: 58, sub: 65, bass: 131, arp: [523, 659, 784, 1047],
    kickVol: 0.42, arpVol: 0.030, padVol: 0.040, hatVol: 0.10, hatDecay: 0.9,
    swellHz: 0.055, swellMin: 0.55,
    echo: '0.8:0.88:55:0.28', treble: 2 },
  // ── Cosmic Awe v3: os campeões do canal (buraco negro, quântica, universo).
  // Sem kick, bass sustentado como drone, shimmer de "poeira estelar", swell profundo.
  // Soa como Interstellar / Cosmos — sensação de imensidão (awe), não de batida.
  { id: 'bed-cosmic-v3', name: 'Cosmic Drift', minor: true,
    mood: ['buraco negro','quantic','schrodinger','schrödinger','universo','espaco','cosmos','estrela','galaxia','fermi','alien','misterio','tempo','relatividade','fisica','ciencia','cerebro','borboleta','multiverso','hawking','materia escura','neutron','luz','gravidade','big bang','espagueti','simulacao','imensidao','poeira','viagem','expansao','ondas gravitacionais','antimateria','antimat','big rip'],
    beat: 2.0, kick: 0, sub: 36, bass: 72, arp: [288, 360, 432, 576],
    kickVol: 0.0, arpVol: 0.012, padVol: 0.068, hatVol: 0.0, hatDecay: 0.0,
    swellHz: 0.034, swellMin: 0.12,          // swell profundo: 0.12→1.0 em ~15s
    shimmerVol: 0.008, shimmerHz: 2600,      // brilho etéreo tipo "poeira de estrelas"
    sustainedBass: true, bassVol: 0.082,
    echo: '0.88:0.95:280:0.54', treble: -2 },
  // ── Quantum Tension v1: paradoxos, incertezas e impossibilidades.
  // Pulsante, levemente tenso — para mistérios que o viewer não consegue ignorar.
  { id: 'bed-quantum-tension', name: 'Quantum Tension', minor: true,
    mood: ['paradoxo','incerteza','impossivel','muitos mundos','zeno','observador','colapso','espaguetificacao','informacao','misterioso','estranha','estranheza','heisenberg','impossibilidade','seta do tempo','incerto'],
    beat: 0.8, kick: 52, sub: 39, bass: 78, arp: [311, 370, 466, 622],
    kickVol: 0.18, arpVol: 0.025, padVol: 0.040, hatVol: 0.025, hatDecay: 0.72,
    swellHz: 0.055, swellMin: 0.38,
    echo: '0.84:0.92:110:0.42', treble: 0.5 },
];

// Em aevalsrc a VÍRGULA separa filtros → a expressão NÃO pode usar funções com
// vírgula (between/mod/floor/pow). Ritmo via tremolo senoidal (pulse).
function pulse(hz, n) {
  const g = `(0.5+0.5*sin(2*PI*${hz}*t))`;
  return Array(n).fill(g).join('*');
}

function buildBedExpr(p, phase = 0) {
  const P  = (1 / p.beat).toFixed(4);
  const P2 = (2 / p.beat).toFixed(4);
  const ph = phase ? `+${phase}` : '';

  // Arpejo: notas com envelope defasado → melodia suave
  const arp = p.arp
    .map((f, i) => `${p.arpVol}*sin(2*PI*${f}*t${ph})*(0.5+0.5*sin(2*PI*${P2}*t+${(i * 1.7).toFixed(2)}))`)
    .join('+');

  // Pad enriquecido: fundamental + 2° harmônico + detune → timbre mais quente (vs puro seno v2)
  const root  = p.bass / 2;
  const third = root * (p.minor ? 1.2 : 1.25);
  const fifth = root * 1.5;
  const richVoice = f => `(sin(2*PI*${f.toFixed(2)}*t)+0.45*sin(2*PI*${(f * 2).toFixed(2)}*t)+sin(2*PI*${(f * 1.004).toFixed(2)}*t))`;
  // Swell LFO via sin²: curva suave 0→peak→0. Começa no silêncio, cresce dramaticamente.
  const swHz  = (p.swellHz  || 0.04).toFixed(4);
  const swMin = parseFloat((p.swellMin || 0.40).toFixed(2));
  const swAmp = (1 - swMin).toFixed(2);
  const swell = `(${swMin.toFixed(2)}+${swAmp}*sin(2*PI*${swHz}*t${ph})*sin(2*PI*${swHz}*t${ph}))`;
  const pad   = `${(p.padVol / 2).toFixed(4)}*(${richVoice(root)}+${richVoice(third)}+${richVoice(fifth)})*${swell}`;

  // Shimmer (opcional, só Cosmic): partials altas com 2 LFOs → piscam como estrelas distantes
  const shimmer = p.shimmerVol
    ? `+${p.shimmerVol.toFixed(4)}*sin(2*PI*${p.shimmerHz || 2200}*t)*(0.5+0.5*sin(2*PI*0.083*t))*(0.5+0.5*sin(2*PI*0.131*t${ph}))`
    : '';

  // Bass: drone sustentado (cosmic/awe) ou pulsante (beat/ritmo)
  let bassLayers;
  if (p.sustainedBass) {
    const bv = (p.bassVol || 0.09).toFixed(3);
    // drone = root + sub combinados → fundação contínua, nada de pulsação
    bassLayers = [`${bv}*(sin(2*PI*${p.bass}*t${ph})+0.6*sin(2*PI*${p.sub}*t))`];
  } else {
    bassLayers = [
      `0.07*sin(2*PI*${p.sub}*t)`,
      `0.11*sin(2*PI*${p.bass}*t${ph})*${pulse(P, 2)}`,
      `0.04*sin(2*PI*${(p.bass * 2).toFixed(2)}*t${ph})*${pulse(P, 2)}`,
    ];
  }

  const layers = [
    `${p.kickVol}*sin(2*PI*${p.kick || 1}*t)*${pulse(P, 3)}`,
    ...bassLayers,
    arp,
    pad + shimmer,
  ];
  return layers.join('+');
}

function generateMusicBed(p, destPath, duration = 90) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100000) return destPath;
  const L = buildBedExpr(p, 0);
  const R = buildBedExpr(p, 0.08);
  const hatHz = (4 / p.beat).toFixed(4); // semicolcheia → chimbal/shaker

  const result = spawnSync(ffmpegStatic, [
    '-f', 'lavfi', '-i', `aevalsrc=${L}|${R}:sample_rate=44100:c=stereo`,
    '-f', 'lavfi', '-i', `anoisesrc=color=white:sample_rate=44100:amplitude=0.6`,
    '-filter_complex',
      // chimbal/shaker: ruído filtrado no agudo + gate rítmico (tremolo)
      `[1:a]bandpass=f=9000:width_type=h:w=7000,tremolo=f=${hatHz}:d=${p.hatDecay},volume=${p.hatVol},aformat=channel_layouts=stereo[hats];` +
      // mistura tonal + chimbal e masteriza (corte de sub, brilho/espaço por mood, limiter, loudnorm)
      `[0:a][hats]amix=inputs=2:weights=1 1:normalize=0,` +
      `highpass=f=28,treble=g=${p.treble}:f=8000,aecho=${p.echo},dynaudnorm=f=160:g=6,alimiter=limit=0.93,loudnorm=I=-15:TP=-1.5:LRA=11[out]`,
    '-map', '[out]',
    '-t', String(duration),
    '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k',
    '-y', destPath
  ], { timeout: 90000 });

  if (result.status === 0 && fs.existsSync(destPath) && fs.statSync(destPath).size > 50000) {
    console.log(`[music] ✓ ${p.name} gerada (${Math.round(fs.statSync(destPath).size / 1024)}KB)`);
    return destPath;
  }
  console.warn(`[music] Falha ao gerar ${p.name}:`, (result.stderr || '').toString().slice(-300));
  return null;
}

let _cachedTracks = null;

// Lê os MP3 reais de music-real/ e herda o mood do bed correspondente (por prefixo do nome).
function loadRealTracks() {
  if (!fs.existsSync(REAL_DIR)) return [];
  const files = fs.readdirSync(REAL_DIR).filter(f => /\.(mp3|m4a|wav|ogg)$/i.test(f));
  const out = [];
  for (const f of files) {
    const prefix = f.split(/[-_.]/)[0].toLowerCase();
    const bed = BEDS.find(b => b.id.includes(prefix));
    if (!bed) { console.warn(`[music] arquivo ${f} sem mood (prefixo "${prefix}") — ignorado`); continue; }
    out.push({ id: f.replace(/\.[^.]+$/, ''), name: f, mood: bed.mood, path: path.join(REAL_DIR, f), real: true });
  }
  return out;
}

async function ensureMusicCached() {
  if (_cachedTracks) return _cachedTracks;
  // 1) Prioriza trilhas REAIS royalty-free (qualidade profissional, sem som sintético).
  const real = loadRealTracks();
  if (real.length) {
    console.log(`[music] ${real.length} trilha(s) REAL(is) royalty-free de music-real/`);
    _cachedTracks = real;
    return real;
  }
  // 2) Fallback: síntese local via FFmpeg (se music-real/ estiver vazia).
  const tracks = [];
  for (const bed of BEDS) {
    const dest = path.join(MUSIC_DIR, `${bed.id}.mp3`);
    const p = generateMusicBed(bed, dest);
    if (p) tracks.push({ id: bed.id, name: bed.name, mood: bed.mood, path: p });
  }
  console.log(`[music] ${tracks.length} trilha(s) sintetizada(s) (fallback)`);
  _cachedTracks = tracks;
  return tracks;
}

// normaliza acentos: "mecânica quântica" → "mecanica quantica" (os moods são sem acento)
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const TRACK_HISTORY_FILE = path.join(__dirname, 'data', 'track-history.json');
function loadTrackHistory() {
  try { return JSON.parse(fs.readFileSync(TRACK_HISTORY_FILE, 'utf8')); } catch { return []; }
}
function saveTrackHistory(history) {
  try {
    fs.mkdirSync(path.dirname(TRACK_HISTORY_FILE), { recursive: true });
    fs.writeFileSync(TRACK_HISTORY_FILE, JSON.stringify(history.slice(-20), null, 2));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// PESO POR DESEMPENHO (medido 25/07/2026 — ver memória `trilha-sonora-estrategia`).
// A escolha entre faixas do mesmo mood era SORTEIO PURO: trilha ruim saía tanto
// quanto trilha boa. Agora é sorteio PONDERADO.
//
// ⚠️ REGRA: nenhum peso pode ser 0. Peso 0 mataria o teste — e a amostra de hoje
// (n=2 a n=5, confundida com formato) é SINAL, não lei. Se a leitura estiver
// errada, a faixa penalizada ainda aparece de vez em quando e se corrige sozinha.
//
// Base: retenção média, comparada DENTRO do mesmo formato (aula/saga) — único
// jeito de separar o efeito da música do efeito do conteúdo.
//   dark-some-amount-of-evil  147% 144% 80% 66% 57%   melhor nos 2 formatos
//   corp-upbeat-forever        85%
//   quantum-investigations    103% 50% 43% 36%
//   cosmic-ice-flow            67% 62% 57% 45%        4 dos 10 vídeos MENOS vistos
//   news-rising-tide           58%                    usada 2x, as 2 no fundo
//   (tech-pixelland tinha 121% mas está BANIDA por decisão dele — segue na quarentena)
// Revisar quando a amostra dobrar: node trilha-report.js
// 🚫 quantum-investigations: BANIDA em 06/08/2026 por decisão do Marcelo (ele odeia a faixa).
//    Arquivo movido pra assets/music-real/_quarentena/. Não devolver o peso aqui nem o arquivo lá.
//    Causa da irritação: saiu em 6 dos 10 últimos vídeos e 5 SEGUIDAS — porque os scripts de lote
//    passam a trilha na mão e pulam este sorteio ponderado. Ver aviso anti-repetição no
//    make-short-img-flex.js.
const TRACK_WEIGHT = {
  'dark-some-amount-of-evil': 4,
  'corp-upbeat-forever':      2,
  'dark-tension-pixabay':     2, // sem dado ainda — peso neutro pra gerar amostra
  'cosmic-ambient-espacial':  2, // sem dado ainda — peso neutro pra gerar amostra
  'cosmic-ice-flow':          1,
  'news-rising-tide':         1,
};
const DEFAULT_WEIGHT = 2;
const weightOf = track => (TRACK_WEIGHT[track.id] !== undefined ? TRACK_WEIGHT[track.id] : DEFAULT_WEIGHT);

// sorteio ponderado: cada faixa ocupa uma fatia proporcional ao peso
function weightedPick(pool) {
  const total = pool.reduce((s, t) => s + weightOf(t), 0);
  let r = Math.random() * total;
  for (const t of pool) { r -= weightOf(t); if (r <= 0) return t; }
  return pool[pool.length - 1];
}

function selectTrackForTopic(topic, cachedTracks) {
  if (!cachedTracks?.length) return null;
  const t = norm(topic);
  // fronteira de palavra (evita "vaga" casar com "devagar") + pontua por nº de hits
  const hits = m => new RegExp('\\b' + norm(m).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(t) ? 1 : 0;
  let bestScore = 0;
  const scored = cachedTracks.map(track => {
    const score = track.mood.reduce((s, m) => s + hits(m), 0);
    if (score > bestScore) bestScore = score;
    return { track, score };
  });
  // Entre as faixas de maior score (mesmo mood), sorteia → varia a trilha a cada vídeo.
  const top = bestScore > 0 ? scored.filter(s => s.score === bestScore).map(s => s.track) : cachedTracks;

  // Anti-repetição: evita repetir as últimas 2 trilhas usadas, se houver opção.
  // Pool de "cosmic" e "quantum" é pequeno (3 e 1 faixas) — sem isso, sorteio puro
  // repetia a mesma faixa 3 de 4 vídeos seguidos.
  const history = loadTrackHistory();
  // ⚠️ Só aplica anti-repetição quando o mood tem 3+ faixas. Com pool de 2, excluir
  // as 2 últimas força alternância 50/50 e ANULA o TRACK_WEIGHT (medido: 55/45 em
  // vez dos 67/33 esperados). Em pool pequeno quem manda é o peso — que já garante
  // variação suficiente (a faixa fraca continua saindo ~1/3 das vezes = o teste segue).
  const recentIds = new Set(top.length > 2 ? history.slice(-2).map(h => h.id) : []);
  const fresh = top.filter(track => !recentIds.has(track.id));
  const pool = fresh.length ? fresh : top; // se só tem 1 opção no mood, repete mesmo (inevitável)
  const chosen = weightedPick(pool); // ponderado por desempenho, ver TRACK_WEIGHT

  history.push({ id: chosen.id, at: new Date().toISOString() });
  saveTrackHistory(history);
  return chosen;
}

module.exports = { ensureMusicCached, selectTrackForTopic };
