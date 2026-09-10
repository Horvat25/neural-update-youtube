'use strict';
/**
 * topic-analyzer.js — análise de desempenho por TEMA (sem LLM, custo zero).
 * Cruza os vídeos reais do canal (.yt-stats.json) com o histórico de posts
 * (data/posts.json) e responde:
 *   - qual assunto rende mais views (ranking por tema)
 *   - o que está repetido demais
 *   - sugestões pros próximos posts (pool filtrado + viés pro que performa)
 */
const { TUTORIAL_POOL, CONHECIMENTO_POOL } = require('./content-generator');

// Ideias curadas com hook pronto — ordenadas por potencial viral estimado.
// NÃO estão no pool automático do agente (são sugestões exclusivas do painel).
const VIRAL_IDEAS = [
  // ── Buraco negro (família comprovada: 340+ views médias)
  { topic: 'espaguetificação: como um buraco negro te destrói átomo por átomo', format: 'conhecimento', hook: '1 buraco negro te estica como espaguete até você sumir', why: 'Visual grotesco + buraco negro = combinação viral comprovada', theme: 'Buraco negro & espaço-tempo' },
  { topic: 'o paradoxo da informação: o problema que obcecou Hawking por 30 anos', format: 'conhecimento', hook: 'Hawking ficou 30 anos preso nesse paradoxo impossível', why: 'Drama científico + nome famoso + mistério aberto = engajamento alto', theme: 'Buraco negro & espaço-tempo' },
  { topic: 'ondas gravitacionais: em 2015 ouvimos dois buracos negros se fundindo', format: 'conhecimento', hook: 'Em 2015 ouvimos dois buracos negros colidindo a 1,3 bi de anos-luz', why: 'Fato histórico com escala incompreensível = para o scroll', theme: 'Buraco negro & espaço-tempo' },
  // ── Quântica (família comprovada: 766 views Schrödinger)
  { topic: 'interpretação dos muitos mundos: existe um você que fez a escolha oposta', format: 'conhecimento', hook: 'Existe outro você que tomou a decisão oposta nesse exato segundo', why: 'Personalização + multiverso = altíssimo "manda pro amigo"', theme: 'Física quântica' },
  { topic: 'o princípio da incerteza de Heisenberg: é impossível saber tudo sobre uma partícula', format: 'conhecimento', hook: 'É fisicamente impossível saber tudo — e não é limitação da tecnologia', why: 'Impossibilidade absoluta gera incredulidade → re-watch garantido', theme: 'Física quântica' },
  { topic: 'o efeito Zeno quântico: observar uma partícula pode congelá-la no tempo', format: 'conhecimento', hook: 'Olhar para uma partícula pode congelá-la no tempo — de verdade', why: 'Extensão do paradoxo do observador — compartilhado por quem amou Schrödinger', theme: 'Física quântica' },
  // ── Universo (números absurdos — maior potencial de hook)
  { topic: 'você é literalmente feito de poeira de estrelas mortas há bilhões de anos', format: 'conhecimento', hook: 'Você é literalmente feito de estrelas que explodiram antes da Terra existir', why: 'Poético + científico + identidade = altíssima taxa de saves', theme: 'Universo & mistérios' },
  { topic: 'um grama de antimáteria libera mais energia que qualquer bomba já criada', format: 'conhecimento', hook: '1g de antimáteria = energia de uma bomba nuclear × mil', why: 'Número de impacto imediato + visual instântaneo = para o scroll', theme: 'Universo & mistérios' },
  { topic: 'o Big Rip: como o universo pode se rasgar até os próprios átomos sumirem', format: 'conhecimento', hook: 'O universo vai se rasgar — até os átomos vão virar nada', why: 'Cenário apocalíptico + física real = viraliza fácil', theme: 'Universo & mistérios' },
  { topic: 'por que nada pode ser mais rápido que a luz — e como isso distorce o tempo', format: 'conhecimento', hook: 'Ir mais rápido que a luz não viola uma lei — viola o tempo', why: 'Reframe inesperado de algo que todo mundo ouviu mas não entende de verdade', theme: 'Universo & mistérios' },
  // ── Mente & tempo (relatable + compartilhável)
  { topic: 'por que o tempo parece passar mais rápido conforme você envelhece', format: 'conhecimento', hook: 'Para seu cérebro, 1 ano aos 40 = 1 mês quando você tinha 6 anos', why: 'Experiência universal + número relativo = compartilhamento amplo fora da bolha tech', theme: 'Mente & ciência' },
  { topic: 'a seta do tempo: por que você se lembra do passado mas não do futuro', format: 'conhecimento', hook: 'A física permite ir pro futuro E pro passado — mas o universo só deixa um', why: 'Contradição que prende + leva ao blog pra resolver o mistério', theme: 'Universo & mistérios' },
];

// Ordem importa: o primeiro regex que casar define o tema.
const THEMES = [
  { id: 'buraco_negro', label: 'Buraco negro & espaço-tempo', rx: /buraco\s*negro|black\s*hole|dilata[çc][aã]o do tempo|horizonte de eventos|hawking|viagem no tempo|relatividade/i },
  { id: 'quantica',     label: 'Física quântica',             rx: /qu[âa]ntic|schr[öo]dinger|entrela[çc]|superposi|dupla fenda|teletransporte/i },
  { id: 'universo',     label: 'Universo & mistérios',        rx: /universo|cosmos|alien|fermi|estrela|gal[áa]xia|expans[ãa]o|multiverso|mat[ée]ria escura|big bang|n[êe]utrons|simula[çc][ãa]o\b/i },
  { id: 'mente_ciencia',label: 'Mente & ciência',             rx: /c[ée]rebro|mem[óo]ria|criptografia|efeito borboleta|dna|psicolog/i },
  { id: 'tutorial',     label: 'Tutoriais de IA',             rx: /como (usar|criar|automatizar|transformar|resumir|pesquisar|montar|organizar)|tutorial|passo|chatgpt.{0,20}(estud|gr[áa]tis)|curr[íi]cul|perplexity|legendas autom/i },
  { id: 'carreira',     label: 'Carreira & dinheiro',         rx: /carreira|emprego|sal[áa]rio|profiss|vaga|pagam bem|trabalho/i },
  { id: 'ia_brasil',    label: 'IA no Brasil (notícias)',     rx: /brasil|regula[çc]|marco legal|cfm|nvidia|governo|empresa|anatel|congresso/i },
  { id: 'ia_geral',     label: 'IA geral',                    rx: /\bia\b|intelig[êe]ncia artificial|chatgpt|claude|gemini|openai|deepfake|rob[ôo]/i },
];

function classify(text) {
  const t = text || '';
  for (const th of THEMES) if (th.rx.test(t)) return th;
  return { id: 'outros', label: 'Outros' };
}

/**
 * @param statsCache  conteúdo de .yt-stats.json ({recent:[{title,views,likes,...}]})
 * @param posts       data/posts.json (pra mapear youtube_id → format/topic)
 * @param recentTopics temas já usados recentemente (anti-repetição)
 */
function analyzeTopics(statsCache, posts = [], recentTopics = []) {
  const videos = (statsCache && statsCache.recent) || [];
  const byId = new Map(posts.filter(p => p.youtube_id).map(p => [p.youtube_id, p]));

  // agrega vídeos por tema
  const themes = new Map();
  for (const v of videos) {
    const post = byId.get(v.id);
    const th = classify((post && post.topic) || v.title);
    if (!themes.has(th.id)) themes.set(th.id, { id: th.id, label: th.label, videos: 0, views: 0, likes: 0, comments: 0, best: null });
    const agg = themes.get(th.id);
    agg.videos++; agg.views += v.views || 0; agg.likes += v.likes || 0; agg.comments += v.comments || 0;
    if (!agg.best || (v.views || 0) > agg.best.views) agg.best = { title: v.title, views: v.views || 0, url: v.url };
  }
  const ranking = [...themes.values()]
    .map(t => ({ ...t, avgViews: t.videos ? Math.round(t.views / t.videos) : 0 }))
    .sort((a, b) => b.avgViews - a.avgViews);

  // repetições: mesmo tema (topic) postado 2+ vezes nos últimos posts
  const counts = new Map();
  for (const p of posts.slice(0, 40)) {
    if (!p.topic || p.status === 'video_error') continue;
    const k = p.topic.toLowerCase().trim();
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const repeated = [...counts.entries()].filter(([, n]) => n >= 2)
    .map(([topic, n]) => ({ topic, times: n })).sort((a, b) => b.times - a.times);

  // sugestões: pool fora dos temas recentes, ordenado pelo desempenho do tema
  const recent = new Set(recentTopics.map(t => t.toLowerCase().trim()));
  const score = id => { const t = ranking.find(r => r.id === id); return t ? t.avgViews : 0; };
  const suggestions = [
    ...CONHECIMENTO_POOL.map(t => ({ topic: t, format: 'conhecimento' })),
    ...TUTORIAL_POOL.map(t => ({ topic: t, format: 'tutorial' })),
  ]
    .filter(s => !recent.has(s.topic.toLowerCase().trim()))
    .map(s => { const th = classify(s.topic); return { ...s, theme: th.label, themeScore: score(th.id) }; })
    .sort((a, b) => b.themeScore - a.themeScore)
    .slice(0, 10);

  // filtra viral_ideas excluindo temas recentes
  const viral_ideas = VIRAL_IDEAS.filter(v => !recent.has(v.topic.toLowerCase().trim()));

  return { ranking, repeated, suggestions, viral_ideas, analyzed_videos: videos.length, fetched_at: statsCache && statsCache.fetched_at };
}

module.exports = { analyzeTopics, classify, THEMES, VIRAL_IDEAS };
