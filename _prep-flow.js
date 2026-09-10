'use strict';
// Prepara exports/<slug>/ com roteiro.txt, cues.txt e imagens PRETAS,
// só para o make-short-img-flex gerar narr.mp3 + captions.ass.
// Os clipes reais do Flow entram depois via _monta-flow.js.
const fs=require('fs'), path=require('path'), {spawnSync}=require('child_process');
const ffmpeg=require('./node_modules/ffmpeg-static');
for (const spec of process.argv.slice(2)) {
  const it=JSON.parse(fs.readFileSync(spec,'utf8'))[0];
  const dir=path.join('exports',it.slug);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'roteiro.txt'), it.roteiro, 'utf8');
  if (it.cues) fs.writeFileSync(path.join(dir,'cues.txt'), it.cues.join('\n'), 'utf8');
  const n=Math.max(3,(it.cues||[]).length);
  for (let i=1;i<=n;i++){
    const p=path.join(dir,`img${i}.png`);
    if (fs.existsSync(p)) continue;
    spawnSync(ffmpeg,['-y','-f','lavfi','-i','color=c=black:s=720x1280','-frames:v','1',p],{stdio:'ignore'});
  }
  console.log(`✓ ${it.slug}  roteiro + cues + ${n} imagens pretas`);
}
