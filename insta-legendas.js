'use strict';
/**
 * insta-legendas.js — reescreve a legenda dos reels do lote na fila do Instagram.
 *
 * POR QUE O INSTAGRAM TEM LEGENDA PRÓPRIA (decisão do Marcelo, 20/08/2026):
 * o público das duas redes é DIFERENTE e não se conhece. Quem segue o Insta não
 * sabe que existe canal no YouTube — então a legenda nunca pode dizer "tem um
 * vídeo de 15 min no canal" como se a pessoa soubesse qual canal é. E no Shorts
 * quase ninguém lê descrição, enquanto no Insta a legenda é lida: por isso o peso
 * da oferta fica na LEGENDA no Insta e no COMENTÁRIO FIXADO no YouTube.
 *
 * Ordem da legenda (a ordem é a mensagem):
 *   1. conteúdo
 *   2. PEDIDO DE ENVIO — o principal. Compartilhamento pesa 3-5x mais que curtida
 *      pra alcançar não-seguidor, e tem que ser ESPECÍFICO do vídeo.
 *   3. Kindle + link na bio (a bio abre a página do Neural Update, e lá o botão
 *      leva pra Amazon). O aviso de afiliado NÃO vai aqui: ele é obrigatório
 *      ONDE O LINK APARECE, e o link está na página da bio, que já o exibe.
 *      Decisão do Marcelo em 20/08 — na legenda só poluía.
 *   4. divulgação do canal do YouTube, pelo NOME (a página de bio não tem botão
 *      do YouTube; quando tiver, isso vira "link na bio")
 *   5. 3 hashtags
 *
 * ⚠️ Amazon: nunca preço, nota em estrelas ou nº de avaliações fora da API deles.
 *
 *   node insta-legendas.js <fila-remota.json> <spec.json> [--seco]
 */
const fs = require('fs');

const [filaPath, specPath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const SECO = process.argv.includes('--seco');
if (!filaPath || !specPath) { console.error('uso: node insta-legendas.js <fila-remota.json> <spec.json> [--seco]'); process.exit(1); }

const KINDLE = '📚 Gosta desses assuntos? O primeiro mês do Kindle Unlimited é grátis (depois vira assinatura paga, e dá pra cancelar antes de acabar o mês) — link na bio.';
const YOUTUBE = '🎥 As aulas e os documentários completos ficam no nosso canal do YouTube: Neural Update.';

// Pedido de envio, um por vídeo. Genérico não funciona: tem que nomear a pessoa
// que o espectador conhece.
const ENVIO = {
  'nw-estrela-de-buraco-negro': '📩 Manda pro amigo que acha que já viu de tudo sobre buraco negro.',
  'pl20-antes-do-big-bang': '📩 Manda pra pessoa que sempre te pergunta o que tinha antes do Big Bang.',
  'v47-voyager-depois-do-sol': '📩 Manda pro amigo que acha que nada que a gente constrói sobrevive à gente.',
  'nw-agua-no-sagitario': '📩 Manda pro amigo que acha que buraco negro só sabe destruir.',
  'pl21-inflacao': '📩 Manda pra quem jura que nada no universo passa da velocidade da luz.',
  'v48-lua-dos-dinossauros': '📩 Manda pro amigo que nunca reparou que a Lua mostra sempre a mesma cara.',
  'nw-redemoinhos-no-sol': '📩 Manda pro amigo que acha que já sabem tudo sobre o Sol.',
  'pl22-materia-e-antimateria': '📩 Manda pra quem acha que antimatéria é invenção de ficção científica.',
  'v49-vento-de-netuno': '📩 Manda pro amigo que reclama do vento aí fora.',
  'nw-asteroide-nysa': '📩 Manda pro amigo que gosta de coisa que a ciência ainda não conseguiu explicar.',
  'pl23-tres-primeiros-minutos': '📩 Manda pra quem bebe água todo dia sem saber de onde ela veio.',
  'v50-planetas-entre-terra-e-lua': '📩 Manda pro amigo que acha que a Lua é logo ali.',
  'nw-cometa-mcnaught': '📩 Manda pro amigo que tem um binóculo parado em casa — dá pra ver essa semana.',
  'pl24-primeiras-estrelas': '📩 Manda pra quem acha que o universo sempre teve estrelas.',
  'v51-terremoto-na-lua': '📩 Manda pro amigo que acha que a Lua é um lugar morto e parado.',
  'nw-nebulosa-do-leao': '📩 Manda pro amigo que nunca parou pra pensar em como o Sol vai acabar.',
  'pl25-teia-cosmica': '📩 Manda pra quem acha que as galáxias estão jogadas a esmo pelo universo.',
  'v52-por-do-sol-azul-em-marte': '📩 Manda pro amigo que fotografa todo pôr do sol.',
  'nw-planeta-que-sobreviveu': '📩 Manda pro amigo que acha que quando a estrela morre acaba tudo em volta.',
  'pl26-limite-da-luz': '📩 Manda pra quem já perguntou por que não dá pra ir mais rápido que a luz.',
  'v53-ceu-do-bisavo': '📩 Manda pro amigo que acha que o céu é o mesmo desde sempre.',
};

const CORRIGE_HASHTAG = { '#viakactea': '#vialactea' };

const fila = JSON.parse(fs.readFileSync(filaPath, 'utf8'));
const itens = JSON.parse(fs.readFileSync(specPath, 'utf8'));
let n = 0, faltando = [];

for (const it of itens) {
  const post = fila.find(p => p.slug === it.slug);
  if (!post) { console.error(`✗ ${it.slug} — não está na fila`); continue; }
  if (post.status !== 'agendado') { console.error(`✗ ${it.slug} — status "${post.status}", não mexo`); continue; }
  const envio = ENVIO[it.slug];
  if (!envio) { faltando.push(it.slug); continue; }

  const tags = (it.hashtags || []).map(h => CORRIGE_HASHTAG[h] || h).join(' ');
  const nova = [it.desc1, envio, KINDLE, YOUTUBE, tags].join('\n\n');

  if (SECO) { if (n === 0) { console.log('EXEMPLO (' + it.slug + '):\n---\n' + nova + '\n---\n'); } n++; continue; }
  post.legenda = nova;
  n++;
}

if (faltando.length) console.error('⚠️ SEM pedido de envio escrito: ' + faltando.join(', '));
if (!SECO && n) fs.writeFileSync(filaPath, JSON.stringify(fila, null, 2) + '\n', 'utf8');
console.log(`${n} legenda(s) reescrita(s)${SECO ? ' [seco]' : ''}`);
if (!SECO && n) console.log('agora: commitar no origin/main pelo worktree');
