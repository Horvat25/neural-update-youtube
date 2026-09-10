const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ff=require('./node_modules/ffmpeg-static');
function info(f){try{execFileSync(ff,['-hide_banner','-i',f],{stdio:['ignore','pipe','pipe']})}catch(e){const s=(e.stderr||'').toString();
 const m=s.match(/Duration: (\d+):(\d+):([\d.]+)/); const r=s.match(/Stream #0:0.*?(\d{3,4})x(\d{3,4})/);
 return {d:m?(+m[1]*3600+ +m[2]*60+ +m[3]):0, w:r?+r[1]:0, h:r?+r[2]:0}} return {d:0,w:0,h:0}}
const alvos=['roman-telescope-lancamento','sagitario-a-star','portal-buraco-de-minhoca','cratera-lua-falcon9','pl27-espaco-tempo','pl33-nucleossintese-estelar','pl34-diagrama-hr'];
let tot=0,cnt=0;
for(const p of alvos){
  const dir=path.join('exports',p); if(!fs.existsSync(dir))continue;
  const cs=fs.readdirSync(dir).filter(f=>/^cena/.test(f)&&f.endsWith('.mp4'));
  if(!cs.length){console.log(p,'— sem clipes brutos');continue}
  console.log('=== '+p);
  for(const c of cs){const i=info(path.join(dir,c));tot+=i.d;cnt++;console.log('   '+c.padEnd(42),i.d.toFixed(1)+'s',i.w+'x'+i.h)}
}
console.log('\nTOTAL BRUTO:',cnt,'clipes |',tot.toFixed(1)+'s =',(tot/60).toFixed(1),'min');
