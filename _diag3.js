const path=require('path');require('dotenv').config({path:path.join(__dirname,'.env')});
const {google,getAuthorizedClient}=require('./youtube-auth');
(async()=>{
  const auth=await getAuthorizedClient();const yt=google.youtube({version:'v3',auth});
  const ch=await yt.channels.list({part:['contentDetails'],mine:true});
  const up=ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  let ids=[],tok=null;
  for(let i=0;i<4;i++){const pl=await yt.playlistItems.list({part:['contentDetails'],playlistId:up,maxResults:50,pageToken:tok});
    for(const it of pl.data.items){const id=it.contentDetails.videoId;if(!ids.includes(id))ids.push(id);}
    tok=pl.data.nextPageToken;if(!tok)break;}
  const vids=[];
  for(let i=0;i<ids.length;i+=50){const r=await yt.videos.list({part:['snippet','statistics','contentDetails','status'],id:ids.slice(i,i+50)});vids.push(...r.data.items);}
  const dur=s=>{const m=s.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);return (+(m[1]||0))*60+(+(m[2]||0));};
  const now=Date.now();
  const fmt=t=>/^Dia \d+\/15/.test(t)?'SAGA (Dia X/15)':/^🎓/.test(t)?'AULA 🎓':/^📰/.test(t)?'NOTÍCIA 📰':/^📕/.test(t)?'VSL ebook 📕':/Compre|Lua por|R\$/.test(t)?'AFILIADO':'VIRAL avulso';
  const pub=vids.filter(v=>v.status.privacyStatus==='public'&&dur(v.contentDetails.duration)<=180)
    .map(v=>({t:v.snippet.title,d:dur(v.contentDetails.duration),vw:+v.statistics.viewCount,
      idade:(now-new Date(v.snippet.publishedAt))/36e5,f:fmt(v.snippet.title)}))
    .filter(v=>v.idade>=48);
  const grupos={};
  pub.forEach(v=>{(grupos[v.f]=grupos[v.f]||[]).push(v);});
  console.log('=== POR FORMATO (todos com +48h no ar) ===');
  Object.entries(grupos).sort((a,b)=>{
    const m=x=>{const s=x[1].map(v=>v.vw).sort((p,q)=>p-q);return s[Math.floor(s.length/2)];};return m(b)-m(a);})
   .forEach(([f,s])=>{
    const vs=s.map(v=>v.vw).sort((a,b)=>a-b);
    const med=vs[Math.floor(vs.length/2)];
    const dm=Math.round(s.reduce((a,v)=>a+v.d,0)/s.length);
    const im=Math.round(s.reduce((a,v)=>a+v.idade,0)/s.length);
    console.log(`${f.padEnd(16)} n=${String(s.length).padStart(2)} | mediana ${String(med).padStart(4)} views | dur.média ${dm}s | idade ${im}h`);
  });
  // dentro do VIRAL avulso: duração importa?
  const vir=grupos['VIRAL avulso']||[];
  console.log(`\n=== SÓ VIRAIS AVULSOS (n=${vir.length}) — a duração importa DENTRO do mesmo formato? ===`);
  [['<40s',0,40],['40-50s',40,50],['50s+',50,181]].forEach(([l,lo,hi])=>{
    const s=vir.filter(v=>v.d>=lo&&v.d<hi);if(!s.length)return;
    const vs=s.map(v=>v.vw).sort((a,b)=>a-b);
    console.log(`  ${l.padEnd(7)} n=${String(s.length).padStart(2)} | mediana ${String(vs[Math.floor(vs.length/2)]).padStart(4)} | idade média ${Math.round(s.reduce((a,v)=>a+v.idade,0)/s.length)}h`);
  });
})().catch(e=>{console.error('ERRO:',e.message);process.exit(1);});
