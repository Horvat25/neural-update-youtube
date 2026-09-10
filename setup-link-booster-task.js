'use strict';
/**
 * setup-link-booster-task.js — cria a tarefa no Windows Task Scheduler
 * que executa link-booster.js 3x por ciclo de 48h (= a cada 16h).
 *
 * node setup-link-booster-task.js [--remove]
 */
const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const TASK_NAME = 'NeuralUpdate-LinkBooster';
const NODE_EXE  = process.execPath;
const SCRIPT    = path.join(__dirname, 'link-booster.js');
const LOG_DIR   = path.join(__dirname, 'data');
const LOG_OUT   = path.join(LOG_DIR, 'link-booster-sched.log');
const WORK_DIR  = __dirname;

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const REMOVE = process.argv.includes('--remove');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'buffer' }).toString('latin1').trim();
  } catch (e) {
    return (e.stderr || e.stdout || Buffer.from(e.message)).toString('latin1').trim();
  }
}

if (REMOVE) {
  console.log(`[setup] removendo tarefa "${TASK_NAME}"...`);
  console.log(run(`schtasks /Delete /TN "${TASK_NAME}" /F`));
  process.exit(0);
}

// Remove tarefa anterior se existir
run(`schtasks /Delete /TN "${TASK_NAME}" /F`);

// Cria usando parametros diretos (sem XML — evita problemas de encoding)
// /SC DAILY /MO 1 + /RI 960 = repete a cada 960 min (16h) indefinidamente
const cmd = [
  'schtasks /Create',
  `/TN "${TASK_NAME}"`,
  `/TR "cmd /c cd /d \\"${WORK_DIR}\\" && \\"${NODE_EXE}\\" link-booster.js >> \\"${LOG_OUT}\\" 2>&1"`,
  '/SC DAILY',
  '/ST 09:00',
  '/RI 960',
  '/DU 9999:59',
  '/F',
  '/RL HIGHEST',
].join(' ');

console.log(`[setup] criando tarefa "${TASK_NAME}" (a cada 16h)...`);
const result = run(cmd);
console.log(result);

// Verifica
const check = run(`schtasks /Query /TN "${TASK_NAME}" /FO LIST`);
const ok = check.includes(TASK_NAME) || check.includes('Nome da Tarefa') || check.includes('Task To Run');

if (ok) {
  console.log(`\n✅ Tarefa "${TASK_NAME}" criada!`);
  console.log(`   Frequencia: a cada 16h (3x por 48h)`);
  console.log(`   Log:        ${LOG_OUT}`);
  console.log(`\n   Para remover:  node setup-link-booster-task.js --remove`);
  console.log(`   Para testar:   node link-booster.js --dry-run`);
  console.log(`   Relatorio:     node link-booster-metrics.js\n`);
} else {
  console.log('\n[setup] verifique manualmente:');
  console.log(`  schtasks /Query /TN "${TASK_NAME}"`);
  console.log('\nSaida do schtasks:');
  console.log(check);
}
