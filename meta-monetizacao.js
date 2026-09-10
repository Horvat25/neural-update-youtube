'use strict';
/**
 * meta-monetizacao.js — qual porta do YPP e mais viavel?
 *  A) 10.000.000 de views de SHORTS em 90 dias
 *  B) 4.000 HORAS assistidas de LONGO em 12 meses
 * (as duas exigem 1.000 inscritos)
 */
const { google, getAuthorizedClient } = require('./youtube-auth');
(async()=>{
  const auth=await getAuthorizedClient();
  const yt=google.youtube({version:'v3',auth});
  const ya=google.youtubeAnalytics({version:'v2',auth});
  const ch=await yt.channels.list({part:'contentDetails,statistics',mine:true});
  const subs=+ch.data.items[0].statistics.subscriberCount;
  const up=ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  const ids=[];let pt;
  do{const pl=await yt.playlistItems.list({part:'contentDetails',playlistId:up,maxResults:50,pageToken:pt});
    pl.data.items.forEach(i=>ids.push(i.contentDetails.videoId));pt=pl.data.nextPageToken;}while(pt);
  const shorts=[],longos=[];
  for(let i=0;i<ids.length;i+=50){
    const d=await yt.videos.list({part:'snippet,status,contentDetails,statistics',id:ids.slice(i,i+50).join(',')});
    d.data.items.forEach(v=>{if(v.status.publishAt)return;
      const m=(v.contentDetails.duration||'').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const seg=m?((+(m[1]||0))*3600+(+(m[2]||0))*60+(+(m[3]||0))):0;
      (seg>90?longos:shorts).push({id:v.id,t:v.snippet.title,seg,views:+(v.statistics.viewCount||0),p:v.snippet.publishedAt.slice(0,10)});});
  }
  const ontem=new Date(Date.now()-864e5).toISOString().slice(0,10);
  const d90=new Date(Date.now()-90*864e5).toISOString().slice(0,10);
  console.log('\n=== INSCRITOS: '+subs+' / 1000  ('+(subs/10).toFixed(1)+'%) — exigido nas DUAS portas ===');

  // ---- PORTA A: shorts 90 dias
  const rs=await ya.reports.query({ids:'channel==MINE',startDate:d90,endDate:ontem,metrics:'views',dimensions:'video',sort:'-views',maxResults:200});
  const setShorts=new Set(shorts.map(s=>s.id));
  const viewsShorts=(rs.data.rows||[]).filter(r=>setShorts.has(r[0])).reduce((s,r)=>s+ +r[1],0);
  console.log('\n=== PORTA A — 10.000.000 de views de SHORTS em 90 dias ===');
  console.log('Views de Shorts nos ultimos 90 dias :',viewsShorts.toLocaleString('pt-BR'));
  console.log('Falta                               :',(10e6-viewsShorts).toLocaleString('pt-BR'));
  console.log('Progresso                           :',(viewsShorts/10e6*100).toFixed(2)+'%');
  console.log('Precisaria multiplicar o ritmo por  :',(10e6/viewsShorts).toFixed(0)+'x');
  console.log('No ritmo atual levaria              :',Math.round(10e6/(viewsShorts/90)/365)+' anos');

  // ---- PORTA B: horas de longo em 12 meses
  console.log('\n=== PORTA B — 4.000 HORAS de LONGO em 12 meses ===');
  console.log('Longos publicados:',longos.length);
  let minTot=0;
  for(const L of longos){
    try{const r=await ya.reports.query({ids:'channel==MINE',startDate:'2026-06-01',endDate:ontem,
      metrics:'views,estimatedMinutesWatched,averageViewDuration',filters:'video=='+L.id});
      const row=(r.data.rows||[])[0];
      L.min=row?row[1]:0; L.avd=row?row[2]:0; L.vw=row?row[0]:0; minTot+=L.min;
    }catch{L.min=0;}
    console.log('  '+String(L.vw||0).padStart(4)+'v  '+String(L.min||0).padStart(5)+' min  avg '+
      String(L.avd||0).padStart(3)+'s  ('+Math.round(L.seg/60)+'min)  '+L.t.slice(0,40));
  }
  const horas=minTot/60;
  console.log('TOTAL de horas de LONGO ate hoje    :',horas.toFixed(1),'h  de 4.000  ('+(horas/4000*100).toFixed(2)+'%)');
  const avdMed=longos.filter(l=>l.avd).reduce((s,l)=>s+l.avd,0)/Math.max(1,longos.filter(l=>l.avd).length);
  console.log('Duracao media assistida por view    :',Math.round(avdMed)+'s ('+(avdMed/60).toFixed(1)+' min)');
  if(avdMed>0){
    const viewsNec=Math.round(4000*3600/avdMed);
    console.log('\nCom essa retencao, 4.000h exigem    :',viewsNec.toLocaleString('pt-BR'),'views de LONGO em 12 meses');
    console.log('Por mes                             :',Math.round(viewsNec/12).toLocaleString('pt-BR'),'views');
    console.log('Se publicar 4 longos/mes, cada um   :',Math.round(viewsNec/12/4).toLocaleString('pt-BR'),'views');
    console.log('Nosso melhor longo ate hoje fez     :',Math.max(...longos.map(l=>l.vw||0)),'views');
    console.log('\nSe a duracao assistida subisse pra 4 min (video de 12min a 33%):');
    const v2=Math.round(4000*3600/240);
    console.log('  4.000h exigiriam',v2.toLocaleString('pt-BR'),'views/ano =',Math.round(v2/12).toLocaleString('pt-BR'),'/mes =',Math.round(v2/12/4).toLocaleString('pt-BR'),'por video (4/mes)');
  }
})().catch(e=>console.error('ERRO',e.message));
