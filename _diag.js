const path=require('path');require('dotenv').config({path:path.join(__dirname,'.env')});
const {google,getAuthorizedClient}=require('./youtube-auth');
(async()=>{
  const auth=await getAuthorizedClient();const yt=google.youtube({version:'v3',auth});
  const ch=await yt.channels.list({part:['contentDetails','statistics'],mine:true});
  const up=ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  const st=ch.data.items[0].statistics;
  console.log(`CANAL: ${st.subscriberCount} inscritos | ${st.viewCount} views | ${st.videoCount} vídeos\n`);
  let ids=[],tok=null;
  for(let i=0;i<2;i++){
    const pl=await yt.playlistItems.list({part:['contentDetails'],playlistId:up,maxResults:50,pageToken:tok});
    for(const it of pl.data.items){const id=it.contentDetails.videoId;if(!ids.includes(id))ids.push(id);}
    tok=pl.data.nextPageToken;if(!tok)break;
  }
  const vids=[];
  for(let i=0;i<ids.length;i+=50){
    const r=await yt.videos.list({part:['snippet','statistics','contentDetails','status'],id:ids.slice(i,i+50)});
    vids.push(...r.data.items);
  }
  const pub=vids.filter(v=>v.status.privacyStatus==='public');
  pub.sort((a,b)=>new Date(b.snippet.publishedAt)-new Date(a.snippet.publishedAt));
  const dur=s=>{const m=s.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);return (+(m[1]||0))*60+(+(m[2]||0));};
  const now=Date.now();
  console.log('ÚLTIMOS 22 PUBLICADOS (mais novo primeiro):');
  console.log('idade_h | dur | views | likes | título');
  pub.slice(0,22).forEach(v=>{
    const h=((now-new Date(v.snippet.publishedAt))/36e5).toFixed(0);
    console.log(`${String(h).padStart(5)}h | ${String(dur(v.contentDetails.duration)).padStart(4)}s | ${String(v.statistics.viewCount).padStart(6)} | ${String(v.statistics.likeCount||0).padStart(4)} | ${v.snippet.title.slice(0,52)}`);
  });
  // correlação duração x views (só com >48h de vida = já teve chance)
  const maduros=pub.filter(v=>(now-new Date(v.snippet.publishedAt))/36e5>48);
  const g=(lo,hi)=>{const s=maduros.filter(v=>{const d=dur(v.contentDetails.duration);return d>=lo&&d<hi;});
    if(!s.length)return null;const t=s.reduce((a,v)=>a+ +v.statistics.viewCount,0);
    return {n:s.length,media:Math.round(t/s.length),mediana:s.map(v=>+v.statistics.viewCount).sort((a,b)=>a-b)[Math.floor(s.length/2)]};};
  console.log('\n=== DURAÇÃO x VIEWS (só vídeos com +48h no ar) ===');
  [['<30s',0,30],['30-45s',30,45],['45-60s',45,61],['60s+',61,9999]].forEach(([lbl,lo,hi])=>{
    const r=g(lo,hi);if(r)console.log(`${lbl.padEnd(8)} n=${String(r.n).padStart(3)} | média ${String(r.media).padStart(5)} | mediana ${r.mediana}`);
  });
})().catch(e=>{console.error('ERRO:',e.message);process.exit(1);});
