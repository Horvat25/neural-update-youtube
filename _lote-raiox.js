'use strict';
/**
 * _lote-raiox.js — raio-x do último lote: YouTube (views + retenção) ao lado
 * do Instagram (alcance + salvamentos), vídeo por vídeo.
 *
 * POR QUE juntar os dois: o mesmo vídeo, no mesmo dia, em duas audiências
 * diferentes. Quando um tema vai bem só num lado, o problema é distribuição;
 * quando vai bem nos dois, é o conteúdo — e é esse que vale repetir.
 *
 *   IG_TOKEN=... node _lote-raiox.js [dias]
 */
require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const DIAS = parseInt(process.argv[2] || '10', 10);
const IG_ID = '17841478894893058';
const TOKEN = process.env.IG_TOKEN;

const iso = d => d.toISOString().slice(0, 10);
const hoje = new Date();
const desde = new Date(Date.now() - DIAS * 86400e3);

(async () => {
  const tok = JSON.parse(fs.readFileSync(path.join(__dirname, '.yt-tokens.json'), 'utf8'));
  const oauth = new google.auth.OAuth2(process.env.YT_CLIENT_ID, process.env.YT_CLIENT_SECRET);
  oauth.setCredentials(tok);
  const yt = google.youtube({ version: 'v3', auth: oauth });
  const ytA = google.youtubeAnalytics({ version: 'v2', auth: oauth });

  // ---- quais vídeos saíram na janela
  const busca = await yt.search.list({ part: 'id', forMine: true, type: 'video', maxResults: 50, order: 'date' });
  const ids = busca.data.items.map(i => i.id.videoId);
  const det = await yt.videos.list({ part: 'snippet,status,contentDetails,statistics', id: ids.join(',') });

  const vids = det.data.items
    .filter(v => v.status.privacyStatus === 'public')
    .map(v => {
      const dur = v.contentDetails.duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/) || [];
      return {
        id: v.id,
        titulo: v.snippet.title,
        publicado: new Date(v.snippet.publishedAt),
        seg: (+(dur[1] || 0)) * 60 + (+(dur[2] || 0)),
        views: +(v.statistics.viewCount || 0),
        likes: +(v.statistics.likeCount || 0),
        coments: +(v.statistics.commentCount || 0),
      };
    })
    .filter(v => v.publicado >= desde)
    .sort((a, b) => a.publicado - b.publicado);

  // ---- retenção e inscritos por vídeo (Analytics)
  let linhas = [];
  try {
    const rel = await ytA.reports.query({
      ids: 'channel==MINE',
      startDate: iso(desde),
      endDate: iso(hoje),
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained',
      dimensions: 'video',
      sort: '-views',
      maxResults: 50,
    });
    linhas = rel.data.rows || [];
  } catch (e) {
    console.log('(Analytics indisponível: ' + e.message + ')\n');
  }
  const porId = {};
  for (const r of linhas) porId[r[0]] = { views: r[1], min: r[2], durMedia: r[3], pct: r[4], subs: r[5] };

  // ---- Instagram
  const ig = {};
  if (TOKEN) {
    const u = new URL(`https://graph.facebook.com/v21.0/${IG_ID}/media`);
    u.searchParams.set('fields', 'timestamp,caption,like_count,comments_count,insights.metric(reach,saved,shares)');
    u.searchParams.set('limit', '50');
    u.searchParams.set('access_token', TOKEN);
    const r = await (await fetch(u)).json();
    for (const p of (r.data || [])) {
      const t = new Date(p.timestamp);
      if (t < desde) continue;
      const m = {};
      for (const i of (p.insights?.data || [])) m[i.name] = i.values?.[0]?.value ?? 0;
      const chave = iso(new Date(t.getTime() - 3 * 3600e3)) + ' ' + String(new Date(t.getTime() - 3 * 3600e3).getUTCHours()).padStart(2, '0');
      ig[chave] = { alc: m.reach || 0, sal: m.saved || 0, comp: m.shares || 0, cur: p.like_count || 0 };
    }
  }

  console.log(`\nRAIO-X DO LOTE — últimos ${DIAS} dias\n`);
  console.log('DIA/H   ' + 'TÍTULO'.padEnd(38) + '  YT views  ret%   subs |  IG alc  salv  comp');
  console.log('-'.repeat(104));

  const acc = { views: 0, pct: [], subs: 0, alc: 0, sal: 0 };
  for (const v of vids) {
    const b = new Date(v.publicado.getTime() - 3 * 3600e3);
    const chave = iso(b) + ' ' + String(b.getUTCHours()).padStart(2, '0');
    const a = porId[v.id] || {};
    const i = ig[chave] || {};
    const pct = a.pct != null ? a.pct.toFixed(0) + '%' : '—';
    console.log(
      `${iso(b).slice(5)} ${String(b.getUTCHours()).padStart(2, '0')}h ` +
      v.titulo.replace(/[^\x20-\x7EÀ-ÿ]/g, '').trim().slice(0, 38).padEnd(38) +
      `  ${String(v.views).padStart(7)}  ${pct.padStart(5)}  ${String(a.subs ?? '—').padStart(4)} |` +
      `  ${String(i.alc ?? '—').padStart(5)}  ${String(i.sal ?? '—').padStart(4)}  ${String(i.comp ?? '—').padStart(4)}`
    );
    acc.views += v.views; acc.subs += a.subs || 0; acc.alc += i.alc || 0; acc.sal += i.sal || 0;
    if (a.pct != null) acc.pct.push(a.pct);
  }
  console.log('-'.repeat(104));
  const media = acc.pct.length ? (acc.pct.reduce((s, x) => s + x, 0) / acc.pct.length).toFixed(1) : '—';
  console.log(`${vids.length} vídeos · YT ${acc.views} views · retenção média ${media}% · +${acc.subs} inscritos`);
  console.log(`IG alcance ${acc.alc} · ${acc.sal} salvamentos`);
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
