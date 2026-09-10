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
  const pub=vids.filter(v=>v.status.privacyStatus==='public'&&dur(v.contentDetails.duration)<=180)
    .map(v=>({t:v.snippet.title,d:dur(v.contentDetails.duration),vw:+v.statistics.viewCount,
      idade:(now-new Date(v.snippet.publishedAt))/36e5}));
  // JANELA JUSTA: só vídeos entre 48h e 14 dias de vida (todos tiveram chance parecida)
  const j=pub.filter(v=>v.idade>=48&&v.idade<=336);
  console.log(`JANELA JUSTA (48h a 14 dias no ar): ${j.length} vídeos\n`);
  const g=(lbl,lo,hi)=>{const s=j.filter(v=>v.d>=lo&&v.d<hi);if(!s.length)return;
    const vs=s.map(v=>v.vw).sort((a,b)=>a-b);
    const med=vs[Math.floor(vs.length/2)];
    const idadeMed=Math.round(s.reduce((a,v)=>a+v.idade,0)/s.length);
    console.log(`${lbl.padEnd(9)} n=${String(s.length).padStart(2)} | mediana ${String(med).padStart(4)} views | idade média ${idadeMed}h`);};
  ['<40s|0|40','40-50s|40|50','50-60s|50|60','60s+|60|181'].forEach(x=>{const[l,a,b]=x.split('|');g(l,+a,+b);});
  console.log('\n=== MESMA JANELA, os 8 MELHORES e os 8 PIORES ===');
  const ord=[...j].sort((a,b)=>b.vw-a.vw);
  console.log('TOP:');ord.slice(0,8).forEach(v=>console.log(`  ${String(v.vw).padStart(4)} views | ${v.d}s | ${v.t.slice(0,48)}`));
  console.log('PIORES:');ord.slice(-8).forEach(v=>console.log(`  ${String(v.vw).padStart(4)} views | ${v.d}s | ${v.t.slice(0,48)}`));
})().catch(e=>{console.error('ERRO:',e.message);process.exit(1);});
