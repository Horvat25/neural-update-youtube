'use strict';
/**
 * cauda-longa.js — responde "vídeo antigo do YouTube volta a performar?"
 * Compara as views de HOJE com o snapshot congelado em 17/07/2026.
 * Ganho = quanto cada vídeo VELHO acumulou depois de já estar publicado.
 * Uso: node cauda-longa.js
 */
const fs=require('fs');
const { google, getAuthorizedClient } = require('./youtube-auth');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const pad=(s,n)=>String(s).padEnd(n).slice(0,n);
(async()=>{
  const snap=JSON.parse(fs.readFileSync('.snapshot-cauda-longa-2026-07-17.json','utf8'));
  // chave = titulo + data de publicacao. So o titulo NAO basta: o norm() apaga emoji
  // e pontuacao, entao 'O planeta onde CHOVE VIDRO...' (viral 01/07) e a VSL de 17/07
  // viravam a MESMA chave e o par saia trocado (deu -492 views falsas de perda).
  const base=new Map(snap.videos.map(v=>[norm(v.t)+'|'+v.pub,v]));
  const auth=await getAuthorizedClient();const yt=google.youtube({version:'v3',auth});
  const ch=await yt.channels.list({part:['contentDetails'],mine:true});
  const up=ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  const ids=[];let pt;
  do{const pl=await yt.playlistItems.list({part:['contentDetails'],playlistId:up,maxResults:50,pageToken:pt});
    pl.data.items.forEach(i=>ids.push(i.contentDetails.videoId));pt=pl.data.nextPageToken;}while(pt&&ids.length<250);
  const hoje=[];
  for(let i=0;i<ids.length;i+=50){const r=await yt.videos.list({part:['snippet','statistics','status'],id:ids.slice(i,i+50)});
    r.data.items.forEach(v=>{if(v.status.publishAt)return;
      hoje.push({t:v.snippet.title,views:+(v.statistics.viewCount||0),pub:v.snippet.publishedAt.slice(0,10)});});}
  const dias=Math.round((Date.now()-new Date(snap.tirado_em).getTime())/864e5);
  const pares=[];
  for(const v of hoje){const b=base.get(norm(v.t)+'|'+v.pub); if(b) pares.push({t:v.t,pub:b.pub,antes:b.views,agora:v.views,ganho:v.views-b.views});}
  console.log(`\nSnapshot de ${snap.tirado_em} vs hoje  —  ${dias} dias corridos`);
  console.log(`${pares.length} vídeos casados (de ${snap.n} no snapshot)\n`);
  // agrupa por IDADE que o video tinha no dia do snapshot
  const faixa=v=>{const d=Math.round((new Date(snap.tirado_em)-new Date(v.pub))/864e5);
    return d<7?'a) 0-7 dias (novo)':d<15?'b) 7-14 dias':d<25?'c) 15-24 dias':'d) 25+ dias (velho)';};
  const g={};pares.forEach(v=>{(g[faixa(v)]=g[faixa(v)]||[]).push(v);});
  console.log('IDADE NO DIA DO SNAPSHOT      n   views(17/07)  ganho em '+dias+'d   %cresc   ganho/video');
  Object.keys(g).sort().forEach(k=>{const a=g[k];
    const antes=a.reduce((s,v)=>s+v.antes,0),ganho=a.reduce((s,v)=>s+v.ganho,0);
    console.log(pad(k,29),String(a.length).padStart(3),String(antes).padStart(12),String(ganho).padStart(12),
      ((ganho/antes*100).toFixed(1)+'%').padStart(9),(ganho/a.length).toFixed(1).padStart(12));});
  const tA=pares.reduce((s,v)=>s+v.antes,0),tG=pares.reduce((s,v)=>s+v.ganho,0);
  console.log('\nTOTAL: '+tA+' views em 17/07  →  +'+tG+' em '+dias+' dias  ('+(tG/tA*100).toFixed(1)+'%)');
  console.log('Ritmo: '+(tG/dias/pares.length).toFixed(2)+' view por video por dia\n');
  const vivos=pares.filter(v=>v.ganho>0).length;
  console.log(`Vídeos que ganharam ALGUMA view: ${vivos}/${pares.length} (${(vivos/pares.length*100).toFixed(0)}%)`);
  console.log(`Vídeos parados (ganho 0): ${pares.length-vivos}\n`);
  console.log('=== TOP 10 QUE MAIS CRESCERAM DEPOIS DE VELHOS ===');
  pares.sort((a,b)=>b.ganho-a.ganho).slice(0,10).forEach(v=>
    console.log(`+${String(v.ganho).padStart(4)}  (${String(v.antes).padStart(4)}→${String(v.agora).padStart(4)})  pub ${v.pub}  ${v.t.slice(0,44)}`));
})().catch(e=>console.error('ERRO',e.message));
