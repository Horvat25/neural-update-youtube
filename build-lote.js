'use strict';
/**
 * build-lote.js — motor do lote. Monta e agenda a lista de um arquivo de spec.
 *
 *   node build-lote.js lote-31jul-07ago.js            (monta tudo + agenda)
 *   node build-lote.js lote-31jul-07ago.js --so-montar (não sobe nada)
 *   node build-lote.js lote-31jul-07ago.js --limite 6  (sobe no máximo 6)
 *
 * Cada item do spec vira uma pasta em exports/<slug>/ com:
 *   img1..imgN.png · roteiro.txt · hook.txt · meta.json · <slug>.mp4
 *
 * ORDEM DAS CENAS: primeiro as do banco (campo `bank`), depois as geradas
 * (campo `prompts`). Assim um viral 100% de banco não gera nada e custa ZERO.
 *
 * ⚠️ RESILIÊNCIA (aprendido em lotes anteriores):
 *  · a quota de upload do YouTube estoura por volta de 6-9 vídeos/dia. O estado
 *    fica em data/lote-estado.json → rodar de novo AMANHÃ continua de onde parou,
 *    sem remontar nem re-cobrar nada.
 *  · o Edge TTS cai por blip de rede e derruba o processo. Cada item é tentado
 *    3x; se falhar, segue pro próximo e reporta no fim.
 *  · imagem já existente NUNCA é regerada (gen-imgs.ps1 tem skip-if-exists).
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EXPORTS = path.join(__dirname, 'exports');
const ESTADO = path.join(__dirname, 'data', 'lote-estado.json');

const spec = require(path.join(__dirname, process.argv[2] || 'lote-31jul-07ago.js'));
const SO_MONTAR = process.argv.includes('--so-montar');
const LIMITE = (() => {
  const i = process.argv.indexOf('--limite');
  return i > 0 ? Number(process.argv[i + 1]) : Infinity;
})();

const estado = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, 'utf8')) : {};
const salvaEstado = () => {
  fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
  fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 2));
};

const ps = (args, opts = {}) => spawnSync('powershell.exe',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', ...args],
  { cwd: __dirname, encoding: 'utf8', timeout: 900000, ...opts });
const node = (args, env = {}) => spawnSync(process.execPath, args,
  { cwd: __dirname, encoding: 'utf8', timeout: 900000, env: { ...process.env, ...env } });

let subidos = 0;
const falhas = [];

for (const v of spec) {
  const dir = path.join(EXPORTS, v.slug);
  const mp4 = path.join(dir, v.slug + '.mp4');

  if (estado[v.slug]?.videoId) {
    console.log(`\n▬ ${v.slug} — já agendado (${estado[v.slug].videoId}), pulando`);
    continue;
  }

  console.log(`\n▬▬▬ ${v.slug}  (${v.quando})`);
  fs.mkdirSync(dir, { recursive: true });

  // Se o mp4 JÁ existe, não toca em imagem nenhuma. Sem esta guarda, um lote
  // re-rodado regera cenas de vídeo pronto e cobra crédito à toa — foi o que
  // quase aconteceu em 30/jul depois de eu apagar as imagens por engano.
  const jaMontado = fs.existsSync(mp4);
  if (jaMontado) console.log('   mp4 já existe — pulando geração de imagem');

  // 1) cenas do banco (custo zero)
  if (!jaMontado) {
  const bank = v.bank || [];
  bank.forEach((ref, i) => {
    const [pasta, img] = ref.split('/');
    const origem = path.join(EXPORTS, pasta, img + '.png');
    const destino = path.join(dir, `img${i + 1}.png`);
    if (fs.existsSync(destino)) return;
    if (!fs.existsSync(origem)) { console.error(`   ⚠ banco não achou: ${ref}`); return; }
    fs.copyFileSync(origem, destino);
  });
  console.log(`   banco: ${bank.length} cena(s) — custo zero`);

  // 2) cenas novas (0,12cr cada). prompts.txt precisa ter placeholder nas do banco
  //    pra numeração casar com o skip-if-exists do gen-imgs.
  const novos = v.prompts || [];
  if (novos.length) {
    const linhas = [
      ...bank.map(r => `JA EXISTE (banco: ${r})`),
      ...novos,
    ];
    fs.writeFileSync(path.join(dir, 'prompts.txt'), linhas.join('\n') + '\n', 'utf8');
    console.log(`   gerando ${novos.length} cena(s) a 0,12cr...`);
    const r = ps(['-File', path.join(__dirname, 'gen-imgs.ps1'),
      '-dir', path.join('exports', v.slug), '-ratio', '9:16']);
    const ok = (r.stdout || '').match(/^OK img/gm) || [];
    console.log(`   geradas: ${ok.length}/${novos.length}`);
  }

  const nCenas = fs.readdirSync(dir).filter(f => /^img\d+\.png$/.test(f)).length;
  if (nCenas < 3) { falhas.push(`${v.slug}: só ${nCenas} cena(s)`); continue; }
  } // fim do !jaMontado

  // 3) roteiro + hook
  fs.writeFileSync(path.join(dir, 'roteiro.txt'), v.roteiro + '\n', 'utf8');
  if (v.hook) fs.writeFileSync(path.join(dir, 'hook.txt'), v.hook + '\n', 'utf8');

  // 4) monta o vídeo (3 tentativas — o Edge TTS cai por rede)
  if (!fs.existsSync(mp4)) {
    let feito = false;
    for (let t = 1; t <= 3 && !feito; t++) {
      if (t > 1) console.log(`   retry ${t} da montagem...`);
      const r = node([path.join(__dirname, 'make-short-img-flex.js'),
        path.join('exports', v.slug), mp4, v.slug, v.trilha || ''],
        { SHORTS_VOICE: v.voz || 'male' });
      feito = fs.existsSync(mp4);
      if (!feito) console.error('   ', (r.stderr || r.stdout || '').slice(-180));
    }
    if (!feito) { falhas.push(`${v.slug}: montagem falhou 3x`); continue; }
  }
  const mb = (fs.statSync(mp4).size / 1048576).toFixed(1);
  console.log(`   vídeo ok (${mb} MB)`);

  // 5) meta.json
  const meta = {
    title: v.titulo,
    description: v.desc,
    tags: v.tags,
    privacyStatus: 'private',
    publishAt: v.quando,
    track: v.trilha,
    builtAt: new Date().toISOString(),
  };
  const metaPath = path.join(dir, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  if (SO_MONTAR) { console.log('   (--so-montar: não subiu)'); continue; }
  if (subidos >= LIMITE) { console.log('   limite de upload atingido, para aqui'); break; }

  // 6) sobe agendado
  const r = node([path.join(__dirname, 'post-video.js'), mp4, metaPath, v.quando]);
  const saida = (r.stdout || '') + (r.stderr || '');
  const id = (saida.match(/shorts\/([A-Za-z0-9_-]{11})/) || [])[1];
  if (id) {
    estado[v.slug] = { videoId: id, quando: v.quando, em: new Date().toISOString() };
    salvaEstado();
    subidos++;
    console.log(`   ✓ AGENDADO ${id} — ${v.quando}`);
  } else {
    const quota = /quota|exceeded|uploadLimitExceeded/i.test(saida);
    falhas.push(`${v.slug}: ${quota ? 'QUOTA ESTOURADA' : 'upload falhou'}`);
    console.error(`   ✗ ${quota ? 'quota estourada — para o lote aqui' : 'upload falhou'}`);
    if (quota) break;
  }
}

console.log(`\n════ RESUMO ════`);
console.log(`agendados nesta rodada: ${subidos}`);
console.log(`total já agendado do lote: ${Object.keys(estado).length}/${spec.length}`);
if (falhas.length) { console.log(`\nfalhas:`); falhas.forEach(f => console.log('  ·', f)); }
const faltam = spec.filter(v => !estado[v.slug]);
if (faltam.length) {
  console.log(`\nfaltam ${faltam.length}: ${faltam.map(v => v.slug).join(', ')}`);
  console.log(`→ rodar de novo amanhã: node build-lote.js ${process.argv[2]}`);
}
