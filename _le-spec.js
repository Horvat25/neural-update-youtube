'use strict';
/**
 * _le-spec.js — lê um spec de lotes/pendentes/ tolerando o erro mais comum:
 * quebra de linha LITERAL dentro de uma string JSON (o campo `hook` costuma vir assim).
 * Não altera o arquivo original — o contrato diz que a pasta pendentes/ é do ChatGPT.
 *
 *   node _le-spec.js lotes/pendentes/<arquivo>.json          # valida e mostra
 *   node _le-spec.js lotes/pendentes/<arquivo>.json --salvar # grava lotes/prontos/<slug>.json
 */
const fs = require('fs');
const path = require('path');

function lerTolerante(arquivo) {
  const raw = fs.readFileSync(arquivo, 'utf8');
  let out = '', dentro = false, esc = false;
  for (const ch of raw) {
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\') { out += ch; esc = true; continue; }
    if (ch === '"') { dentro = !dentro; out += ch; continue; }
    if (dentro && ch === '\n') { out += '\\n'; continue; }
    if (dentro && ch === '\r') { continue; }
    out += ch;
  }
  const consertado = out !== raw;
  const j = JSON.parse(out);
  return { item: Array.isArray(j) ? j[0] : j, consertado };
}

const arquivo = process.argv[2];
if (!arquivo) { console.error('uso: node _le-spec.js <spec.json> [--salvar]'); process.exit(1); }

const { item: it, consertado } = lerTolerante(arquivo);
const problemas = [];

const ehAula = it.stream === 'aula';

// AULA tem regras próprias: sem bordão, voz feminina, e o anúncio da próxima com >>
// (decisão do Marcelo 13/08). Ver CLAUDE.md, seção "PARE — checklist obrigatório".
const corpo = it.roteiro.split('Neural Update.')[0].trim();
const pals = corpo.split(/\s+/).length;
if (ehAula) {
  // AULA não tem o teto de 48s dos outros formatos — decisão do Marcelo em 27/08:
  // "nas aulas não precisa ter medo de segundos, desde que seja conteúdo valioso".
  // O teto de 42s existe para notícia e viral, onde retenção manda; aula é conteúdo denso
  // e cortar explicação para caber foi o que deixou o roteiro seco, sem conclusão.
  if (pals < 70 || pals > 150) problemas.push(`aula com ${pals} palavras (alvo 75-140)`);
  if (it.voice !== 'female') problemas.push(`aula precisa de voice:"female" (está ${it.voice || 'ausente'})`);
  if (/Neural Update\. O universo/.test(it.roteiro)) problemas.push('AULA NÃO LEVA BORDÃO — tire o "Neural Update. O universo está te esperando."');
  const anuncio = it.roteiro.split(String.fromCharCode(10)).find(l => l.trim().startsWith('>>'));
  if (!anuncio) problemas.push('falta o anúncio da próxima aula (linha começando com >>)');
  else {
    if (!/Na próxima aula:/.test(anuncio)) problemas.push('o anúncio tem que dizer "Na próxima aula:"');
    if (!/segunda|terça|quarta|quinta|sexta|sábado|domingo/i.test(anuncio)) problemas.push('o anúncio tem que ter o DIA DA SEMANA');
    if (!/dia/.test(anuncio)) problemas.push('o anúncio tem que ter a DATA ("dia vinte e oito")');
    if (!/às duas/.test(anuncio)) problemas.push('o anúncio tem que ter o HORÁRIO ("às duas")');
  }
} else if (pals < 78 || pals > 92) problemas.push(`corpo com ${pals} palavras (alvo 80-90)`);

const primeira = it.roteiro.split('\n\n')[0].trim();
if (/^\d|^[A-Za-zÀ-ú]*\s*\d/.test(primeira)) problemas.push('primeira frase parece abrir com número');

const faltando = it.cues.filter(c => !it.roteiro.includes(c));
if (faltando.length) problemas.push(`cues que não existem no roteiro: ${faltando.join(' | ')}`);

if (it.cues.length !== it.prompts.length) problemas.push(`${it.cues.length} cues x ${it.prompts.length} prompts`);

const proib = ['upper two thirds', 'clear empty space along the bottom', 'only two focal points'];
it.prompts.forEach((p, i) => { if (proib.some(x => p.includes(x))) problemas.push(`prompt ${i + 1} usa expressão proibida`); });

if (!ehAula && !it.roteiro.trim().endsWith('Neural Update. O universo está te esperando.')) problemas.push('não termina com o bordão exato');
if (!it.fonte) problemas.push('sem fonte');
else if (!ehAula && !/\d{2}\/\d{2}\/\d{4}|https?:/.test(it.fonte)) problemas.push('fonte sem data ou sem URL');
if (it.track !== 'dark-some-amount-of-evil.mp3') problemas.push(`trilha ${it.track} — só a dark-some-amount-of-evil é liberada`);

console.log(`\n${it.slug}`);
console.log(`  título : ${it.title}`);
console.log(`  fonte  : ${it.fonte}`);
console.log(`  formato: ${ehAula ? 'AULA (voz feminina, sem bordão)' : (it.stream || 'notícia/viral')}`);
console.log(`  corpo  : ${pals} palavras · ${it.cues.length} cenas`);
if (it.extra) console.log(`  extra  : ${it.extra}`);
if (consertado) console.log(`  ⚠ JSON tinha quebra de linha literal dentro de string — li com correção`);
console.log('\n  roteiro:');
it.roteiro.split('\n\n').filter(f => f.trim()).forEach((f, i) => console.log(`   ${i + 1}. ${f.trim()}`));

console.log('');
if (problemas.length) { problemas.forEach(p => console.log(`  ✗ ${p}`)); process.exitCode = 2; }
else console.log('  ✓ passou em todas as checagens do contrato');

if (process.argv.includes('--salvar')) {
  const destino = path.join('lotes', 'prontos', `${it.slug}.json`);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify([it], null, 2), 'utf8');
  console.log(`\n  → salvo em ${destino}`);
}
