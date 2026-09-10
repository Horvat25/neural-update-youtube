'use strict';
/**
 * Preenche a fila com slots recorrentes de Shorts.
 * Padrao: 2 por dia, 12h e 18h (America/Sao_Paulo/local Windows).
 *
 * Uso:
 *   node schedule-daily.js        -> garante proximos 7 dias
 *   node schedule-daily.js 14     -> garante proximos 14 dias
 */
const fs = require('fs');
const path = require('path');

const SCHEDULE_FILE = path.join(__dirname, 'data', 'schedule.json');
const DAYS = Math.max(1, parseInt(process.argv[2] || process.env.SCHEDULE_DAYS || '7', 10));
const HOURS = (process.env.SHORTS_DAILY_HOURS || '12,18')
  .split(',')
  .map(s => parseInt(s.trim(), 10))
  .filter(n => n >= 0 && n <= 23);

function load() {
  try { return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')); } catch { return []; }
}

function save(arr) {
  fs.mkdirSync(path.dirname(SCHEDULE_FILE), { recursive: true });
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(arr, null, 2));
}

function slotDate(base, addDays, hour) {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const now = new Date();
const arr = load();
const existing = new Set(arr
  .filter(x => x.status === 'pending' || x.status === 'running')
  .map(x => new Date(x.when).toISOString().slice(0, 13)));

let added = 0;
for (let day = 0; day < DAYS; day++) {
  for (const hour of HOURS) {
    const when = slotDate(now, day, hour);
    if (when.getTime() <= now.getTime() + 10 * 60 * 1000) continue;
    const key = when.toISOString().slice(0, 13);
    if (existing.has(key)) continue;
    arr.push({
      id: `yt_${when.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'auto',
      when: when.toISOString(),
      status: 'pending',
      privacyStatus: process.env.YT_PRIVACY || 'public',
      createdAt: new Date().toISOString()
    });
    existing.add(key);
    added++;
  }
}

arr.sort((a, b) => new Date(a.when) - new Date(b.when));
save(arr);

console.log(`[schedule-daily] ${added} slot(s) adicionados. Horarios: ${HOURS.join('h, ')}h. Pendentes: ${arr.filter(x => x.status === 'pending').length}`);
