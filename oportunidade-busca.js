'use strict';
/**
 * oportunidade-busca.js — acha as QUERIES onde a gente consegue ranquear.
 *
 * Camada 1 (gratis): autocomplete do YouTube = o que a galera digita de verdade.
 * Camada 2 (nossa API): pra cada query, quem esta no top 10 — tamanho do canal,
 *   idade do video, views. Score de oportunidade calculado aqui, nao terceirizado.
 *
 * REGRA: canal pequeno so ranqueia onde o topo NAO e dominado por canal gigante.
 * Uso: node oportunidade-busca.js [quantas]
 */
const fs=require('fs');
const { google, getAuthorizedClient } = require('./youtube-auth');
const LIXO=/lei da atra|manifesta|marvel|dc\b|ordem paranormal|ourocard|blox|free fire|minecraft|roblox|anime|nartuo|naruto|filme|s[ée]rie|novela|m[uú]sica|letra|espiritual|deus|b[ií]blia|hindu|tarot|signo|hor[óo]scopo|conspira|agradecer|falar com o universo|humilha|narrado|geografia|reda[çc]|prova|enem|escola|aula de|jogo|game|copa|flamengo|fluminense|me ama|recompensa|pensa|responde|trabalha|conspir|te dar|deseja|pedido|sinal do universo|energia|vibra|gratid|ato \d|campeao|campe[ãa]o|ganha\b|desenvolve\b|humilh/i;
const BOM=/universo|buraco negro|estrela|gal[áa]xia|planeta|espa[çc]o|lua|sol\b|marte|j[úu]piter|saturno|cosmos|big bang|luz|gravidade|alien|extraterrestre|nasa|via l[áa]ctea|asteroide|cometa|qu[âa]ntic|dimens|terra\b|netuno|urano|v[êe]nus|merc[úu]rio|plut[ãa]o|eclipse|meteoro|sat[ée]lite|[óo]rbita|anos.luz|infinit/i;
const PERGUNTA=/^(o que|oque|por que|porque|pq|como|qual|quando|onde|existe|quanto|sera|será)/i;

(async()=>{
  const N=+(process.argv[2]||24);
  const todas=JSON.parse(fs.readFileSync('data/_queries-candidatas.json','utf8'));
  const limpas=[...new Set(todas
    .map(q=>q.trim().toLowerCase())
    .filter(q=>q.length>=18 && q.length<=70)
    .filter(q=>BOM.test(q) && !LIXO.test(q) && PERGUNTA.test(q)))];
  console.log('queries limpas do nicho:',limpas.length);
  const passo=Math.max(1,Math.floor(limpas.length/N));
  const alvo=limpas.filter((_,i)=>i%passo===0).slice(0,N); // espalha pela lista toda, nao pega so as 'como...'
  console.log('avaliando',alvo.length,'(custo ~'+alvo.length*100+' unidades de quota)\n');

  const auth=await getAuthorizedClient();
  const yt=google.youtube({version:'v3',auth});
  const out=[];
  for(const q of alvo){
    try{
      const s=await yt.search.list({part:'snippet',q,type:'video',maxResults:10,regionCode:'BR',relevanceLanguage:'pt'});
      const vids=(s.data.items||[]).map(i=>i.id.videoId).filter(Boolean);
      if(!vids.length){continue;}
      const canaisIds=[...new Set((s.data.items||[]).map(i=>i.snippet.channelId))];
      const vd=await yt.videos.list({part:'statistics,snippet,contentDetails',id:vids.join(',')});
      const cd=await yt.channels.list({part:'statistics',id:canaisIds.join(',')});
      const subsDe={}; cd.data.items.forEach(c=>subsDe[c.id]=+(c.statistics.subscriberCount||0));
      const linhas=vd.data.items.map(v=>({
        views:+(v.statistics.viewCount||0),
        subs:subsDe[v.snippet.channelId]||0,
        idade:Math.round((Date.now()-new Date(v.snippet.publishedAt))/864e5),
      })).filter(x=>x.views>0);
      if(linhas.length<4) continue;
      const med=a=>{const s2=[...a].sort((x,y)=>x-y);return s2[Math.floor(s2.length/2)];};
      const medViews=med(linhas.map(x=>x.views));
      const medSubs=med(linhas.map(x=>x.subs));
      const medIdade=med(linhas.map(x=>x.idade));
      const pequenos=linhas.filter(x=>x.subs<100000).length;      // canais do nosso porte-ish
      const dosPequenos=linhas.filter(x=>x.subs<50000).map(x=>x.views);
      const tetoPequeno=dosPequenos.length?Math.max(...dosPequenos):0; // quanto um canal PEQUENO consegue fazer nessa query
      const velhos=linhas.filter(x=>x.idade>365).length;          // evergreen: video velho ainda ranqueia
      // score: demanda alta, concorrencia pequena, topo velho (da pra superar com vídeo fresco)
      const score=Math.round((Math.log10(medViews+1)*20) - (Math.log10(medSubs+1)*12) + pequenos*4 + velhos*2);
      out.push({q,medViews,medSubs,medIdade,pequenos,velhos,tetoPequeno,score});
      process.stdout.write('.');
    }catch(e){ process.stdout.write('x'); }
  }
  console.log('\n');
  out.sort((a,b)=>b.score-a.score);
  const pad=(s,n)=>String(s).padEnd(n).slice(0,n);
  const linhas=['SCORE | views_med | subs_med | TETO_PEQ | idade | peq | velhos | QUERY'];
  out.forEach(r=>linhas.push(
    String(r.score).padStart(5)+' | '+String(r.medViews).padStart(9)+' | '+String(r.medSubs).padStart(8)+
    ' | '+String(r.tetoPequeno).padStart(8)+' | '+String(r.medIdade+'d').padStart(6)+' | '+
    String(r.pequenos).padStart(3)+' | '+String(r.velhos).padStart(6)+' | '+r.q));
  const txt=linhas.join('\n');
  fs.writeFileSync('data/_oportunidade-busca.txt',txt,'utf8');
  fs.writeFileSync('data/_oportunidade-busca.json',JSON.stringify(out,null,1),'utf8');
  console.log('gravado em data/_oportunidade-busca.txt');
})().catch(e=>console.error('ERRO',e.message));
