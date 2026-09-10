'use strict';
/**
 * sugere-cues.js — escreve um cues.txt já validado, a partir do roteiro.
 *
 * POR QUE: escrever deixa na mão é onde a produção de longo trava. Ou a frase não
 * existe igualzinha na fala (e o script cai pras fatias iguais, matando a sincronia),
 * ou duas deixas ficam a 2s uma da outra (e o piso engole cenas depois de a imagem
 * já ter sido paga). Aqui a gente roda o TTS de graça, olha o tempo REAL de cada
 * palavra e escolhe as deixas onde elas cabem.
 *
 * Regra de escolha: a cada ~N segundos, anda até o começo da PRÓXIMA FRASE. Trocar
 * de imagem no meio da frase corta o raciocínio; trocar no ponto final acompanha a
 * batida do texto. Cada deixa sai com 4 palavras — o suficiente pra ser única.
 *
 *   node sugere-cues.js <slug> [segundos-por-cena]      # default 15
 *   SHORTS_VOICE=female node sugere-cues.js <slug>      # aula (Thalita é ~15% mais lenta)
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { generateTTSWithTimings } = require('./tts');

const slug = process.argv[2];
const ALVO = parseFloat(process.argv[3] || '15');
if (!slug) { console.error('uso: node sugere-cues.js <slug> [segundos-por-cena]'); process.exit(1); }

const dir = path.join(__dirname, 'exports', slug);
const roteiro = fs.readFileSync(path.join(dir, 'roteiro.txt'), 'utf8').trim();

(async () => {
  const tmp = path.join(require('os').tmpdir(), `cues-${slug}.mp3`);
  const { words } = await generateTTSWithTimings(roteiro, tmp, process.env.SHORTS_VOICE || 'male');
  if (!words || !words.length) { console.error('TTS não devolveu timings'); process.exit(1); }

  const fim = words[words.length - 1].end;
  console.log(`narração: ${fim.toFixed(1)}s (${(fim / 60).toFixed(1)} min) · ${words.length} palavras`);

  // Fim de frase pela PAUSA, não pela pontuação: o Edge TTS devolve as palavras
  // já limpas, sem ponto final (testado 12/08 — procurar "[.!?:]$" achava 5 frases
  // num roteiro de 2.255 palavras). O silêncio entre palavras é o sinal honesto:
  // dentro da frase o intervalo é ~0,05s; em vírgula/ponto ele passa de 0,25s.
  const PAUSA = parseFloat(process.env.PAUSA_S || '0.25');
  const abrePorFrase = new Set([0]);
  for (let i = 1; i < words.length; i++) {
    if (words[i].start - words[i - 1].end >= PAUSA) abrePorFrase.add(i);
  }
  console.log(`${abrePorFrase.size} quebras de frase detectadas (pausa >= ${PAUSA}s)`);

  const cues = [];
  let alvo = 0;
  for (let i = 0; i < words.length; i++) {
    if (!abrePorFrase.has(i)) continue;
    if (words[i].start < alvo) continue;
    if (i + 4 > words.length) break;
    cues.push({ i, t: words[i].start, txt: words.slice(i, i + 4).map(w => w.text).join(' ') });
    alvo = words[i].start + ALVO;
  }

  const durs = cues.map((c, i) => (i === cues.length - 1 ? fim + 1.2 : cues[i + 1].t) - c.t);
  fs.writeFileSync(path.join(dir, 'cues.txt'), cues.map(c => c.txt).join('\n') + '\n', 'utf8');

  console.log(`\n${cues.length} deixas escritas em ${slug}/cues.txt`);
  console.log(`duração das cenas: min ${Math.min(...durs).toFixed(1)}s · média ${(durs.reduce((s, x) => s + x, 0) / durs.length).toFixed(1)}s · máx ${Math.max(...durs).toFixed(1)}s`);
  const curtas = durs.filter(d => d < 5).length;
  if (curtas) console.log(`⚠️ ${curtas} cena(s) abaixo de 5s — o piso do make-longo vai absorver essas`);
  console.log(`custo de imagem: ${cues.length} × 0,12 = ${(cues.length * 0.12).toFixed(2)} créditos\n`);
  cues.forEach((c, i) => console.log(`${String(i + 1).padStart(3)}  ${c.t.toFixed(1).padStart(6)}s  ${durs[i].toFixed(1).padStart(5)}s  ${c.txt}`));
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
