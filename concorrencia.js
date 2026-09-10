'use strict';
/**
 * concorrencia.js — quem disputa o nosso nicho, qual o tamanho, e ONDE ELES SAO FRACOS.
 * Nao interessa "quem e grande" — interessa achar a brecha de quem nao pode/nao quer
 * fazer o que a gente faz. Uso: node concorrencia.js
 */
const fs=require('fs');
const { google, getAuthorizedClient } = require('./youtube-auth');
const QUERIES=['astronomia','universo documentario','buraco negro explicado','sistema solar',
 'lua terra ciencia','james webb descoberta','espaco ciencia curiosidades','cosmos universo brasil',
 'astrofisica explicada','fim do universo'];
const pad=(s,n)=>String(s).padEnd(n).slice(0,n);
(async()=>{
  const auth=await getAuthorizedClient();
  const yt=google.youtube({version:'v3',auth});
  const canais=new Map();
  for(const q of QUERIES){
    try{
      const s=await yt.search.list({part:'snippet',q,type:'video',maxResults:15,regionCode:'BR',relevanceLanguage:'pt'});
      (s.data.items||[]).forEach(i=>{
        const id=i.snippet.channelId, t=i.snippet.channelTitle;
        if(!canais.has(id))canais.set(id,{id,t,hits:0});
        canais.get(id).hits++;
      });
      process.stdout.write('.');
    }catch(e){process.stdout.write('x');}
  }
  console.log('\ncanais distintos encontrados:',canais.size);
  const ids=[...canais.keys()];
  // stats dos canais (1 unidade por lote)
  for(let i=0;i<ids.length;i+=50){
    const c=await yt.channels.list({part:'statistics,snippet,contentDetails',id:ids.slice(i,i+50).join(',')});
    c.data.items.forEach(x=>{
      const o=canais.get(x.id);
      o.subs=+(x.statistics.subscriberCount||0);
      o.views=+(x.statistics.viewCount||0);
      o.videos=+(x.statistics.videoCount||0);
      o.criado=x.snippet.publishedAt.slice(0,10);
      o.uploads=x.contentDetails.relatedPlaylists.uploads;
    });
  }
  // perfil de publicacao: ultimos 12 videos de cada
  const lista=[...canais.values()].filter(c=>c.subs!==undefined);
  for(const c of lista){
    try{
      const pl=await yt.playlistItems.list({part:'contentDetails',playlistId:c.uploads,maxResults:12});
      const vids=(pl.data.items||[]).map(i=>i.contentDetails.videoId);
      if(!vids.length){c.morto=true;continue;}
      const vd=await yt.videos.list({part:'snippet,contentDetails,statistics',id:vids.join(',')});
      const its=vd.data.items||[];
      const datas=its.map(v=>new Date(v.snippet.publishedAt)).sort((a,b)=>b-a);
      c.ultimo=Math.round((Date.now()-datas[0])/864e5);
      const span=(datas[0]-datas[datas.length-1])/864e5;
      c.porSemana=span>0?+(datas.length/(span/7)).toFixed(1):0;
      let shorts=0;
      its.forEach(v=>{const m=(v.contentDetails.duration||'').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const seg=m?((+(m[1]||0))*3600+(+(m[2]||0))*60+(+(m[3]||0))):0; if(seg<=90)shorts++;});
      c.pctShorts=Math.round(shorts/its.length*100);
      const vv=its.map(v=>+(v.statistics.viewCount||0)).sort((a,b)=>a-b);
      c.medViewRecente=vv[Math.floor(vv.length/2)];
      c.viewPorSub=c.subs?+(c.medViewRecente/c.subs).toFixed(3):0;
    }catch(e){c.erro=1;}
  }
  lista.sort((a,b)=>b.subs-a.subs);
  const L=[];
  L.push('INSCRITOS | vids | ult.post | vids/sem | %Shorts | view_med | view/sub | CANAL');
  lista.forEach(c=>L.push(
    String(c.subs).padStart(9)+' | '+String(c.videos).padStart(4)+' | '+
    String((c.ultimo!==undefined?c.ultimo+'d':'?')).padStart(8)+' | '+
    String(c.porSemana!==undefined?c.porSemana:'?').padStart(8)+' | '+
    String((c.pctShorts!==undefined?c.pctShorts+'%':'?')).padStart(7)+' | '+
    String(c.medViewRecente!==undefined?c.medViewRecente:'?').padStart(8)+' | '+
    String(c.viewPorSub!==undefined?c.viewPorSub:'?').padStart(8)+' | '+c.t));
  fs.writeFileSync('data/_concorrencia.txt',L.join('\n'),'utf8');
  fs.writeFileSync('data/_concorrencia.json',JSON.stringify(lista,null,1),'utf8');
  console.log('gravado em data/_concorrencia.txt ('+lista.length+' canais)');
})().catch(e=>console.error('ERRO',e.message));
