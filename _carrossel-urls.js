// Gera 3 imagens de astronomia via Higgsfield e IMPRIME as URLs públicas (CloudFront)
// pra usar direto no carrossel do Insta (sem precisar subir no storage).
const { spawnSync } = require('child_process');
const CINEMA = ', shot on cinema camera, anamorphic lens, dramatic volumetric god rays, cinematic teal and orange color grade, ultra-detailed, 8k, award-winning, epic atmosphere';
const prompts = [
  "Colossal nebula where new stars are born, towering pillars of gas and dust in purple blue and pink, baby stars glowing inside the clouds, James Webb telescope style, ultra detailed",
  "A dying star swelling into a giant red sun dominating the sky over a barren alien planet, dramatic orange atmosphere, epic",
  "Supermassive black hole at the center of a galaxy, glowing orange gold accretion disk, gravitational lensing bending the light, starfield background, cinematic",
];
function winQuote(s){return `"${String(s).replace(/"/g,'""')}"`;}
const urls = [];
for (const p of prompts) {
  const full = p + CINEMA;
  const r = spawnSync(`higgsfield generate create text2image_soul_v2 --prompt ${winQuote(full)} --aspect_ratio 1:1 --quality 2k --wait --wait-timeout 5m`, { encoding:'utf8', timeout:320000, shell:true });
  const out = (r.stdout||'')+(r.stderr||'');
  const m = out.match(/https?:\/\/[^\s"]+\.(jpg|jpeg|png|webp)/i);
  console.log(m ? 'URL:: '+m[0] : 'FALHOU:: '+out.slice(-200));
  if (m) urls.push(m[0]);
}
console.log('JSON_URLS:: ' + JSON.stringify(urls));
