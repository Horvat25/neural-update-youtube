'use strict';
// Gera mosaicos do acervo de clipes (cenaN.mp4) de exports/, para escolher cenas sem repetir. Saída: scratch/acervo/sheet-N.jpg + indice.json
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const FF=require('./node_modules/ffmpeg-static');
const OUT=process.argv[2]; fs.mkdirSync(OUT+'/f',{recursive:true});
const skip=/^(_|nw-webb-lava|pl63|viral-lua-nova|longo-)/;
const dirs=fs.readdirSync('exports').filter(d=>!skip.test(d)&&fs.statSync('exports/'+d).isDirectory()).map(d=>[d,fs.readdirSync('exports/'+d).filter(f=>/^cena\d+\.mp4$/.test(f)).sort((a,b)=>+a.match(/\d+/)[0]-+b.match(/\d+/)[0])]).filter(([d,c])=>c.length);
const idx={};const rows=[];
for(const [d,cs] of dirs){
  const files=[];
  cs.forEach((c,i)=>{const o=`${OUT}/f/${d}__${i+1}.png`;
    const lab=(i===0?d.slice(0,22)+' ':'')+'c'+(i+1);
    spawnSync(FF,['-v','error','-y','-ss','2','-i',`exports/${d}/${c}`,'-frames:v','1','-vf',`scale=104:184,drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='${lab.replace(/'/g,'')}':x=2:y=2:fontsize=12:fontcolor=yellow:box=1:boxcolor=black@0.75`,o]);
    if(fs.existsSync(o))files.push(o);});
  idx[d]=cs.length; 
  for(let k=0;k<files.length;k+=15)rows.push({d,files:files.slice(k,k+15)});
}
fs.writeFileSync(OUT+'/indice.json',JSON.stringify(idx,null,1));
let s=0;
for(let r=0;r<rows.length;r+=11){
  const part=rows.slice(r,r+11);const rp=[];
  part.forEach((row,j)=>{const o=`${OUT}/row-${s}-${j}.png`;const args=['-v','error','-y'];row.files.forEach(f=>args.push('-i',f));
    if(row.files.length>1)args.push('-filter_complex',`hstack=inputs=${row.files.length},pad=1560:184:0:0`);else args.push('-vf','pad=1560:184:0:0');args.push(o);spawnSync(FF,args);rp.push(o);});
  const args=['-v','error','-y'];rp.forEach(f=>args.push('-i',f));args.push('-filter_complex',`vstack=inputs=${rp.length}`,`${OUT}/sheet-${s}.jpg`);
  spawnSync(FF,args);s++;
}
console.log(dirs.length+' pastas, '+rows.length+' linhas, '+s+' mosaicos');
