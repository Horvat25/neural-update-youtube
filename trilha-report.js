'use strict';
/**
 * trilha-report.js — mede o desempenho de cada TRILHA SONORA e diz se o
 * TRACK_WEIGHT do music-manager.js ainda está certo.
 *
 * Cruza `track` do meta.json de cada export com views (Data API) e
 * retenção (Analytics API). Retenção é a métrica certa pra música:
 * trilha não faz a pessoa CLICAR, faz ela FICAR.
 *
 * Uso: node trilha-report.js
 * Ler junto: memória `trilha-sonora-estrategia`.
 */
const fs=require('fs'),path=require('path');
const { google, getAuthorizedClient } = require('./youtube-auth');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const pad=(s,n)=>String(s).padEnd(n).slice(0,n);
(async()=>{
  const mapa=new Map();
  for(const d of fs.readdirSync(path.join(__dirname,'exports'))){
    const f=path.join(__dirname,'exports',d,'meta.json');
    if(!fs.existsSync(f))continue;
    try{const m=JSON.parse(fs.readFileSync(f,'utf8'));
      if(m.title&&m.track)mapa.set(norm(m.title),{track:m.track.replace(/\.mp3$/,''),slug:d});}catch{}
  }
  const auth=await getAuthorizedClient();
  const yt=google.youtube({version:'v3',auth});
  const ya=google.youtubeAnalytics({version:'v2',auth});
  const ch=await yt.channels.list({part:['contentDetails'],mine:true});
  const up=ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  const ids=[];let pt;
  do{const pl=await yt.playlistItems.list({part:['contentDetails'],playlistId:up,maxResults:50,pageToken:pt});
    pl.data.items.forEach(i=>ids.push(i.contentDetails.videoId));pt=pl.data.nextPageToken;}while(pt&&ids.length<250);
  const V=[];
  for(let i=0;i<ids.length;i+=50){
    const r=await yt.videos.list({part:['snippet','statistics','status'],id:ids.slice(i,i+50)});
    r.data.items.forEach(v=>{if(v.status.publishAt)return;
      const m=mapa.get(norm(v.snippet.title));
      if(m)V.push({id:v.id,t:v.snippet.title,views:+(v.statistics.viewCount||0),...m});});
  }
  const hoje=new Date().toISOString().slice(0,10);
  for(const v of V){
    try{const r=await ya.reports.query({ids:'channel==MINE',startDate:'2026-06-01',endDate:hoje,
      metrics:'views,averageViewPercentage',filters:`video==${v.id}`});
      const row=(r.data.rows||[])[0]; v.pct=row?row[1]:null;
    }catch{ v.pct=null; }
  }
  console.log(`\n${V.length} vídeos com trilha registrada (de ${mapa.size} metas)\n`);
  const ok=V.filter(v=>v.pct!=null&&v.pct>0);
  console.log('=== RETENÇÃO POR TRILHA (o que a música afeta de verdade) ===');
  const g={};ok.forEach(v=>{(g[v.track]=g[v.track]||[]).push(v.pct);});
  const media=a=>a.reduce((x,y)=>x+y,0)/a.length;
  Object.entries(g).sort((a,b)=>media(b[1])-media(a[1])).forEach(([k,a])=>
    console.log(`${pad(k,28)} n=${String(a.length).padStart(2)}  média=${media(a).toFixed(1)}%  [${a.map(x=>x.toFixed(0)+'%').join(' ')}]`));
  console.log('\n=== MESMO CÁLCULO POR VIEW (confundido com formato — use só de apoio) ===');
  const gv={};V.forEach(v=>{(gv[v.track]=gv[v.track]||[]).push(v.views);});
  Object.entries(gv).sort((a,b)=>media(b[1])-media(a[1])).forEach(([k,a])=>{
    const s=[...a].sort((x,y)=>x-y);
    console.log(`${pad(k,28)} n=${String(a.length).padStart(2)}  mediana=${s[Math.floor(s.length/2)]}  média=${Math.round(media(a))}`);});
  const n=ok.length;
  console.log(`\n⚠️  n total com retenção = ${n}. ${n<30?'ABAIXO de 30: é SINAL, não lei — não zerar peso nenhum.':'Acima de 30: dá pra apertar o TRACK_WEIGHT com mais confiança.'}`);
  console.log('Peso das trilhas: TRACK_WEIGHT em music-manager.js\n');
})().catch(e=>console.error('ERRO',e.message));
