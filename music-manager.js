require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ffmpegStatic = require('ffmpeg-static');
const { spawnSync } = require('child_process');

const MUSIC_DIR = path.join(__dirname, 'assets', 'music');
if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// Trilhas 100% GERADAS LOCALMENTE com FFmpeg (sem rede, sem 403, som consistente).
// Cada bed: kick + sub + baixo pulsante + arpejo + PAD EM TRÍADE + chimbal/shaker
// de ruído (anoisesrc com tremolo) + masterização (reverb, brilho, limiter, loudnorm).
// ─────────────────────────────────────────────────────────────────────────────
const BEDS = [
  { id: 'bed-tech', name: 'Neural Tech', mood: ['tech','ia','claude','openai','inovacao','futuro','positivo','digital','inteligencia','artificial','chatgpt'],
    beat: 0.4839, kick: 60, sub: 55, bass: 110, arp: [440, 554, 659, 880], hat: true },
  { id: 'bed-news', name: 'Breaking Impact', mood: ['noticia','breaking','urgente','impacto','choque','demissao','corrida','disputa'],
    beat: 0.6, kick: 55, sub: 49, bass: 98, arp: [392, 466, 587, 784], hat: true },
  { id: 'bed-dark', name: 'Dark Protocol', mood: ['golpe','deepfake','perigo','seguranca','hacker','virus','fraude','privacidade','vigilancia'],
    beat: 0.6667, kick: 50, sub: 41, bass: 82, arp: [330, 392, 494, 622], hat: false },
  { id: 'bed-corp', name: 'Momentum', mood: ['emprego','dinheiro','trabalho','carreira','salario','negocio','mercado','investimento'],
    beat: 0.5357, kick: 58, sub: 65, bass: 131, arp: [523, 659, 784, 1047], hat: true },
];

// Em aevalsrc a VÍRGULA separa filtros → a expressão NÃO pode usar funções com
// vírgula (between/mod/floor/pow). Ritmo via tremolo senoidal (pulse).
function pulse(hz, n) {
  const g = `(0.5+0.5*sin(2*PI*${hz}*t))`;
  return Array(n).fill(g).join('*');
}

function buildBedExpr(p, phase = 0) {
  const P  = (1 / p.beat).toFixed(4);   // semínima
  const P2 = (2 / p.beat).toFixed(4);   // colcheia
  const ph = phase ? `+${phase}` : '';
  // arpejo: notas com tremolo defasado → melodia
  const arp = p.arp
    .map((f, i) => `0.04*sin(2*PI*${f}*t${ph})*(0.5+0.5*sin(2*PI*${P2}*t+${(i * 1.7).toFixed(2)}))`)
    .join('+');
  // pad EM TRÍADE (root + terça maior 5/4 + quinta 3/2) → acorde cheio, menos "bip"
  const root = (p.bass / 2);
  const padThird = (root * 1.25).toFixed(2);
  const padFifth = (root * 1.5).toFixed(2);
  const pad = `0.035*(sin(2*PI*${root.toFixed(2)}*t)+sin(2*PI*${padThird}*t)+sin(2*PI*${padFifth}*t))*(0.6+0.4*sin(2*PI*0.25*t))`;
  const layers = [
    `0.5*sin(2*PI*${p.kick}*t)*${pulse(P, 3)}`,      // kick (sub gated)
    `0.07*sin(2*PI*${p.sub}*t)`,                      // sub drone
    `0.12*sin(2*PI*${p.bass}*t${ph})*${pulse(P, 2)}`, // baixo pulsante
    arp,                                              // arpejo
    pad,                                              // pad em tríade
  ];
  return layers.join('+');
}

function generateMusicBed(p, destPath, duration = 90) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100000) return destPath;
  const L = buildBedExpr(p, 0);
  const R = buildBedExpr(p, 0.08);
  const hatHz = (4 / p.beat).toFixed(4); // semicolcheia → chimbal/shaker
  const hatVol = p.hat ? 0.12 : 0.05;    // beds "dark" têm menos chimbal

  const result = spawnSync(ffmpegStatic, [
    '-f', 'lavfi', '-i', `aevalsrc=${L}|${R}:sample_rate=44100:c=stereo`,
    '-f', 'lavfi', '-i', `anoisesrc=color=white:sample_rate=44100:amplitude=0.6`,
    '-filter_complex',
      // chimbal/shaker: ruído filtrado no agudo + gate rítmico (tremolo)
      `[1:a]bandpass=f=9000:width_type=h:w=7000,tremolo=f=${hatHz}:d=0.9,volume=${hatVol},aformat=channel_layouts=stereo[hats];` +
      // mistura tonal + chimbal e masteriza (corte de sub, brilho, reverb curto, limiter, loudnorm)
      `[0:a][hats]amix=inputs=2:weights=1 1:normalize=0,` +
      `highpass=f=28,treble=g=2:f=8000,aecho=0.85:0.88:60:0.3,dynaudnorm=f=160:g=6,alimiter=limit=0.93,loudnorm=I=-15:TP=-1.5:LRA=11[out]`,
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

async function ensureMusicCached() {
  if (_cachedTracks) return _cachedTracks;
  const tracks = [];
  for (const bed of BEDS) {
    const dest = path.join(MUSIC_DIR, `${bed.id}.mp3`);
    const p = generateMusicBed(bed, dest);
    if (p) tracks.push({ id: bed.id, name: bed.name, mood: bed.mood, path: p });
  }
  console.log(`[music] ${tracks.length} trilha(s) disponível(is)`);
  _cachedTracks = tracks;
  return tracks;
}

function selectTrackForTopic(topic, cachedTracks) {
  if (!cachedTracks?.length) return null;
  const t = (topic || '').toLowerCase();
  const match = cachedTracks.find(track => track.mood.some(m => t.includes(m)));
  return match || cachedTracks[Math.floor(Math.random() * cachedTracks.length)];
}

module.exports = { ensureMusicCached, selectTrackForTopic };
