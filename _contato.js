const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ff=require('./node_modules/ffmpeg-static');
const out=process.argv[2];
const grupos={
 pl33:['exports/pl33-nucleossintese-estelar',['cena1','cena2','cena3','cena4','cena5','cena6','cena7','cena8','cena9']],
 pl34:['exports/pl34-diagrama-hr',['cena1','cena2','cena3','cena4','cena5','cena6','cena7','cena8','cena9','cena10']],
 pl27:['exports/pl27-espaco-tempo',['cena1','cena2','cena3','cena4','cena5','cena6']],
 roman:['exports/roman-telescope-lancamento',['cena-01-telescopio','cena-02-espelho','cena-03-foguete','cena-04-galaxias','cena-roman']],
 portal:['exports/portal-buraco-de-minhoca',['cena-01-portal','cena-02-portal-telescopio','cena-03-lente-gravitacional','cena-04-colapso']],
 sagi:['exports/sagitario-a-star',['cena3-var1-convertida-9x16','cena4-crop-coerente-teste']],
};
fs.mkdirSync(out,{recursive:true});
for(const [g,[dir,cs]] of Object.entries(grupos)){
  const tmps=[];
  for(const c of cs){
    const f=path.join(dir,c+'.mp4'); if(!fs.existsSync(f))continue;
    const t=path.join(out,`_${g}_${c}.jpg`);
    try{execFileSync(ff,['-y','-hide_banner','-loglevel','error','-ss','2','-i',f,'-vf','crop=iw:iw*9/16,scale=200:113','-frames:v','1',t])}catch(e){}
    if(fs.existsSync(t))tmps.push(t);
  }
  if(!tmps.length)continue;
  const args=[];tmps.forEach(t=>args.push('-i',t));
  args.push('-filter_complex',tmps.map((_,i)=>`[${i}]`).join('')+`hstack=${tmps.length}`,'-y',path.join(out,g+'.jpg'));
  try{execFileSync(ff,['-hide_banner','-loglevel','error',...args])}catch(e){console.log(g,'erro')}
  console.log(g,'->',tmps.length,'clipes:',cs.join(' '));
}
