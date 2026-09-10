'use strict';
/**
 * youtube-stats.js — estatísticas REAIS via API oficial (sem scraping).
 *  - channels.list(statistics)  → inscritos, views totais, nº de vídeos
 *  - playlistItems + videos.list → últimos vídeos com views/likes/comentários
 *  - youtubeAnalytics.reports    → views/watch time/retenção do período
 *
 * CLI:  node youtube-stats.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { google, getAuthorizedClient } = require('./youtube-auth');

const STATS_CACHE = path.join(__dirname, '.yt-stats.json');

async function getChannelStats() {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const ch = await youtube.channels.list({ part: ['snippet', 'statistics'], mine: true });
  const c = ch.data.items?.[0];
  if (!c) throw new Error('Nenhum canal encontrado para esta conta Google');
  const s = c.statistics || {};
  return {
    channelId: c.id,
    title: c.snippet?.title || '',
    subscribers: Number(s.subscriberCount || 0),
    views: Number(s.viewCount || 0),
    videos: Number(s.videoCount || 0),
  };
}

async function getRecentVideos(max = 10) {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const ch = await youtube.channels.list({ part: ['contentDetails'], mine: true });
  const uploads = ch.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];
  const pl = await youtube.playlistItems.list({ part: ['contentDetails'], playlistId: uploads, maxResults: max });
  const ids = (pl.data.items || []).map(i => i.contentDetails.videoId).filter(Boolean);
  if (!ids.length) return [];
  const vids = await youtube.videos.list({ part: ['snippet', 'statistics'], id: ids });
  return (vids.data.items || []).map(v => ({
    id: v.id,
    title: v.snippet?.title || '',
    publishedAt: v.snippet?.publishedAt || null,
    views: Number(v.statistics?.viewCount || 0),
    likes: Number(v.statistics?.likeCount || 0),
    comments: Number(v.statistics?.commentCount || 0),
    url: `https://youtube.com/shorts/${v.id}`,
  }));
}

async function getAnalytics(days = 28) {
  const auth = await getAuthorizedClient();
  const yta = google.youtubeAnalytics({ version: 'v2', auth });
  const fmt = d => d.toISOString().slice(0, 10);
  const end = new Date();
  const start = new Date(Date.now() - days * 864e5);
  const r = await yta.reports.query({
    ids: 'channel==MINE',
    startDate: fmt(start),
    endDate: fmt(end),
    metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained',
  });
  const headers = (r.data.columnHeaders || []).map(h => h.name);
  const row = r.data.rows?.[0] || [];
  const out = { period_days: days };
  headers.forEach((h, i) => { out[h] = row[i]; });
  return out;
}

async function getFullStats() {
  const channel = await getChannelStats();
  let recent = [];
  let analytics = null;
  try { recent = await getRecentVideos(25); } catch (e) { console.warn('[stats] vídeos:', e.message); }
  try { analytics = await getAnalytics(28); } catch (e) { console.warn('[stats] analytics:', e.message); }
  const data = { channel, recent, analytics, fetched_at: new Date().toISOString() };
  try { fs.writeFileSync(STATS_CACHE, JSON.stringify(data, null, 2)); } catch {}
  return data;
}

function readCache() {
  try { return JSON.parse(fs.readFileSync(STATS_CACHE, 'utf8')); } catch { return null; }
}

if (require.main === module) {
  getFullStats()
    .then(d => { console.log(JSON.stringify(d, null, 2)); process.exit(0); })
    .catch(e => { console.error('[stats] erro:', e.message); process.exit(1); });
}

module.exports = { getChannelStats, getRecentVideos, getAnalytics, getFullStats, readCache, STATS_CACHE };
