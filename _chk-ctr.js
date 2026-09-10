const { getAuthorizedClient } = require('./youtube-auth');
const { google } = require('googleapis');
(async () => {
  const auth = await getAuthorizedClient();
  const ya = google.youtubeAnalytics({version:'v2', auth});
  try {
    const r = await ya.reports.query({
      ids:'channel==MINE', startDate:'2026-07-25', endDate:'2026-07-26',
      metrics:'views,estimatedMinutesWatched,averageViewPercentage', filters:'video==8O0LxJUumy4'
    });
    console.log('LONGO metrics:', JSON.stringify(r.data.columnHeaders.map(c=>c.name)), JSON.stringify(r.data.rows));
  } catch(e){ console.log('metrics err:', e.message); }
  try {
    const r2 = await ya.reports.query({
      ids:'channel==MINE', startDate:'2026-07-25', endDate:'2026-07-26',
      metrics:'views', dimensions:'insightTrafficSourceType', filters:'video==8O0LxJUumy4'
    });
    console.log('TRAFEGO:', JSON.stringify(r2.data.rows));
  } catch(e){ console.log('traf err:', e.message); }
  try {
    const r3 = await ya.reports.query({
      ids:'channel==MINE', startDate:'2026-07-25', endDate:'2026-07-26',
      metrics:'views,cardClickRate', filters:'video==8O0LxJUumy4'
    });
    console.log('CTR-ish:', JSON.stringify(r3.data.rows));
  } catch(e){ console.log('ctr err:', e.message); }
})().catch(e=>console.error('ERRO', e.message));
