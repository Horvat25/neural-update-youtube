'use strict';
/**
 * gera-stories-dia.js — monta os 3 Stories de um dia: notícia, blog e Kindle.
 *
 *   node gera-stories-dia.js 2026-08-21 [2026-08-22 ...]
 *   node gera-stories-dia.js 2026-08-21 --dias 7      # o dia e os 6 seguintes
 *
 * A GRADE (decisão do Marcelo, 20/08/2026): 1 notícia + 1 Kindle + 1 blog por dia,
 * e TODOS divulgando o blog e o canal do YouTube — o rodapé do molde já faz isso.
 *
 * De onde sai cada um:
 *  • NOTÍCIA — do próprio vídeo de notícia daquele dia (lotes/*.json). O story é o
 *    trailer do vídeo que sai às 08h; se o vídeo mudar, o story acompanha sozinho.
 *  • BLOG — da matéria publicada naquele dia no catálogo do site. O ChatGPT cuida do
 *    blog agora; aqui a gente só divulga o que ele publicou.
 *  • KINDLE — 3 modelos que giram por dia. Um modelo só, repetido, vira cegueira de
 *    banner: o seguidor para de enxergar depois da terceira vez.
 *
 * ⚠️ AMAZON: nunca preço, nota em estrelas ou nº de avaliações fora da API deles.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LOTES = path.join(__dirname, 'lotes');
const CATALOGO = path.join(__dirname, '..', 'neural-update-forge', 'src', 'data', 'astronomy-week.mjs');
const SAIDA_JSON = path.join(__dirname, 'stories');

// ── Os 3 modelos do Kindle ────────────────────────────────────────────────────
// Cada um derruba uma objeção diferente, na ordem em que ela aparece na cabeça:
//   1. "por que eu leria?"  2. "não tenho o aparelho"  3. "vão me cobrar"
const KINDLE = [
  {
    selo: 'leitura',
    fato: 'Em 40 segundos [[não cabe]] o universo.',
    fonte: 'O que não coube no vídeo está nos livros. O primeiro mês é grátis; depois vira assinatura, e dá pra cancelar antes disso.',
    cta: 'Um mês de leitura ilimitada',
    ctaSub: 'Link na bio',
  },
  {
    selo: 'sem desculpa',
    fato: 'Você [[não precisa]] ter um Kindle pra usar o Kindle Unlimited.',
    fonte: 'O aplicativo é grátis e roda no celular que está na sua mão agora. O aparelho é opcional — a assinatura é que é paga, depois do primeiro mês.',
    cta: 'Começa hoje, do celular mesmo',
    ctaSub: 'Link na bio',
  },
  {
    selo: 'sem pegadinha',
    fato: 'O primeiro mês é [[grátis]] — e dá pra cancelar em dois toques.',
    fonte: 'Se não gostar, cancela antes de acabar o mês e não paga nada. Leva menos tempo que assistir a um Short.',
    cta: 'Testa e vê se vale',
    ctaSub: 'Link na bio',
  },
];

// ── auxiliares ────────────────────────────────────────────────────────────────
const iDias = process.argv.indexOf('--dias');
const nDias = iDias > -1 ? parseInt(process.argv[iDias + 1], 10) : 0;
// ⚠️ filtrar só o que começa com "--" não basta: o VALOR de `--dias 3` fica solto no
// argv e vira uma data chamada "3". Aconteceu na primeira execução e gerou um item
// vazio. Só entra quem tem cara de data.
const args = process.argv.slice(2).filter(a => /^\d{4}-\d{2}-\d{2}$/.test(a));
if (!args.length) { console.error('uso: node gera-stories-dia.js <AAAA-MM-DD> [...] [--dias N]'); process.exit(1); }

const dias = [];
for (const d of args) dias.push(d);
if (nDias > 1) {
  const base = new Date(args[0] + 'T12:00:00Z');
  for (let i = 1; i < nDias; i++) {
    const x = new Date(base); x.setUTCDate(x.getUTCDate() + i);
    dias.push(x.toISOString().slice(0, 10));
  }
}

// A palavra em CAPS do hook vira o destaque ciano do molde. Reaproveita o trabalho
// que já foi feito ao escrever o vídeo, em vez de inventar um destaque novo.
function destaca(texto, palavra) {
  if (!palavra) return texto;
  const re = new RegExp(`\\b(${palavra})\\b`, 'i');
  return re.test(texto) ? texto.replace(re, '[[$1]]') : texto;
}
const primeiraFrase = t => (String(t).match(/^[^.!?]+[.!?]/) || [String(t)])[0].trim();
const corta = (t, n) => (t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

// ── fontes de conteúdo ────────────────────────────────────────────────────────
// ⚠️ 29/08/2026 — POR QUE EXISTE O ENRIQUECIMENTO ABAIXO.
// Este script procurava `v.stream === 'news'` e `v.title` dentro dos arquivos de
// `lotes/`. Isso funcionava quando o lote era um SPEC completo. Só que os lotes novos
// (`semana-28ago-03set.json` e os `extra-*`) são arquivos de AGENDA: cada item tem só
// `slug` e `publishAt`. Resultado: o gerador não achava vídeo de notícia nenhum e o
// story das 08h parou de ser produzido — em silêncio, com um aviso no console que
// ninguém lê. Um terço do lote sumia sem nada quebrar.
//
// O conserto busca o que falta em `exports/<slug>/meta.json`, que existe para os 21.
// E o `stream` é deduzido pelo SLOT, não pelo emoji: 11:00Z = 08h BRT = notícia. É a
// lei do canal (LEIA-ANTES-DE-CRIAR.md) — "o slot manda, o emoji não é o formato".
function enriquece(v) {
  if (!v || !v.publishAt) return v;
  if (v.stream && v.title) return v;                       // spec completo, nada a fazer
  const meta = path.join(__dirname, 'exports', String(v.slug || ''), 'meta.json');
  let m = {};
  try { m = JSON.parse(fs.readFileSync(meta, 'utf8')); } catch { /* sem meta: fica como está */ }
  const hora = v.publishAt.slice(11, 13);
  const streamPorSlot = hora === '11' ? 'news' : hora === '17' ? 'aula' : 'viral';
  return {
    ...v,
    title: v.title || m.title || '',
    desc1: v.desc1 || String(m.description || '').split(String.fromCharCode(10))[0] || '',
    stream: v.stream || (m._prod && m._prod.stream) || streamPorSlot,
  };
}

const todosLotes = fs.readdirSync(LOTES).filter(f => f.endsWith('.json') && !f.startsWith('_'))
  .flatMap(f => { try { return JSON.parse(fs.readFileSync(path.join(LOTES, f), 'utf8')); } catch { return []; } })
  .filter(v => v && typeof v === 'object')
  .map(enriquece);

async function artigosDoDia(dia) {
  const m = await import('file:///' + CATALOGO.split(path.sep).join('/'));
  const lista = m.ASTRONOMY_WEEK_ARTICLES || [];
  return lista.filter(a => (a.published_at || '').startsWith(dia));
}

(async () => {
  const itens = [];

  for (const dia of dias) {
    const idx = Math.floor(new Date(dia + 'T12:00:00Z').getTime() / 86400000);

    // 1) NOTÍCIA — do vídeo de notícia daquele dia
    const video = todosLotes.find(v => v.stream === 'news' && (v.publishAt || '').startsWith(dia));
    if (video) {
      // Tira #Shorts e TODO emoji — na primeira versão o 🕳️ do título vazou pro story.
      const titulo = video.title
        .replace(/\s*#Shorts\s*$/i, '')
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2022}]/gu, '')
        .replace(/\s{2,}/g, ' ').trim();
      // O destaque sai da palavra em CAPS do PRÓPRIO TÍTULO (que por regra do playbook
      // já carrega a negação em maiúscula). Tentar pelo hook não funcionava: a palavra
      // do hook quase nunca aparece no título.
      const caps = (titulo.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}\b/g) || [])
        .filter(w => !/^(NEURAL|UPDATE|SHORTS)$/.test(w))[0];
      itens.push({
        // BRT = UTC−3. Os 3 slots são os que já existiam: 08h, 16h e 20h BRT.
        slug: `story-noticia-${dia}`, tipo: 'noticia', dia, quando: `${dia}T11:00:00.000Z`,
        selo: 'descoberta',
        fato: destaca(titulo + '.', caps),
        fonte: corta(primeiraFrase(video.desc1), 150),
        cta: 'O vídeo completo está no perfil',
        ctaSub: 'E o texto, no blog',
      });
    } else {
      console.error(`⚠️ ${dia}: nenhum vídeo de notícia nos lotes — story de notícia não gerado`);
    }

    // 2) BLOG — matéria publicada naquele dia
    const arts = await artigosDoDia(dia);
    if (arts.length) {
      const a = arts[idx % arts.length];   // gira entre as do dia, estável
      itens.push({
        slug: `story-blog-${dia}`, tipo: 'blog', dia, quando: `${dia}T19:00:00.000Z`,
        selo: 'no blog hoje',
        fato: corta(a.title.replace(/\s*[:—-]\s*.*$/, ''), 70),
        fonte: corta(a.excerpt || a.subtitle || '', 150),
        cta: 'Leia em neural-update.com.br',
        ctaSub: 'Link na bio · matéria nova todo dia',
      });
    } else {
      console.error(`⚠️ ${dia}: nenhuma matéria publicada no blog — story de blog não gerado`);
    }

    // 3) KINDLE — gira entre os 3 modelos
    const k = KINDLE[idx % KINDLE.length];
    itens.push({ slug: `story-kindle-${dia}`, tipo: 'kindle', dia, quando: `${dia}T23:00:00.000Z`, ...k });
  }

  const arq = path.join(SAIDA_JSON, `dia-${dias[0]}${dias.length > 1 ? `-a-${dias[dias.length - 1]}` : ''}.json`);
  fs.writeFileSync(arq, JSON.stringify(itens, null, 2) + '\n', 'utf8');
  console.log(`${itens.length} story(ies) descritos em ${path.basename(arq)}`);

  execFileSync(process.execPath, [path.join(__dirname, 'gera-stories.js'), arq], { stdio: 'inherit' });
})().catch(e => { console.error('ERRO:', e.message); process.exitCode = 1; });
