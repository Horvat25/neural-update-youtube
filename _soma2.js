const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ff=require('./node_modules/ffmpeg-static');
function dur(f){try{execFileSync(ff,['-hide_banner','-i',f],{stdio:['ignore','pipe','pipe']})}catch(e){const s=(e.stderr||'').toString();const m=s.match(/Duration: (\d+):(\d+):([\d.]+)/);if(m)return +m[1]*3600+ +m[2]*60+ +m[3]}return 0}
const D='C:/Users/Mateus Horvat/Desktop/Neural Update - Videos para postar';
let t=0;
console.log('=== VIDEOS FLOW PRONTOS (Desktop)');
for(const f of fs.readdirSync(D).filter(x=>x.endsWith('.mp4'))){const d=dur(path.join(D,f));t+=d;console.log('  '+f.padEnd(48),d.toFixed(1)+'s')}
console.log('=== VIDEOS FLOW PRONTOS (exports)');
for(const s of ['pl27-espaco-tempo','pl33-nucleossintese-estelar','pl34-diagrama-hr']){
  const f=path.join('exports',s,s+'.mp4');
  if(fs.existsSync(f)){const d=dur(f);t+=d;console.log('  '+s.padEnd(48),d.toFixed(1)+'s')}
}
console.log('\nTOTAL DE VIDEO FLOW PRONTO:',t.toFixed(1)+'s =',(t/60).toFixed(1),'minutos');
