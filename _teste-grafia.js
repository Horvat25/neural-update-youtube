const { generateTTS } = require('./tts');
const dir=process.argv[2];
const testes=[
 ['a','O núcleo de uma estrela pequena simplesmente para de encolher. E o que sobra ali tem nome. Anã branca. Uma brasa do tamanho da Terra que vai levar bilhões de anos só para esfriar.'],
 ['b','O núcleo de uma estrela pequena simplesmente para de encolher. E o que sobra ali tem nome. Anã branca. Uma brasa do tamanho da Terra, que vai levar bilhões de anos só para esfriar.'],
];
(async()=>{ for(const [k,t] of testes){ await generateTTS(t, dir+'/'+k+'.mp3','female'); } console.log('gerados'); })();
