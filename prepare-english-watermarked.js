'use strict';
/**
 * Collects Higgsfield-era videos and prepares watermarked source files for
 * the future English channel.
 *
 * Usage:
 *   node prepare-english-watermarked.js
 *   node prepare-english-watermarked.js --limit 5
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const HIGGS_DIR = path.join(ROOT, 'exports', 'higgsfield-test');
const OUT_DIR = path.join(ROOT, 'exports', 'english-ready', 'watermarked');
const MANIFEST = path.join(ROOT, 'exports', 'english-ready', 'manifest.json');
const CUTOFF = new Date(process.env.EN_CUTOFF || '2026-06-17T00:00:00-03:00').getTime();
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : (process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10) : 0);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.mp4$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function safeName(file) {
  return path.basename(file, '.mp4')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let files = walk(HIGGS_DIR)
  .map(full => ({ full, stat: fs.statSync(full) }))
  .filter(x => x.stat.mtime.getTime() >= CUTOFF)
  .filter(x => !/scene\d+\.mp4$/i.test(path.basename(x.full)))
  .filter(x => !/cta-scene\.mp4$/i.test(path.basename(x.full)))
  .sort((a, b) => b.stat.mtime - a.stat.mtime);

if (limit > 0) files = files.slice(0, limit);

const manifest = [];
for (const item of files) {
  const rel = path.relative(HIGGS_DIR, item.full).replace(/\\/g, '/');
  const outName = `${safeName(item.full)}-wm.mp4`;
  const outPath = path.join(OUT_DIR, outName);
  if (!fs.existsSync(outPath) || fs.statSync(outPath).mtime < item.stat.mtime) {
    console.log(`[english-ready] watermarking: ${rel}`);
    const res = spawnSync(process.execPath, [path.join(ROOT, 'watermark-video.js'), item.full, outPath], {
      cwd: ROOT,
      stdio: 'inherit',
      timeout: 20 * 60 * 1000
    });
    if (res.status !== 0) {
      console.warn(`[english-ready] skipped failed file: ${rel}`);
      continue;
    }
  } else {
    console.log(`[english-ready] exists: ${outName}`);
  }
  manifest.push({
    source: item.full,
    sourceRelative: rel,
    watermarked: outPath,
    size: fs.statSync(outPath).size,
    sourceModifiedAt: item.stat.mtime.toISOString(),
    preparedAt: new Date().toISOString(),
    channel: 'english'
  });
}

fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`[english-ready] prepared ${manifest.length} video(s)`);
console.log(`[english-ready] manifest: ${MANIFEST}`);
