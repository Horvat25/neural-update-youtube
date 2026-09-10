const { spawnSync } = require('child_process');
const out = spawnSync(process.execPath, ['_cmp-yt-insta.js','32'], { cwd: __dirname, encoding:'utf8', timeout:180000 }).stdout;
const linhas = out.split('\n').filter(l => l.includes(' | 20'));
const hoje = new Date('2026-07-17');
const b = {};
for (const l of linhas) {
  const m = l.match(/^\s*(\d+) \|\s*(\d+)L \| (\d{4}-\d{2}-\d{2})/);
  if (!m) continue;
  const idade = Math.round((hoje - new Date(m[3]))/864e5);
  const f = idade>=25?'e) 25-32 dias':idade>=18?'d) 18-24 dias':idade>=11?'c) 11-17 dias':idade>=4?'b) 4-10 dias':'a) 0-3 dias';
  (b[f] ||= []).push(Number(m[1]));
}
console.log('YOUTUBE — views por idade do video');
for (const k of Object.keys(b).sort()) {
  const a = b[k];
  console.log(k.padEnd(16), 'n='+String(a.length).padStart(2), ' media=' + String(Math.round(a.reduce((s,x)=>s+x,0)/a.length)).padStart(4));
}
