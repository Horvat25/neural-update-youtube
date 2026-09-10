'use strict';
/**
 * prep-fb-aulas.js — cria as versões "-fb" das AULAS sem NENHUMA menção a data.
 *
 * Motivo (decisão do usuário 17/jul): o Facebook está atrasado e vai recuperar
 * 4 vídeos/dia. As aulas anunciam a próxima com dia da semana ("Sexta, dia 24,
 * às 2 da tarde") — postadas fora de ordem, elas se contradizem e queimam a
 * autoridade da conta. Enquanto o FB não alcança o YouTube/Instagram, a versão
 * -fb tira a data e mantém só a chamada do tema.
 * A saga "Universo em Números" NÃO entra aqui: "Dia X/15" é número de episódio.
 *
 * Uso:  node prep-fb-aulas.js          → só mostra o antes/depois (dry-run)
 *       node prep-fb-aulas.js --build  → copia imagens e renderiza os -fb.mp4
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EXPORTS = path.join(__dirname, 'exports');
const BUILD = process.argv.includes('--build');

// "Sexta, dia vinte e quatro, às duas da tarde." → fora. Pega dia da semana +
// "dia ..." até o ponto final, cobrindo número por extenso e algarismo.
const RE_DATA = /(Segunda|Terça|Terca|Quarta|Quinta|Sexta|Sábado|Sabado|Domingo)\s*,\s*dia[^.]*\.\s*/gi;
// Rede de segurança: qualquer sobra de horário solto.
const RE_HORA = /\s*às?\s+(duas|2|\d{1,2})\s+(da\s+tarde|horas?)\s*\.?/gi;

// Fechos que PRESSUPÕEM hora marcada: sem a data eles ficam órfãos ("não chega
// atrasado" em quê? "marca aí" o quê?). Tirar a data e deixar esses é deixar o
// fantasma dela. Trocar por fecho atemporal.
const RE_FECHO_ORFAO = /\s*(Não chega atrasado|Nao chega atrasado|Marca aí|Marca ai|Te espero)\s*\.\s*$/i;

function limpar(txt) {
  let t = txt.replace(RE_DATA, '').replace(RE_HORA, '');
  t = t.replace(/\s{2,}/g, ' ').trim();
  t = t.replace(RE_FECHO_ORFAO, '.').replace(/\.\s*\.$/, '.');
  // Todo mundo termina igual e atemporal.
  if (/Na próxima aula:/i.test(t) && !/Segue pra não perder\.$/i.test(t)) {
    t = t.replace(/\s*$/, ' Segue pra não perder.');
  }
  return t.replace(/\s{2,}/g, ' ').trim();
}

const aulas = fs.readdirSync(EXPORTS)
  .filter(d => /^pl\d+-/.test(d))
  .filter(d => fs.existsSync(path.join(EXPORTS, d, 'roteiro.txt')))
  .sort();

console.log(BUILD ? '=== CONSTRUINDO ===' : '=== DRY-RUN (nada foi escrito) ===\n');

for (const slug of aulas) {
  const dir = path.join(EXPORTS, slug);
  const orig = fs.readFileSync(path.join(dir, 'roteiro.txt'), 'utf8').trim();
  const novo = limpar(orig);

  const trechoAntes = (orig.match(/Na próxima aula[\s\S]*$/i) || ['(sem fecho)'])[0];
  const trechoDepois = (novo.match(/Na próxima aula[\s\S]*$/i) || ['(sem fecho)'])[0];

  console.log('── ' + slug);
  console.log('   ANTES : ' + trechoAntes);
  console.log('   DEPOIS: ' + trechoDepois);

  const sobrou = /(segunda|terça|quarta|quinta|sexta|sábado|domingo|dia \d|às \d|da tarde)/i.test(novo);
  console.log('   data removida: ' + (sobrou ? '❌ AINDA TEM SOBRA — CONFERIR' : '✅'));
  console.log('');

  if (!BUILD) continue;

  const fbDir = path.join(EXPORTS, slug + '-fb');
  fs.mkdirSync(fbDir, { recursive: true });
  for (const f of fs.readdirSync(dir)) {
    if (/^img\d+\.png$/i.test(f) || f === 'hook.txt' || f === 'prompts.txt') {
      fs.copyFileSync(path.join(dir, f), path.join(fbDir, f));
    }
  }
  fs.writeFileSync(path.join(fbDir, 'roteiro.txt'), novo, 'utf8');

  // meta: mesma legenda/título, sem publishAt (a data quem manda é a fila do FB)
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    delete meta.publishAt;
    meta.plataforma = 'facebook';
    meta.origem = slug;
    fs.writeFileSync(path.join(fbDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  } catch (e) { console.warn('   meta:', e.message); }

  const out = path.join(fbDir, slug + '-fb.mp4');
  const r = spawnSync(process.execPath, ['make-short-img-flex.js', fbDir, out, 'astronomy science cinematic'], {
    cwd: __dirname, encoding: 'utf8', stdio: 'inherit', timeout: 600000,
  });
  console.log('   ' + (r.status === 0 ? '✅ ' + path.basename(out) : '❌ falhou (status ' + r.status + ')'));
}

if (!BUILD) console.log('Confirmado o texto? rode:  node prep-fb-aulas.js --build');
