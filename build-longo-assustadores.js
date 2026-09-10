'use strict';
/**
 * build-longo-assustadores.js
 * Monta o vídeo LONGO "Os 5 Lugares Mais Assustadores do Universo".
 * - Gera 10 imagens 16:9 frescas (Higgsfield Soul V2, ~0,12cr cada).
 * - Escreve roteiro.txt (roteiro de retenção: hook nos 3s, escalada 5->1,
 *   fecho satisfatório + CTA inscrição/comentário + gancho do próximo vídeo).
 * - Chama make-longo.js pra render final 16:9.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OUTDIR = path.join(__dirname, 'exports', 'longo-5-assustadores');
fs.mkdirSync(OUTDIR, { recursive: true });

const CINEMA = ', shot on cinema camera, anamorphic lens, dramatic volumetric god rays, cinematic teal and orange color grade, ultra-detailed, 8k, award-winning, epic atmosphere, NO TEXT, no words, no letters';

// 10 cenas, na ordem da narração
const PROMPTS = [
  // intro ominosa
  "Ominous deep space vista, a distant blood-red nebula glowing in absolute darkness, tiny cold stars scattered, sense of cosmic dread and vastness, hyper realistic",
  // #5 Grande Vazio de Bootes
  "An immense empty void of black space, almost no stars, one single extremely faint distant galaxy barely visible far away, overwhelming emptiness and silence, eerie",
  // #4 Magnetar
  "A magnetar neutron star, small but blindingly intense, with violent blue-white magnetic field lines erupting and twisting into space, deadly energy, hyper detailed",
  // #3 Buraco negro errante
  "A rogue black hole wandering alone through interstellar space, invisible dark sphere bending and warping the starlight around it, gravitational lensing, silent and menacing",
  // #2 colisao de estrelas de neutrons / kilonova
  "Two neutron stars colliding in a cataclysmic kilonova explosion, brilliant gold and white burst of energy, spiraling gravitational waves rippling space, apocalyptic beauty",
  // ouro forjado
  "Streams of molten gold and heavy elements forged and scattering across space from a stellar explosion, glittering golden cosmic dust, rich and dramatic",
  // #1 TON 618
  "TON 618, a colossal supermassive black hole, enormous glowing orange-gold accretion disk swirling, gravitational lensing warping a field of stars, monstrous scale, terrifying grandeur",
  // escala TON 618 vs sistema solar
  "A gigantic black hole shadow so vast it dwarfs an entire planetary orbit shown for scale, tiny planets like specks beside it, overwhelming sense of scale, cinematic",
  // fecho: pale blue dot
  "Planet Earth as a tiny fragile pale blue dot suspended in a vast beam of sunlight in the darkness of space, lonely and precious, Carl Sagan aesthetic",
  // Terra sozinha
  "Planet Earth small blue and alone surrounded by the infinite black emptiness of the cosmos, delicate and rare, glowing softly, breathtaking and quiet",
];

const ROTEIRO = `Existe um lugar no universo tão vazio que, se você estivesse lá, acharia que o cosmos inteiro tinha desaparecido. E ele nem é o mais assustador dessa lista. Esses são os cinco lugares mais aterrorizantes já encontrados no universo... e o número um desafia tudo que a gente entende sobre a realidade.
Número cinco: o Grande Vazio de Boötes. Uma bolha de trezentos e trinta milhões de anos-luz de puro nada. Se a Via Láctea estivesse no centro dele, a humanidade só teria descoberto que existem outras galáxias nos anos sessenta... porque não haveria absolutamente nada visível no céu. É o silêncio mais absoluto que existe.
Número quatro: os magnetares. Estrelas mortas do tamanho de uma cidade, mas com um campo magnético trilhões de vezes mais forte que o da Terra. Se um deles passasse na distância da Lua, esse campo dissolveria cada átomo do seu corpo. Você não morreria queimado. Você simplesmente deixaria de existir como matéria.
Número três: os buracos negros errantes. Arrancados de suas galáxias, eles vagam pelo espaço em silêncio total, invisíveis, sem emitir nenhuma luz. Existem milhões deles só na nossa galáxia. E a gente não faz a menor ideia de onde a maioria está agora.
Número dois: a colisão de estrelas de nêutrons. Quando duas delas se chocam, liberam em poucos segundos mais energia do que o Sol vai liberar em toda a sua vida. E é nessa explosão que nasce todo o ouro que existe no universo. O anel no seu dedo veio de uma das catástrofes mais violentas que o cosmos já viu.
E o número um... TON seiscentos e dezoito. Um buraco negro tão colossal que engole sessenta e seis bilhões de vezes a massa do Sol. Se ele estivesse no lugar da nossa estrela, sua sombra engoliria toda a órbita de Netuno. É tão grande que a própria física tem dificuldade de explicar como algo assim pôde se formar. Ele é, literalmente, um monstro que não deveria existir.
E aqui vai o detalhe que muda tudo: cada uma dessas coisas está longe demais pra te alcançar. A Terra, esse pontinho azul frágil, é o lugar mais seguro e mais raro que a gente conhece em todo o universo. Talvez o mais assustador de tudo... seja o quanto ela parece sozinha.
Se essa viagem te deu aquele friozinho na espinha, se inscreve no canal: a gente tá rumo aos mil, e cada inscrito conta de verdade. E comenta aqui embaixo qual desses lugares te assustou mais. Porque no próximo vídeo, eu vou te levar pra dentro de um buraco negro pra ver o que acontece com o tempo lá dentro. Até lá.`;

function winQuote(s) { return `"${String(s).replace(/"/g, '""')}"`; }
function genOne(prompt) {
  const full = prompt + CINEMA;
  const r = spawnSync(`higgsfield generate create text2image_soul_v2 --prompt ${winQuote(full)} --aspect_ratio 16:9 --quality 2k --wait --wait-timeout 5m`, { encoding: 'utf8', timeout: 320000, shell: true });
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
  fs.writeFileSync(path.join(OUTDIR, 'roteiro.txt'), ROTEIRO, 'utf8');
  for (let i = 0; i < PROMPTS.length; i++) {
    const n = `img${i + 1}`;
    const exists = fs.readdirSync(OUTDIR).find(f => new RegExp(`^${n}\\.(png|jpe?g|webp)$`, 'i').test(f));
    if (exists) { console.log(`${n} já existe, pulando`); continue; }
    console.log(`gerando ${n} (${i + 1}/${PROMPTS.length})...`);
    const url = genOne(PROMPTS[i]);
    const ext = path.extname(url.split('?')[0]) || '.png';
    await download(url, path.join(OUTDIR, `${n}${ext}`));
    console.log(`  ${n} OK`);
  }
  console.log('TODAS AS IMAGENS PRONTAS em', OUTDIR);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
