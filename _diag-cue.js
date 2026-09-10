require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs=require('fs'),path=require('path');
const { generateTTSWithTimings } = require('./tts');
const dir=path.join(__dirname,'exports','longo-aneis-terra');
const normN=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
(async()=>{
  const {words}=await generateTTSWithTimings(fs.readFileSync(path.join(dir,'roteiro.txt'),'utf8').trim(),
    path.join(require('os').tmpdir(),'diag.mp3'),'male');
  const wn=words.map(w=>normN(w.text));
  ['quarta','quinta','sexta','setima','oitava'].forEach(alvo=>{
    const i=wn.indexOf(alvo);
    console.log(alvo.padEnd(8), i<0?'NÃO EXISTE':`i=${i}  "${words.slice(i,i+6).map(w=>w.text).join(' ')}"`);
  });
})();
