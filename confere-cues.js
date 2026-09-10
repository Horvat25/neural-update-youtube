'use strict';
/**
 * confere-cues.js — verifica, sem rodar TTS, se toda deixa do cues.txt ainda
 * existe no roteiro.txt, na ordem.
 *
 * POR QUE: quando uma deixa não casa, o `make-short-img-flex` NÃO falha — ele
 * avisa numa linha e cai pras fatias iguais, e o vídeo inteiro perde a sincronia
 * imagem×fala. Depois de qualquer edição de roteiro (corte de duração, conserto
 * de fim), é obrigatório rodar isto. É instantâneo e de graça.
 *
 * A comparação usa o mesmo normalizador do pipeline (sem acento, sem pontuação)
 * e casamento por TEXTO CONTÍNUO, que é como o make-longo passou a procurar.
 *
 *   node confere-cues.js                    # todos os lotes de lotes/*.json
 *   node confere-cues.js <slug> [slug2...]  # pastas específicas
 */
const fs = require('fs');
const path = require('path');

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

let alvos = process.argv.slice(2);
if (!alvos.length) {
  alvos = fs.readdirSync(path.join(__dirname, 'lotes'))
    .filter(f => f.endsWith('.json'))
    .flatMap(f => JSON.parse(fs.readFileSync(path.join(__dirname, 'lotes', f), 'utf8')).map(i => i.slug));
}

let problemas = 0;
for (const slug of alvos) {
  const dir = path.join(__dirname, 'exports', slug);
  const rot = path.join(dir, 'roteiro.txt'), cue = path.join(dir, 'cues.txt');
  if (!fs.existsSync(rot) || !fs.existsSync(cue)) { console.log(`? ${slug} — sem roteiro ou cues`); continue; }

  const blob = norm(fs.readFileSync(rot, 'utf8'));
  const cues = fs.readFileSync(cue, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  const nImgs = fs.readdirSync(dir).filter(f => /^img\d+\.(png|jpe?g|webp)$/i.test(f)).length;

  const ruins = [];
  let de = 0;
  for (const c of cues) {
    const alvo = c.split(/\s+/).map(norm).join('');
    const achou = blob.indexOf(alvo, de);
    if (achou < 0) ruins.push(c);
    else de = achou + 1;
  }

  const desalinhado = nImgs !== cues.length;
  if (ruins.length || desalinhado) {
    problemas++;
    console.log(`✗ ${slug}`);
    ruins.forEach(c => console.log(`    deixa sem par no roteiro: "${c}"`));
    if (desalinhado) console.log(`    ${cues.length} deixas × ${nImgs} imagens`);
  } else {
    console.log(`✓ ${slug}  (${cues.length} cenas)`);
  }
}
console.log(problemas ? `\n${problemas} pasta(s) com problema — NÃO montar assim` : '\ntodas as deixas casam com o roteiro');
if (problemas) process.exitCode = 1;
