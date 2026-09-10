'use strict';
/**
 * monta-lote-spec.js — monta os .mp4 de um lote gerado pelo `lote-spec.js`.
 *
 * POR QUE ESTE ARQUIVO EXISTE (13/08/2026, aprendido do jeito ruim):
 * o `build-lote.js` parece o caminho natural, mas ele espera o spec NO FORMATO
 * DELE — `{slug, roteiro, titulo, desc, quando, trilha, voz}`. O formato
 * `{slug, tags}` que os arquivos `lote-*.js` exportam é do `distribui-lote.js`,
 * que é outro script. Passando o formato errado, o build-lote não reclama: ele
 * escreve `String(undefined)` por cima do roteiro.txt e monta um vídeo narrando
 * a palavra "undefined". Destruiu dois roteiros antes de eu perceber.
 *
 * Aqui a fonte é o PRÓPRIO JSON do lote, com os nomes de campo dele, e este
 * script **nunca escreve dentro de exports/** a não ser o .mp4. Roteiro, cues,
 * prompts e meta.json são responsabilidade exclusiva do `lote-spec.js`.
 *
 *   node monta-lote-spec.js lotes/14-16-ago.json [lotes/17-20-ago.json ...]
 *   node monta-lote-spec.js lotes/*.json --refazer   # remonta mesmo se já existe
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REFAZER = process.argv.includes('--refazer');
const arquivos = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!arquivos.length) { console.error('uso: node monta-lote-spec.js <lote.json> [...]'); process.exit(1); }

// A ÚNICA trilha liberada. As outras ou tomaram Content ID ou o Marcelo vetou
// (ver as LEIS no CLAUDE.md). Nunca deixar a seleção automática decidir num lote.
const TRILHA_SEGURA = 'dark-some-amount-of-evil.mp3';

const itens = arquivos.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
console.log(`${itens.length} vídeo(s) no lote\n`);

const ok = [], falhas = [];
for (const it of itens) {
  const dir = path.join('exports', it.slug);
  const mp4 = path.resolve(dir, `${it.slug}.mp4`);

  if (fs.existsSync(mp4) && !REFAZER) { console.log(`· ${it.slug} — já montado, pulando`); ok.push(it.slug); continue; }

  const roteiro = path.join(dir, 'roteiro.txt');
  const texto = fs.existsSync(roteiro) ? fs.readFileSync(roteiro, 'utf8').trim() : '';
  if (!texto || texto === 'undefined') { falhas.push(`${it.slug}: roteiro vazio ou corrompido`); console.error(`✗ ${it.slug} — roteiro inválido`); continue; }

  const cenas = fs.readdirSync(dir).filter(f => /^img\d+\.(png|jpe?g|webp)$/i.test(f)).length;
  if (cenas < 3) { falhas.push(`${it.slug}: só ${cenas} cena(s)`); console.error(`✗ ${it.slug} — ${cenas} cena(s)`); continue; }

  // aula é voz feminina (Thalita); todo o resto é masculina (Antonio)
  const voz = it.stream === 'aula' ? 'female' : 'male';
  const trilha = it.track || TRILHA_SEGURA;
  if (trilha !== TRILHA_SEGURA) console.warn(`  ⚠️ ${it.slug} pede "${trilha}" — confira se está liberada`);

  console.log(`▬ ${it.slug}  (${cenas} cenas · voz ${voz})`);
  let feito = false;
  for (let t = 1; t <= 3 && !feito; t++) {                 // o Edge TTS cai por blip de rede
    if (t > 1) console.log(`  retry ${t}...`);
    spawnSync(process.execPath, [path.join(__dirname, 'make-short-img-flex.js'), dir, mp4, it.topic || it.slug, trilha],
      { cwd: __dirname, stdio: 'inherit', env: { ...process.env, SHORTS_VOICE: voz } });
    feito = fs.existsSync(mp4);
  }
  if (feito) { console.log(`  ✓ ${(fs.statSync(mp4).size / 1048576).toFixed(1)} MB\n`); ok.push(it.slug); }
  else { falhas.push(`${it.slug}: montagem falhou 3x`); console.error(`  ✗ falhou 3x\n`); }
}

console.log(`\n${ok.length} montado(s) · ${falhas.length} falha(s)`);
falhas.forEach(f => console.log('  ✗ ' + f));
if (falhas.length) process.exitCode = 1;
