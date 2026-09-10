'use strict';
/**
 * link-booster-metrics.js — relatório de performance do vídeo longo
 * comparando os snapshots capturados pelo link-booster.js.
 *
 * node link-booster-metrics.js           → relatório resumido
 * node link-booster-metrics.js --full    → todos os snapshots
 * node link-booster-metrics.js --csv     → exporta CSV
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs   = require('fs');
const path = require('path');

const DATA_DIR    = path.join(__dirname, 'data');
const METRICS_FILE = path.join(DATA_DIR, 'link-metrics.json');
const LOG_FILE    = path.join(DATA_DIR, 'link-booster-log.json');

const FULL = process.argv.includes('--full');
const CSV  = process.argv.includes('--csv');

function loadMetrics() {
  if (!fs.existsSync(METRICS_FILE)) {
    console.log('[metrics] nenhum dado ainda. Rode node link-booster.js primeiro.');
    process.exit(0);
  }
  return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
}

function loadLog() {
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch { return []; }
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function report() {
  const data = loadMetrics();
  const log  = loadLog();
  const snaps = data.snapshots || [];

  if (!snaps.length) {
    console.log('[metrics] sem snapshots ainda.');
    return;
  }

  // ── CSV ──────────────────────────────────────────────────────────────────────
  if (CSV) {
    const lines = ['timestamp,views,likes,comments,delta_views'];
    snaps.forEach(s => {
      lines.push(`"${s.timestamp}",${s.views},${s.likes},${s.comments},${s.delta_views ?? 0}`);
    });
    const outFile = path.join(DATA_DIR, 'link-metrics.csv');
    fs.writeFileSync(outFile, lines.join('\n'));
    console.log(`[metrics] CSV salvo em ${outFile}`);
    return;
  }

  // ── Relatório ─────────────────────────────────────────────────────────────
  const first = snaps[0];
  const last  = snaps[snaps.length - 1];
  const totalViews  = last.views - first.views;
  const totalHours  = (new Date(last.timestamp) - new Date(first.timestamp)) / 3600000;
  const totalRuns   = log.filter(e => e.action === 'description').length;
  const totalLinks  = log.filter(e => e.action === 'description' || e.action === 'comment').length;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║           📊 LINK-BOOSTER — RELATÓRIO               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\nVídeo longo: https://youtube.com/watch?v=${data.longVideoId}`);
  console.log(`Período:     ${fmtDate(first.timestamp)} → ${fmtDate(last.timestamp)}`);
  console.log(`             (${totalHours.toFixed(1)}h monitoradas)`);
  console.log(`Execuções:   ${totalRuns} runs  |  ${totalLinks} ações de link`);

  console.log('\n── Views do vídeo longo ─────────────────────────────────');
  console.log(`  Início:  ${first.views} views`);
  console.log(`  Agora:   ${last.views} views`);
  console.log(`  ▲ Total: +${totalViews} views${totalHours > 0 ? ` (${(totalViews / totalHours * 24).toFixed(1)}/dia)` : ''}`);

  // Tendência: média de views por snapshot antes vs depois do primeiro link
  const firstLinkTime = log.find(e => e.action === 'description')?.timestamp;
  if (firstLinkTime) {
    const before = snaps.filter(s => s.timestamp < firstLinkTime);
    const after  = snaps.filter(s => s.timestamp >= firstLinkTime);
    if (before.length >= 2 && after.length >= 2) {
      const avgBefore = avgDelta(before);
      const avgAfter  = avgDelta(after);
      const lift      = avgAfter - avgBefore;
      console.log('\n── Impacto estimado dos links ──────────────────────────');
      console.log(`  Média views/h ANTES dos links: ${avgBefore.toFixed(2)}`);
      console.log(`  Média views/h APÓS  os links:  ${avgAfter.toFixed(2)}`);
      console.log(`  Lift estimado: ${lift >= 0 ? '+' : ''}${lift.toFixed(2)} views/h`);
      if (lift > 0) console.log('  ✅ Os links estão ajudando!');
      else          console.log('  ⏳ Ainda sem lift claro — continue monitorando.');
    }
  }

  // Top Shorts linkados (por frequência)
  if (FULL) {
    const desc = log.filter(e => e.action === 'description');
    const freq = {};
    desc.forEach(e => { freq[e.videoId] = (freq[e.videoId] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    console.log('\n── Shorts mais usados como âncora ──────────────────────');
    sorted.forEach(([id, n]) => {
      const entry = desc.find(e => e.videoId === id);
      console.log(`  ${id} (${n}×) — "${entry?.videoTitle?.slice(0, 50) || ''}"`);
    });

    console.log('\n── Todos os snapshots ──────────────────────────────────');
    snaps.forEach(s => {
      const delta = s.delta_views != null ? ` (+${s.delta_views})` : ' (baseline)';
      console.log(`  ${fmtDate(s.timestamp)}  ${s.views} views${delta}`);
    });
  } else {
    console.log('\n  (use --full para ver todos os snapshots e Shorts linkados)');
  }

  // Próximos passos sugeridos
  console.log('\n── Próximas ações sugeridas ────────────────────────────');
  if (totalRuns < 3)  console.log('  • Aguarde mais execuções para dados significativos.');
  if (totalViews > 0) console.log('  • Adicione end-card manual no YouTube Studio apontando pro vídeo longo.');
  console.log('  • Compare com semanas sem link-booster para isolar o efeito.');
  console.log('\n');
}

function avgDelta(snaps) {
  const deltas = [];
  for (let i = 1; i < snaps.length; i++) {
    const dv = snaps[i].views - snaps[i - 1].views;
    const dt = (new Date(snaps[i].timestamp) - new Date(snaps[i - 1].timestamp)) / 3600000;
    if (dt > 0) deltas.push(dv / dt);
  }
  if (!deltas.length) return 0;
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

report();
