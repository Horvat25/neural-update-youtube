'use strict';
/**
 * set-related-video.js — configura o campo "Video relacionado" do YouTube Studio
 * nos top 3 Shorts com mais views nas ultimas 48h, via API interna do Studio.
 *
 * Usa o mesmo OAuth token do link-booster (sem precisar de browser/Puppeteer).
 *
 * node set-related-video.js [--long-id=VIDEO_ID] [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs   = require('fs');
const path = require('path');
const https = require('https');
const { google, getAuthorizedClient } = require('./youtube-auth');

const DRY_RUN    = process.argv.includes('--dry-run');
const DATA_DIR   = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'link-booster-config.json');
const LOG_FILE   = path.join(DATA_DIR, 'link-booster-log.json');
const HOURS_WINDOW = 48;
const TOP_N = 3;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; }
}
function appendLog(entry) {
  const log = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) : [];
  log.push(entry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}
function getArgLongId() {
  const a = process.argv.find(x => x.startsWith('--long-id='));
  return a ? a.split('=')[1] : null;
}
function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (Number(m[1]||0)*3600)+(Number(m[2]||0)*60)+Number(m[3]||0);
}

async function getLongVideoId(youtube) {
  const argId = getArgLongId();
  if (argId) return argId;
  if (process.env.LONG_VIDEO_ID) return process.env.LONG_VIDEO_ID;
  const cfg = loadConfig();
  if (cfg.longVideoId) return cfg.longVideoId;

  const ch = await youtube.channels.list({ part: ['contentDetails'], mine: true });
  const uploads = ch.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  const pl = await youtube.playlistItems.list({ part: ['contentDetails'], playlistId: uploads, maxResults: 50 });
  const ids = (pl.data.items||[]).map(i => i.contentDetails.videoId).filter(Boolean);
  const details = await youtube.videos.list({ part: ['snippet','contentDetails'], id: ids });
  const long = (details.data.items||[]).find(v =>
    parseDuration(v.contentDetails?.duration||'') > 60 && !/\#short/i.test(v.snippet?.title||'')
  );
  if (!long) throw new Error('Video longo nao encontrado. Use --long-id=VIDEO_ID');
  return long.id;
}

async function getTopShorts(youtube, longId) {
  const ch = await youtube.channels.list({ part: ['contentDetails'], mine: true });
  const uploads = ch.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  const pl = await youtube.playlistItems.list({ part: ['contentDetails','snippet'], playlistId: uploads, maxResults: 50 });
  const cutoff = new Date(Date.now() - HOURS_WINDOW * 3600 * 1000);
  let ids = (pl.data.items||[])
    .filter(i => new Date(i.snippet?.publishedAt||0) > cutoff)
    .map(i => i.contentDetails.videoId).filter(Boolean);
  if (ids.length < TOP_N) {
    ids = (pl.data.items||[]).map(i => i.contentDetails.videoId).filter(Boolean).slice(0, 15);
  }
  const vids = await youtube.videos.list({ part: ['snippet','statistics','contentDetails'], id: ids });
  return (vids.data.items||[])
    .filter(v => v.id !== longId && parseDuration(v.contentDetails?.duration||'') <= 60)
    .sort((a,b) => Number(b.statistics?.viewCount||0) - Number(a.statistics?.viewCount||0))
    .slice(0, TOP_N);
}

// Chamada HTTP simples (sem axios)
function postJson(urlStr, body, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Tenta setar via YouTube Studio InnerTube API
async function setRelatedVideoApi(accessToken, shortId, longId) {
  // Endpoint interno do YouTube Studio
  const url = 'https://studio.youtube.com/youtubei/v1/video_manager/metadata_update?alt=json';

  const payload = {
    context: {
      client: {
        clientName: 'WEB_CREATOR',
        clientVersion: '1.20260625.01.00',
        hl: 'pt-BR',
        gl: 'BR',
        originalUrl: `https://studio.youtube.com/video/${shortId}/edit`,
        platform: 'DESKTOP',
      },
      user: { onBehalfOfUser: '0' },
      request: { sessionInfoRequired: false },
    },
    encryptedVideoId: shortId,
    videoMetadata: {
      featuredVideoId: longId,
    },
  };

  const result = await postJson(url, payload, {
    'Authorization': `Bearer ${accessToken}`,
    'X-Origin': 'https://studio.youtube.com',
    'Origin': 'https://studio.youtube.com',
    'Referer': `https://studio.youtube.com/video/${shortId}/edit`,
    'x-goog-authuser': '0',
    'x-youtube-client-name': '62',
    'x-youtube-client-version': '1.20260625.01.00',
  });

  return result;
}

async function run() {
  console.log(`\n[related] === set-related-video iniciado ${new Date().toLocaleString('pt-BR')} ${DRY_RUN ? '(DRY-RUN)' : ''} ===`);

  const auth    = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });

  // Pega access token atual
  const tokenRes = await auth.getAccessToken();
  const accessToken = tokenRes.token;
  if (!accessToken) throw new Error('Sem access token. Rode: node youtube-login.js');

  const longId = await getLongVideoId(youtube);
  const shorts = await getTopShorts(youtube, longId);

  if (!shorts.length) { console.log('[related] nenhum Short encontrado.'); return; }

  console.log(`[related] video longo: https://youtube.com/watch?v=${longId}`);
  console.log(`[related] configurando "Video relacionado" nos top ${shorts.length} Shorts:`);
  shorts.forEach((v,i) =>
    console.log(`  ${i+1}. [${v.statistics?.viewCount} views] ${v.id} — "${v.snippet?.title?.slice(0,50)}"`)
  );

  let ok = 0;
  for (const short of shorts) {
    console.log(`\n[related] -> ${short.id}`);
    if (DRY_RUN) {
      console.log(`  [dry-run] definiria related video = ${longId}`);
      continue;
    }

    try {
      const res = await setRelatedVideoApi(accessToken, short.id, longId);
      console.log(`  [api] status: ${res.status}`);

      if (res.status === 200) {
        console.log(`  [related] OK — "Video relacionado" configurado: ${short.id} -> ${longId}`);
        ok++;
        appendLog({
          timestamp:   new Date().toISOString(),
          action:      'related_video',
          videoId:     short.id,
          videoTitle:  short.snippet?.title,
          videoViews:  Number(short.statistics?.viewCount||0),
          longVideoId: longId,
        });
      } else {
        // API retornou erro — mostra detalhes para diagnostico
        const err = res.data?.error || res.data;
        console.warn(`  [related] FALHOU (${res.status}):`, JSON.stringify(err).slice(0, 300));
        if (res.status === 401 || res.status === 403) {
          console.warn('  -> Token sem permissao para o Studio. Tente: node youtube-login.js');
        }
      }
    } catch (e) {
      console.error(`  [related] erro: ${e.message}`);
    }
  }

  console.log(`\n[related] === concluido — ${ok}/${shorts.length} configurados ===`);
  if (ok < shorts.length) {
    console.log('\n[related] DICA: O campo "Video relacionado" usa API interna do Studio.');
    console.log('  Se falhar com 403, configure manualmente pelo YouTube Studio por agora.');
  }
}

run().catch(e => {
  console.error('[related] ERRO:', e?.errors?.[0]?.reason || e.message);
  process.exit(1);
});
