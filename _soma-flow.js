const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ff=require('./node_modules/ffmpeg-static');
function dur(f){try{const o=execFileSync(ff,['-hide_banner','-i',f],{stdio:['ignore','pipe','pipe']}).toString()+'';return 0}catch(e){const s=(e.stderr||'').toString();const m=s.match(/Duration: (\d+):(\d+):([\d.]+)/);return m?(+m[1]*3600+ +m[2]*60+ +m[3]):0}}
const porProjeto={};let total=0,n=0;
for(const d of fs.readdirSync('exports')){
  const dir=path.join('exports',d);
  if(!fs.statSync(dir).isDirectory())continue;
  const cs=fs.readdirSync(dir).filter(f=>/^cena\d+\.mp4$/.test(f));
  if(!cs.length)continue;
  let s=0;for(const c of cs){s+=dur(path.join(dir,c));n++}
  porProjeto[d]={n:cs.length,s};total+=s;
}
for(const [k,v] of Object.entries(porProjeto))console.log(k.padEnd(34),v.n+' clipes',v.s.toFixed(1)+'s');
console.log('\nTOTAL:',n,'clipes |',total.toFixed(1)+'s |',(total/60).toFixed(1),'minutos');
