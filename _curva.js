'use strict';
/** _curva.js — curva de retenção SEGUNDO A SEGUNDO dos Shorts recentes.
 *  Responde: onde exatamente o pessoal sai? */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');
const DIAS = Number(process.argv[2] || 21);
const med = a => { if(!a.length) return 0; const s=[...a].sort((x,y)=>x-y); const m=s.length>>1; return s.length%2? s[m] : (s[m-1]+s[m])/2; };
const dur = iso => { const m=/PT(?:(\d+)M)?(?:(\d+)S)?/.exec(iso||'')||[]; return (+(m[1]||0))*60 + (+(m[2]||0)); };
function em(curva, segs, t){ if(!curva.length) return null; const alvo=t/segs; if(alvo>1) return null; let p=curva[0];
  for(const q of curva){ if(q[0]>=alvo){ if(q[0]===p[0]) return q[1]; const f=(alvo-p[0])/(q[0]-p[0]); return p[1]+f*(q[1]-p[1]); } p=q; } return p[1]; }
(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version:'v3', auth });
  const ya = google.youtubeAnalytics({ version:'v2', auth });
  const ch = await yt.channels.list({ part:['contentDetails'], mine:true });
  const up = ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  const ids=[]; let pg;
  do { const pl = await yt.playlistItems.list({ part:['contentDetails'], playlistId:up, maxResults:50, pageToken:pg });
    (pl.data.items||[]).forEach(i=>{ const id=i.contentDetails.videoId; if(!ids.includes(id)) ids.push(id); }); pg=pl.data.nextPageToken;
  } while (pg && ids.length<120);
  const corte = Date.now() - DIAS*864e5;
  const vids=[];
  for(let i=0;i<ids.length;i+=50){
    const r = await yt.videos.list({ part:['snippet','contentDetails','status'], id: ids.slice(i,i+50) });
    for(const v of r.data.items){
      const t=new Date(v.snippet.publishedAt).getTime();
      const d=dur(v.contentDetails.duration);
      if(t>corte && v.status.privacyStatus==='public' && d>0 && d<=70) vids.push({id:v.id,t:v.snippet.title,d,pub:v.snippet.publishedAt});
    }
  }
  vids.sort((a,b)=> new Date(b.pub)-new Date(a.pub));
  console.log(`Shorts publicos nos ultimos ${DIAS} dias: ${vids.length}`);
  const PONTOS=[1,2,3,5,7,10,15,20,25,30,35,40];
  const acc={}; PONTOS.forEach(p=>acc[p]=[]);
  const porVideo=[];
  for(const v of vids){
    try{
      const r = await ya.reports.query({ ids:'channel==MINE', startDate:'2026-01-01', endDate:new Date().toISOString().slice(0,10),
        metrics:'audienceWatchRatio', dimensions:'elapsedVideoTimeRatio', filters:`video==${v.id}`, sort:'elapsedVideoTimeRatio' });
      const curva=(r.data.rows||[]).map(x=>[x[0],x[1]]);
      if(!curva.length) continue;
      const linha={t:v.t,d:v.d,vals:{}};
      PONTOS.forEach(p=>{ if(p<=v.d){ const val=em(curva,v.d,p); if(val!=null){ acc[p].push(val); linha.vals[p]=val; } } });
      porVideo.push(linha);
    }catch(e){}
    await new Promise(r=>setTimeout(r,120));
  }
  console.log('\n=== CURVA MEDIANA (retencao no segundo N) ===');
  let ant=null;
  for(const p of PONTOS){
    if(!acc[p].length) continue;
    const m=med(acc[p]);
    const queda = ant!=null ? (m-ant)*100 : 0;
    const barra = '#'.repeat(Math.max(0,Math.round(m*28)));
    console.log(`${String(p).padStart(2)}s  ${(m*100).toFixed(0).padStart(4)}%  ${queda? (queda>0?'+':'')+queda.toFixed(0)+'pt':'   '}  ${barra}`);
    ant=m;
  }
  console.log('\n=== MAIOR QUEDA POR VIDEO (onde cada um perde mais) ===');
  const quedas=[];
  for(const l of porVideo){
    const ps=PONTOS.filter(p=>l.vals[p]!=null);
    let pior={de:0,para:0,delta:0};
    for(let i=1;i<ps.length;i++){ const d=l.vals[ps[i]]-l.vals[ps[i-1]]; if(d<pior.delta) pior={de:ps[i-1],para:ps[i],delta:d}; }
    quedas.push({...pior, t:l.t, d:l.d});
  }
  const trechos={};
  quedas.forEach(q=>{ const k=`${q.de}s-${q.para}s`; trechos[k]=(trechos[k]||0)+1; });
  console.log('trecho onde a maior queda acontece (contagem de videos):');
  Object.entries(trechos).sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log('  ',k.padEnd(9), n));
})().catch(e=>{ console.error(e.message); process.exit(1); });
