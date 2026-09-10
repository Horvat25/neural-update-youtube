'use strict';
/**
 * concilia-cenas.js — acerta imagens × deixas antes de montar o vídeo.
 *
 * POR QUE: o `make-longo.js` só sincroniza pela fala quando a quantidade de
 * deixas bate exatamente com a quantidade de imagens. Se UMA imagem falhar no
 * lote (a Higgsfield devolve 502 de vez em quando), a conta quebra e o script
 * cai calado pras fatias iguais — ou seja, perde a sincronia do vídeo inteiro
 * por causa de uma cena. Num longo de 70 cenas isso é quase garantido.
 *
 * O que este script faz: descobre quais `imgN` existem de verdade, apaga do
 * cues.txt as deixas órfãs (guardando o original em cues.txt.bak) e renumera as
 * imagens pra ficarem contíguas. A cena que sumiu é absorvida pela anterior,
 * que é exatamente o que o piso de duração já faz.
 *
 *   node concilia-cenas.js <slug>
 */
const fs = require('fs');
const path = require('path');

const slug = process.argv[2];
if (!slug) { console.error('uso: node concilia-cenas.js <slug>'); process.exit(1); }
const dir = path.join(__dirname, 'exports', slug);

const cues = fs.readFileSync(path.join(dir, 'cues.txt'), 'utf8').split('\n').map(s => s.trim());
// só conta a deixa não-vazia, na ordem — é assim que o make-longo lê
const idxCues = cues.map((c, i) => ({ c, i })).filter(x => x.c);

const ext = n => ['png', 'jpg', 'jpeg', 'webp'].map(e => path.join(dir, `img${n}.${e}`)).find(f => fs.existsSync(f));

const vivos = [], mortos = [];
idxCues.forEach((x, k) => (ext(k + 1) ? vivos : mortos).push({ n: k + 1, deixa: x.c }));

console.log(`${idxCues.length} deixas · ${vivos.length} imagens presentes · ${mortos.length} faltando`);
if (!mortos.length) { console.log('nada a conciliar — pode montar'); process.exit(0); }

mortos.forEach(m => console.log(`  faltou img${m.n}: "${m.deixa}"`));

// renumera pra 1..N contíguo, em pasta temporária pra não colidir no meio do caminho
const tmp = path.join(dir, '_renum');
fs.mkdirSync(tmp, { recursive: true });
vivos.forEach((v, k) => {
  const de = ext(v.n);
  fs.renameSync(de, path.join(tmp, `img${k + 1}${path.extname(de)}`));
});
fs.readdirSync(tmp).forEach(f => fs.renameSync(path.join(tmp, f), path.join(dir, f)));
fs.rmdirSync(tmp);

fs.copyFileSync(path.join(dir, 'cues.txt'), path.join(dir, 'cues.txt.bak'));
fs.writeFileSync(path.join(dir, 'cues.txt'), vivos.map(v => v.deixa).join('\n') + '\n', 'utf8');
console.log(`✓ ${vivos.length} cenas contíguas · cues.txt reescrito (original em cues.txt.bak)`);
