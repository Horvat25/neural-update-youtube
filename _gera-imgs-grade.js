'use strict';
// driver: lê exports/<slug>/prompts.txt e gera img1..img7 via Higgsfield Soul V2.
// NEG: o modelo insiste em enfiar figura humana e texto fantasma nas cenas abstratas
// (pl39 teve assinatura falsa e silhueta humana em 04/09). Negativa tripla resolve.
const fs = require('fs');
const path = require('path');
const { generateImages } = require('./higgsfield-images.js');

const NEG = ', no people, no person, no human figure, no silhouette, no body, no face, no hands, no text, no letters, no words, no numbers, no signature, no watermark, no logo, no border, no frame';

(async () => {
  for (const slug of process.argv.slice(2)) {
    const dir = path.join('exports', slug);
    const prompts = fs.readFileSync(path.join(dir, 'prompts.txt'), 'utf8').trim().split('\n').map(p => p + NEG);
    console.log(`\n== ${slug} (${prompts.length} prompts)`);
    await generateImages(prompts, dir, (i, n) => console.log(`   [${i}/${n}] gerando...`));
    console.log(`✓ ${slug} pronto`);
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
