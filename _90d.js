require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');
(async () => {
  const auth = await getAuthorizedClient();
  const yta = google.youtubeAnalytics({ version: 'v2', auth });
  const fmt = d => d.toISOString().slice(0, 10);
  const r = await yta.reports.query({
    ids: 'channel==MINE',
    startDate: fmt(new Date(Date.now() - 90 * 864e5)),
    endDate: fmt(new Date()),
    metrics: 'views,estimatedMinutesWatched,subscribersGained,likes,shares',
  });
  const h = (r.data.columnHeaders || []).map(x => x.name);
  const row = r.data.rows?.[0] || [];
  console.log('YOUTUBE — ultimos 90 dias');
  h.forEach((k, i) => console.log('  ' + k + ' = ' + row[i]));
})().catch(e => console.error('ERRO:', e.message));
