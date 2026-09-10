// Gera as imagens dos 6 posts de feed (dias 2-7) via Higgsfield e salva um JSON
// com {slot -> urls} pra inserir no Insta. Aspect 1:1. Só CPU/Higgsfield.
const { spawnSync } = require('child_process');
const fs = require('fs');
const CINEMA = ', cinematic, ultra-detailed, 8k, dramatic lighting, epic atmosphere, professional space photography, NO TEXT';
const POSTS = {
  dia2_sol:    ["The Sun as a massive glowing sphere of fire, solar flares and plasma loops, seen from space, dominating the frame, hyper realistic"],
  dia3_sagan:  ["Vast cosmic scene of colorful galaxies and stardust, a lone silhouette looking up at the cosmos, awe and wonder, deep space, ethereal"],
  dia4_extremos: [
    "A magnetar neutron star with intense blue magnetic field lines erupting into space, ultra powerful, cinematic",
    "A rogue black hole wandering through space bending starlight around it, dark and menacing, gravitational lensing",
    "The largest known star hypergiant compared to a tiny sun, colossal red star, scale of the universe",
    "A quasar blasting enormous jets of energy from a galaxy core, brightest object, blinding light"
  ],
  dia5_venus:  ["Planet Venus, thick yellow toxic clouds swirling, hellish volcanic surface glowing below, dense atmosphere, alien and hostile"],
  dia6_quote:  ["A breathtaking spiral galaxy seen face on, billions of stars, cosmic dust lanes, deep purple and gold, majestic and infinite"],
  dia7_escala: [
    "Planet Earth small and blue floating in the vastness of space, fragile pale blue dot",
    "The Sun next to planet Earth showing enormous size difference, scale comparison, dramatic",
    "The hypergiant star VY Canis Majoris, unimaginably colossal red star, dwarfing everything, epic scale",
    "The entire Milky Way galaxy seen from outside, billions of stars in a glowing spiral, cosmic grandeur"
  ]
};
function winQuote(s){return `"${String(s).replace(/"/g,'""')}"`;}
function gen(prompt){
  const r = spawnSync(`higgsfield generate create text2image_soul_v2 --prompt ${winQuote(prompt+CINEMA)} --aspect_ratio 1:1 --quality 2k --wait --wait-timeout 5m`, {encoding:'utf8',timeout:320000,shell:true});
  const out=(r.stdout||'')+(r.stderr||''); const m=out.match(/https?:\/\/[^\s"]+\.(jpg|jpeg|png|webp)/i);
  return m?m[0]:null;
}
const result={};
for(const [slot,prompts] of Object.entries(POSTS)){
  result[slot]=[];
  for(const p of prompts){ const u=gen(p); console.log(slot, u?'OK':'FALHOU'); if(u)result[slot].push(u); }
}
fs.writeFileSync('exports/_feed-semana-urls.json', JSON.stringify(result,null,2));
console.log('DONE:: exports/_feed-semana-urls.json');
