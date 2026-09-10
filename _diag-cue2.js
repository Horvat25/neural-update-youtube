require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs=require('fs'),path=require('path');
const { generateTTSWithTimings } = require('./tts');
const dir=path.join(__dirname,'exports','longo-aneis-terra');
const normN=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
(async()=>{
  const {words}=await generateTTSWithTimings(fs.readFileSync(path.join(dir,'roteiro.txt'),'utf8').trim(),
    path.join(require('os').tmpdir(),'diag.mp3'),'male');
  const wn=words.map(w=>normN(w.text));
  wn.forEach((w,i)=>{ if(i>1020&&i<1080) console.log(i, JSON.stringify(words.slice(i-2,i+5).map(x=>x.text).join(' '))); });
})();
