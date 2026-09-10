const { getAuthorizedClient } = require('./youtube-auth');
const { google } = require('googleapis');
(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({version:'v3', auth});
  // longo
  const v = await yt.videos.list({part:'snippet,statistics,status', id:'8O0LxJUumy4'});
  const x = v.data.items[0];
  console.log('LONGO:', x.snippet.title);
  console.log(' publicadoEm:', x.snippet.publishedAt, '| privacy:', x.status.privacyStatus);
  console.log(' stats:', JSON.stringify(x.statistics));
  // agendados
  const ch = await yt.channels.list({part:'contentDetails,statistics', mine:true});
  console.log('\nCANAL inscritos:', ch.data.items[0].statistics.subscriberCount, '| views:', ch.data.items[0].statistics.viewCount);
  const up = ch.data.items[0].contentDetails.relatedPlaylists.uploads;
  const pl = await yt.playlistItems.list({part:'contentDetails', playlistId:up, maxResults:50});
  const ids = pl.data.items.map(i=>i.contentDetails.videoId);
  const det = await yt.videos.list({part:'snippet,status,statistics', id:ids.join(',')});
  const futuros = det.data.items.filter(i=>i.status.publishAt).sort((a,b)=>a.status.publishAt.localeCompare(b.status.publishAt));
  console.log('\n=== AGENDADOS ===');
  futuros.forEach(i=>console.log(' ', i.status.publishAt, '|', i.snippet.title.slice(0,58)));
  console.log('\n=== PUBLICADOS (ultimos 12) ===');
  det.data.items.filter(i=>!i.status.publishAt).slice(0,12).forEach(i=>console.log(' ', i.snippet.publishedAt.slice(0,16), '|', String(i.statistics.viewCount).padStart(5), 'v |', i.snippet.title.slice(0,52)));
})().catch(e=>console.error('ERRO', e.message));
