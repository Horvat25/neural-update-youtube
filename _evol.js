require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');
const fmt = d => new Date(d).toISOString().slice(0,10);
(async () => {
  const auth = await getAuthorizedClient();
  const yta = google.youtubeAnalytics({ version: 'v2', auth });
  const now = Date.now();
  const faixas = [[90,60],[60,30],[30,0]];
  const out = {};
  for (const [a,b] of faixas) {
    const r = await yta.reports.query({
      ids: 'channel==MINE',
      startDate: fmt(now - a*864e5), endDate: fmt(now - b*864e5),
      metrics: 'views,subscribersGained,estimatedMinutesWatched',
    });
    const row = r.data.rows?.[0] || [0,0,0];
    out[`${a}-${b}d`] = { views: row[0], subs: row[1], min: row[2] };
  }
  const ch = await google.youtube({version:'v3',auth}).channels.list({part:['statistics'],mine:true});
  const s = ch.data.items[0].statistics;
  console.log(JSON.stringify({ faixas: out, inscritos_total: s.subscriberCount, views_total: s.viewCount, videos: s.videoCount }, null, 1));
})().catch(e => console.error('ERRO:', e.message));
