'use strict';
/**
 * alvo-final.js — cruza OPORTUNIDADE DA QUERY com ABANDONO DO CONCORRENTE.
 * A melhor briga e a que ninguem esta brigando: query com demanda, topo VELHO,
 * e o canal que ocupa o topo PAROU DE POSTAR.
 */
const fs=require('fs');
const { google, getAuthorizedClient } = require('./youtube-auth');
const ALVOS=[
 'porque a lua é cheia de buraco','porque a lua não cai na terra','porque a lua fica laranja',
 'porque a lua aparece no ceu durante o dia','o que aconteceria se não existisse a lua',
 'porque o homem não voltou à lua','como o universo morre','porque a lua tem fases',
 'o que aconteceria se uma estrela caísse na terra','o que existe do lado de fora do universo'];
const pad=(s,n)=>String(s).padEnd(n).slice(0,n);
(async()=>{
  const auth=await getAuthorizedClient();
  const yt=google.youtube({version:'v3',auth});
  const cacheCanal={};
  async function perfil(id){
    if(cacheCanal[id])return cacheCanal[id];
    const c=await yt.channels.list({part:'statistics,contentDetails,snippet',id});
    const x=c.data.items?.[0]; if(!x){return cacheCanal[id]={subs:0,parado:null,nome:'?'};}
    let parado=null;
    try{
      const pl=await yt.playlistItems.list({part:'contentDetails',playlistId:x.contentDetails.relatedPlaylists.uploads,maxResults:1});
      const v=pl.data.items?.[0];
      if(v){const d=await yt.videos.list({part:'snippet',id:v.contentDetails.videoId});
        parado=Math.round((Date.now()-new Date(d.data.items[0].snippet.publishedAt))/864e5);}
    }catch{}
    return cacheCanal[id]={subs:+(x.statistics.subscriberCount||0),parado,nome:x.snippet.title};
  }
  const saida=[];
  for(const q of ALVOS){
    try{
      const s=await yt.search.list({part:'snippet',q,type:'video',maxResults:5,regionCode:'BR',relevanceLanguage:'pt'});
      const its=(s.data.items||[]).slice(0,3);
      if(!its.length)continue;
      const vd=await yt.videos.list({part:'statistics,snippet',id:its.map(i=>i.id.videoId).join(',')});
      const top=[];
      for(const v of vd.data.items){
        const p=await perfil(v.snippet.channelId);
        top.push({t:v.snippet.title,canal:p.nome,subs:p.subs,parado:p.parado,
          views:+(v.statistics.viewCount||0),
          idade:Math.round((Date.now()-new Date(v.snippet.publishedAt))/864e5)});
      }
      // fraqueza do topo: canal parado ha muito + video velho + canal pequeno
      const t1=top[0];
      const fraqueza=Math.round((t1.parado||0)/30 + t1.idade/120 - Math.log10(t1.subs+1)*3 + 15);
      saida.push({q,fraqueza,top});
      process.stdout.write('.');
    }catch(e){process.stdout.write('x');}
  }
  console.log('\n');
  saida.sort((a,b)=>b.fraqueza-a.fraqueza);
  const L=[];
  saida.forEach(r=>{
    L.push('');
    L.push('FRAQUEZA DO TOPO: '+r.fraqueza+'   >>> '+r.q.toUpperCase());
    r.top.forEach((v,i)=>L.push('  #'+(i+1)+' '+String(v.views).padStart(8)+'v | '+
      String(v.idade+'d').padStart(6)+' | canal '+String(v.subs).padStart(9)+' insc | '+
      'parado ha '+String(v.parado===null?'?':v.parado+'d').padStart(6)+' | '+pad(v.canal,26)+' | '+v.t.slice(0,44)));
  });
  const txt=L.join('\n');
  fs.writeFileSync('data/_alvo-final.txt',txt,'utf8');
  console.log(txt);
})().catch(e=>console.error('ERRO',e.message));
