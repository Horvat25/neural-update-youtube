const { spawnSync } = require('child_process');
const out = spawnSync(process.execPath, ['youtube-stats.js'], { cwd: __dirname, encoding: 'utf8', timeout: 120000 }).stdout;
const j = JSON.parse(out);
const r = (j.recent || []).filter(v => v.views > 0).sort((a, b) => b.views - a.views).slice(0, 8);
console.log('TOP por views:');
for (const v of r) console.log(String(v.views).padStart(5) + '  ' + v.title.slice(0, 52) + '  [' + v.id + ']');
