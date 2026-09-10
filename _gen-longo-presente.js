// runner de imagens do longo "nunca viu o presente" — 24 cenas Soul V2 (~0,12cr cada)
const fs = require('fs');
const { generateImages } = require('./higgsfield-images');
const DIR = 'exports/longo-nunca-viu-o-presente';
const prompts = fs.readFileSync(DIR + '/prompts.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
(async () => {
  console.log('gerando ' + prompts.length + ' imagens...');
  await generateImages(prompts, DIR, (i, t) => console.log(`  [${i}/${t}]`));
  const n = fs.readdirSync(DIR).filter(f => /^img\d+\.(png|jpg)$/i.test(f)).length;
  console.log('PRONTO: ' + n + ' imagens em ' + DIR);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
