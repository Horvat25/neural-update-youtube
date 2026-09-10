'use strict';
// Descoberta de demanda: autocomplete do YouTube (publico, gratis, sem quota).
const https=require('https');
const sugerir=(q)=>new Promise(res=>{
  const url='https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&hl=pt-BR&gl=br&q='+encodeURIComponent(q);
  https.get(url,r=>{const bufs=[];r.on('data',c=>bufs.push(c));r.on('end',()=>{const d=Buffer.concat(bufs).toString('latin1'); // a API responde em ISO-8859-1, nao UTF-8
    try{const j=JSON.parse(d.slice(d.indexOf('(')+1,d.lastIndexOf(')')));
      res((j[1]||[]).map(x=>x[0]));}catch{res([]);}
  });}).on('error',()=>res([]));
});
const SEEDS=['o que acontece se','o que existe','por que o universo','como o universo',
 'existe vida','o que tem dentro','o que aconteceria se','qual e o maior','o que e um buraco',
 'o que acontece dentro','por que a lua','o que tem no fim','como surgiu','o que aconteceu antes'];
(async()=>{
  const todas=new Set();
  for(const s of SEEDS){
    const r=await sugerir(s);
    r.forEach(x=>todas.add(x));
    // segunda camada: seed + cada letra
    for(const L of 'abcdeghlmnopqstuv'){
      const r2=await sugerir(s+' '+L);
      r2.forEach(x=>todas.add(x));
    }
  }
  const astro=/universo|buraco negro|estrela|galaxia|galáxia|planeta|espaço|espaco|lua|sol\b|marte|jupiter|júpiter|saturno|cosmos|big bang|luz|gravidade|alien|extraterrestre|nasa|via lactea|via láctea|asteroide|cometa|quantic|quântic|tempo|dimens|terra\b/i;
  const filtradas=[...todas].filter(q=>astro.test(q));
  console.log('total de sugestoes coletadas:',todas.size);
  console.log('do nosso nicho:',filtradas.length,'\n');
  filtradas.sort().forEach(q=>console.log(' ',q));
  require('fs').writeFileSync('data/_queries-candidatas.json',JSON.stringify(filtradas,null,1));
})();
