'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs   = require('fs');
const path = require('path');
const { google, getAuthorizedClient } = require('./youtube-auth');
const { acharLongo, topShorts } = require('./ponte-alvos');

const DRY_RUN      = process.argv.includes('--dry-run');
const DATA_DIR     = path.join(__dirname, 'data');
const LOG_FILE     = path.join(DATA_DIR, 'link-booster-log.json');
const CONFIG_FILE  = path.join(DATA_DIR, 'link-booster-config.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; }
}
function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}
function loadLog() {
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch { return []; }
}
function appendLog(entry) {
  const log = loadLog();
  log.push(entry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}
function getArgLongId() {
  const arg = process.argv.find(a => a.startsWith('--long-id='));
  return arg ? arg.split('=')[1] : null;
}

async function detectLongVideo(youtube) {
  const cfg = loadConfig();
  const argId = getArgLongId();
  // Escolha explicita (--long-id= ou LONG_VIDEO_ID) FIXA o alvo: e uma decisao humana.
  if (argId) { saveConfig({ longVideoId: argId, fixado: true }); return argId; }
  if (process.env.LONG_VIDEO_ID) { saveConfig({ longVideoId: process.env.LONG_VIDEO_ID, fixado: true }); return process.env.LONG_VIDEO_ID; }
  // ⚠️ 29/08/2026 — POR QUE ISTO MUDOU. Antes, a deteccao automatica GRAVAVA o id no
  // config e as rodadas seguintes liam esse id para sempre. Resultado: o booster ficou
  // preso no longo de 12/07 e teria continuado empurrando trafego para um video velho
  // depois de todo lancamento novo. Agora o pin so vale quando foi escolhido a mao.
  if (cfg.longVideoId && cfg.fixado) return cfg.longVideoId;
  console.log('[booster] detectando video longo automaticamente...');
  const long = await acharLongo(youtube);
  if (long) {
    console.log('[booster] video longo: ' + long.id + ' - "' + long.snippet?.title + '"');
    cfg.longVideoId = long.id;
    saveConfig(cfg);
    return long.id;
  }
  // ⚠️ 11/09/2026: nao achar o longo parava a ponte inteira ("Nenhum video longo encontrado").
  // O ultimo longo conhecido continua sendo um destino valido — melhor que ponte nenhuma.
  if (cfg.longVideoId) {
    console.log('[booster] nenhum longo publico nos uploads recentes; mantendo o ultimo: ' + cfg.longVideoId);
    return cfg.longVideoId;
  }
  throw new Error('Nenhum video longo encontrado. Use --long-id=VIDEO_ID.');
}

async function updateDescription(youtube, videoId, currentSnippet, longUrl) {
  const existing = currentSnippet.description || '';
  if (existing.includes(longUrl)) {
    console.log('  [desc] ja contem o link - pulando ' + videoId);
    return false;
  }
  const newDesc = ('▶️ Vídeo completo: ' + longUrl + '\n\n' + existing).slice(0, 5000);
  if (DRY_RUN) { console.log('  [dry-run] atualizaria descricao de ' + videoId); return true; }
  await youtube.videos.update({
    part: ['snippet'],
    requestBody: {
      id: videoId,
      snippet: {
        title:               currentSnippet.title,
        description:         newDesc,
        tags:                currentSnippet.tags || [],
        categoryId:          currentSnippet.categoryId || '28',
        defaultLanguage:     currentSnippet.defaultLanguage || 'pt-BR',
        defaultAudioLanguage: currentSnippet.defaultAudioLanguage || 'pt-BR',
      },
    },
  });
  console.log('  [desc] descricao atualizada - ' + videoId);
  return true;
}

async function snapshotLongVideoMetrics(youtube, longId) {
  try {
    const METRICS_FILE = path.join(DATA_DIR, 'link-metrics.json');
    const metrics = fs.existsSync(METRICS_FILE)
      ? JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'))
      : { longVideoId: longId, snapshots: [] };
    const vids = await youtube.videos.list({ part: ['statistics'], id: [longId] });
    const s = vids.data.items?.[0]?.statistics || {};
    const snap = {
      timestamp: new Date().toISOString(),
      views:    Number(s.viewCount||0),
      likes:    Number(s.likeCount||0),
      comments: Number(s.commentCount||0),
    };
    metrics.longVideoId = longId;
    metrics.snapshots.push(snap);
    if (metrics.snapshots.length >= 2) {
      const prev = metrics.snapshots[metrics.snapshots.length - 2];
      snap.delta_views = snap.views - prev.views;
      console.log('[booster] video longo: ' + snap.views + ' views (+' + snap.delta_views + ' desde ultimo snapshot)');
    } else {
      console.log('[booster] video longo: ' + snap.views + ' views (baseline registrado)');
    }
    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
  } catch (e) {
    console.warn('[booster] nao salvou metricas: ' + e.message);
  }
}

async function run() {
  console.log('\n[booster] === link-booster iniciado ' + new Date().toLocaleString('pt-BR') + (DRY_RUN ? ' (DRY-RUN)' : '') + ' ===');
  const auth    = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const longId  = await detectLongVideo(youtube);
  const longUrl = 'https://youtube.com/watch?v=' + longId;

  let longTitle = 'video completo';
  try {
    const lv = await youtube.videos.list({ part: ['snippet'], id: [longId] });
    longTitle = lv.data.items?.[0]?.snippet?.title || longTitle;
  } catch {}
  console.log('[booster] video longo: "' + longTitle + '" - ' + longUrl);

  const shorts = await topShorts(youtube, longId);
  if (!shorts.length) { console.log('[booster] nenhum Short encontrado.'); return; }
  console.log('[booster] top ' + shorts.length + ' Shorts para linkar:');
  shorts.forEach((v,i) =>
    console.log('  ' + (i+1) + '. [' + v.statistics?.viewCount + ' views] ' + v.id + ' - "' + v.snippet?.title + '"')
  );

  const results = [];
  for (const short of shorts) {
    console.log('\n[booster] -> processando ' + short.id);
    // 11/09/2026: o Marcelo nao quer o robo comentando nos Shorts — so o link na descricao.
    const descUpdated   = await updateDescription(youtube, short.id, short.snippet, longUrl);
    const entry = {
      timestamp:    new Date().toISOString(),
      action:       descUpdated ? 'description' : 'skip',
      videoId:      short.id,
      videoTitle:   short.snippet?.title,
      videoViews:   Number(short.statistics?.viewCount||0),
      longVideoId:  longId,
      longVideoUrl: longUrl,
      dryRun:       DRY_RUN,
    };
    if (!DRY_RUN) appendLog(entry);
    results.push({ id: short.id, descUpdated });
  }

  await snapshotLongVideoMetrics(youtube, longId);

  if (!DRY_RUN) {
    const { spawn } = require('child_process');
    const args = [path.join(__dirname, 'set-related-video.js')];
    if (getArgLongId()) args.push('--long-id=' + longId);
    const child = spawn(process.execPath, args, { cwd: __dirname, detached: true, stdio: 'ignore' });
    child.unref();
    console.log('[booster] set-related-video.js disparado em background');
  }

  const linked = results.filter(r => r.descUpdated).length;
  console.log('\n[booster] === concluido - ' + linked + '/' + results.length + ' Shorts linkados ===\n');
}

run().catch(e => {
  console.error('[booster] ERRO:', e?.errors?.[0]?.reason || e.message);
  process.exit(1);
});
