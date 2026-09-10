const path=require('path'), fs=require('fs');
const { generateTTSWithTimings } = require('./tts');
const slug=process.argv[2];
const dir=path.join('exports',slug);
const texto=fs.readFileSync(path.join(dir,'roteiro.txt'),'utf8');
(async()=>{
  const out=path.join(dir,'_longo_narr.mp3');
  const r=await generateTTSWithTimings(texto,out,process.env.SHORTS_VOICE||'male');
  fs.writeFileSync(path.join(dir,'_words.json'),JSON.stringify(r.words||[]),'utf8');
  console.log('narração:',r.audioPath,'| palavras:',(r.words||[]).length);
})();
