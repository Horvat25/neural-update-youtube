'use strict';
// Monta exports/longo-5-assustadores-v2 com 20 imagens interleaved:
// slots ÍMPARES (1,3,5..19) = reuso das 10 imagens já geradas (v1)
// slots PARES  (2,4,6..20) = 10 imagens companheiras NOVAS (mesma cena, ângulo diferente)
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const V1 = path.join(__dirname, 'exports', 'longo-5-assustadores');
const V2 = path.join(__dirname, 'exports', 'longo-5-assustadores-v2');
fs.mkdirSync(V2, { recursive: true });

const CINEMA = ', shot on cinema camera, anamorphic lens, dramatic volumetric god rays, cinematic teal and orange color grade, ultra-detailed, 8k, award-winning, epic atmosphere, NO TEXT, no words, no letters';

// companheiras (par) — mesma cena da v1 correspondente, ângulo/variação diferente
const NEW = [
  "Deep space with an ominous distant red nebula, sweeping wide shot, cold scattered stars, sense of dread and infinite scale, different angle, hyper realistic",
  "An overwhelming black empty void of space, near total darkness, one faint lonely galaxy far in the distance, unsettling emptiness, wide cosmic shot",
  "Extreme close up of a magnetar neutron star, violent crackling blue-white magnetic energy arcs whipping around it, deadly intense, hyper detailed",
  "A dark rogue black hole drifting through a dense starfield, dramatic gravitational lensing warping and smearing the stars into rings, silent and ominous",
  "Massive kilonova shockwave expanding through space after two neutron stars merge, brilliant gold and white energy ring, gravitational waves rippling, epic",
  "Glittering cloud of freshly forged gold and heavy elements dispersing across the cosmos, shimmering golden particles against deep space, rich cinematic",
  "TON 618 supermassive black hole seen closer, monstrous glowing orange accretion disk, immense event horizon, warped starlight, terrifying scale, cinematic",
  "A colossal black hole dwarfing a tiny distant sun and planets shown for scale, overwhelming difference in size, cosmic vertigo, dramatic lighting",
  "Earth as a tiny pale blue dot alone in a vast sunbeam across the dark cosmos, fragile and lonely, wide reverent shot, Carl Sagan aesthetic",
  "Planet Earth small and blue glowing softly surrounded by infinite black emptiness, precious and rare, serene and quiet, breathtaking wide shot",
];

const ROTEIRO = fs.readFileSync(path.join(V1, 'roteiro.txt'), 'utf8');

function winQuote(s) { return `"${String(s).replace(/"/g, '""')}"`; }
function genOne(prompt) {
  const r = spawnSync(`higgsfield generate create text2image_soul_v2 --prompt ${winQuote(prompt + CINEMA)} --aspect_ratio 16:9 --quality 2k --wait --wait-timeout 5m`, { encoding: 'utf8', timeout: 320000, shell: true });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/https?:\/\/[^\s"]+\.(jpg|jpeg|png|webp)/i);
  if (!m) throw new Error('sem URL: ' + out.slice(-260));
  return m[0];
}
async function download(url, out) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000 });
  fs.writeFileSync(out, res.data);
}

(async () => {
  fs.writeFileSync(path.join(V2, 'roteiro.txt'), ROTEIRO, 'utf8');
  for (let scene = 0; scene < 10; scene++) {
    const oddSlot = scene * 2 + 1;   // 1,3,5..19  -> reuso v1 imgN
    const evenSlot = scene * 2 + 2;  // 2,4,6..20  -> nova companheira
    // reuso v1
    const src = fs.readdirSync(V1).find(f => new RegExp(`^img${scene + 1}\\.(png|jpe?g|webp)$`, 'i').test(f));
    const oddDst = path.join(V2, `img${oddSlot}.png`);
    if (src && !fs.existsSync(oddDst)) fs.copyFileSync(path.join(V1, src), oddDst);
    // nova
    const evenExists = fs.readdirSync(V2).find(f => new RegExp(`^img${evenSlot}\\.(png|jpe?g|webp)$`, 'i').test(f));
    if (!evenExists) {
      console.log(`gerando companheira img${evenSlot} (cena ${scene + 1}/10)...`);
      const url = genOne(NEW[scene]);
      const ext = path.extname(url.split('?')[0]) || '.png';
      await download(url, path.join(V2, `img${evenSlot}${ext}`));
      console.log(`  img${evenSlot} OK`);
    }
  }
  console.log('V2 PRONTA:', V2, '->', fs.readdirSync(V2).filter(f => /^img/.test(f)).length, 'imagens');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
