'use strict';
/**
 * _cmp-yt-insta.js — lista os Shorts publicados nos últimos N dias com views/likes,
 * pra cruzar com o alcance do Instagram e comparar os dois públicos.
 * Uso: node _cmp-yt-insta.js [dias]
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const DIAS = Number(process.argv[2] || 32);

(async () => {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const ch = await youtube.channels.list({ part: ['contentDetails'], mine: true });
  const uploads = ch.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  const ids = [];
  let pageToken;
  do {
    const pl = await youtube.playlistItems.list({
      part: ['contentDetails'], playlistId: uploads, maxResults: 50, pageToken,
    });
    for (const i of pl.data.items || []) {
      const id = i.contentDetails.videoId;
      if (id && !ids.includes(id)) ids.push(id);
    }
    pageToken = pl.data.nextPageToken;
  } while (pageToken && ids.length < 200);

  const corte = Date.now() - DIAS * 864e5;
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const vids = await youtube.videos.list({
      part: ['snippet', 'statistics', 'status'], id: ids.slice(i, i + 50),
    });
    for (const v of vids.data.items || []) {
      const pub = new Date(v.snippet.publishedAt).getTime();
      if (pub < corte) continue;
      if (v.status?.privacyStatus !== 'public') continue;
      out.push({
        d: v.snippet.publishedAt.slice(0, 10),
        views: Number(v.statistics?.viewCount || 0),
        likes: Number(v.statistics?.likeCount || 0),
        com: Number(v.statistics?.commentCount || 0),
        t: v.snippet.title,
      });
    }
  }
  out.sort((a, b) => b.views - a.views);
  console.log('publicados=' + out.length + '  janela=' + DIAS + 'd');
  console.log('views_total=' + out.reduce((s, v) => s + v.views, 0));
  console.log('---');
  for (const v of out) {
    console.log(
      String(v.views).padStart(6) + ' | ' +
      String(v.likes).padStart(4) + 'L | ' +
      v.d + ' | ' + v.t.slice(0, 62)
    );
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
