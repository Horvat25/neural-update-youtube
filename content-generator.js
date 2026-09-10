require('dotenv').config();
const axios = require('axios');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.LLM_MODEL || 'anthropic/claude-sonnet-4-5';

// Blog oficial — todo vídeo faz CTA pra cá.
// VOZ: convida pro blog SEM ler a URL. DESCRIÇÃO: URL completa (link clicável no YouTube).
const BLOG_NAME = 'Neural Update';
const BLOG_URL = process.env.BLOG_URL || 'https://neural-update.com.br';

// ─── Persona: estrategista de YouTube ───────────────────────────────────────
// Diferente do TikTok (Maya/FYP): o YouTube é movido por BUSCA + SUGERIDOS,
// então título/descrição/tags com palavra-chave valem MUITO (long-tail).
const PERSONA = `Você é Lucas Reis, ex-estrategista de crescimento do YouTube (time de Partnerships), 9 anos otimizando canais de tecnologia.

CONHECIMENTO DO ALGORITMO DE SHORTS + SEO DO YOUTUBE:
- Shorts: o GANCHO tem que prender no 1º segundo (sem intro). Retenção e re-watch (loop) são o que mais empurram no feed de Shorts.
- O YouTube NÃO é só FYP: ele é movido por BUSCA e SUGERIDOS. Por isso TÍTULO, DESCRIÇÃO e TAGS com palavra-chave geram descoberta de cauda longa (diferente do TikTok).
- TÍTULO: 60-70 caracteres. Front-load a PALAVRA-CHAVE + um gancho de curiosidade. NÃO escreva "#Shorts" no título (o sistema adiciona).
- DESCRIÇÃO: 300-800 caracteres. As 2 PRIMEIRAS LINHAS são as únicas visíveis sem clicar — coloque o gancho + o LINK do blog logo no topo (no YouTube o link é clicável = tráfego real). Depois, contexto. Termine com 3-5 hashtags (a 1ª hashtag aparece ACIMA do título no Short).
- TAGS: 8-15 termos de busca reais (variações do tema, em PT e alguns em EN). Ajudam a indexar.
- Vídeos verticais 1080x1920 com ≤60s são detectados como Short automaticamente.

REGRA DE CREDIBILIDADE (inviolável):
- Baseie-se APENAS no que a manchete/fonte realmente diz. NUNCA invente números, datas, placares, falas ou estatísticas que não estão na notícia. Na dúvida, fale de forma geral.
- A FONTE da notícia vai SOMENTE na descrição (texto). NUNCA cite a fonte na NARRAÇÃO (voz) — nada de "segundo o G1". O áudio não cita fonte.

CTA OBRIGATÓRIO PRO BLOG (todo vídeo):
- VOZ (roteiro falado): termina convidando pra ler a análise completa no nosso blog "${BLOG_NAME}". NUNCA leia a URL em voz alta — diga "no nosso blog" / "link na descrição".
- DESCRIÇÃO (texto): escreve a URL completa ${BLOG_URL} nas 2 PRIMEIRAS LINHAS (ex: "Análise completa: ${BLOG_URL}"). A URL aparece SÓ na descrição, nunca na voz.

FOCO: Canal Neural Update, conteúdo de IA e tecnologia, público BR, meta de crescimento de inscritos.
ESTRATÉGIA: choque + utilidade. Todo vídeo deve fazer o espectador pensar "eu precisava saber disso".`;

async function callLLM(prompt, maxTokens = 2000) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY não configurado no .env');
  }
  const res = await axios.post(OPENROUTER_URL, {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: `${PERSONA}\n\n${prompt}` }],
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': BLOG_URL,
      'X-Title': 'Neural Update YouTube Bot',
    },
    timeout: 60000,
  });
  return res.data.choices[0].message.content;
}

function parseJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Sem JSON na resposta: ' + text.substring(0, 200));
  let s = match[0];
  try { return JSON.parse(s); } catch (e) {
    // Reparos leves p/ glitches comuns do LLM (não quebrar post automático)
    s = s
      .replace(/,\s*([}\]])/g, '$1')                           // vírgula sobrando
      .replace(/([\[,]\s*)(#[\wÀ-ÿ]+)"/g, '$1"$2"')            // hashtag sem aspas de abertura
      .replace(/([\[,]\s*)(#[\wÀ-ÿ]+)(\s*[,\]])/g, '$1"$2"$3'); // hashtag sem aspas nenhuma
    return JSON.parse(s);
  }
}

// ─── FORMATOS DE VÍDEO (diversificação automática) ───────────────────────────
const FORMATS = {
  noticia_tech: {
    label: 'Notícia de tecnologia',
    needsNews: true,
    hashtags: ['#Shorts', '#tecnologia', '#ia', '#noticias', '#neuralupdate'],
    task: (t, d) => `FORMATO: NOTÍCIA de tecnologia.
Manchete real: "${t.title}"
Fonte: ${t.source || 'veículo de notícias'}
Contexto/ângulo: ${t.angle || ''}
Crie um Short de ${d}s sobre esta NOTÍCIA REAL. Não invente nenhum dado que não esteja na manchete.`,
  },
  tutorial: {
    label: 'Tutorial de ferramenta',
    needsNews: false,
    hashtags: ['#Shorts', '#tutorial', '#ia', '#produtividade', '#neuralupdate'],
    task: (t, d) => `FORMATO: TUTORIAL prático ("ensinando a usar").
Tema: "${t.title}"
Crie um Short de ${d}s ENSINANDO isso de forma direta e acionável.
Estrutura: hook com o benefício final → 3 a 5 passos rápidos e claros (numere na fala: "primeiro... depois...") → resultado.
Linguagem simples. NÃO invente recursos/menus que a ferramenta não tem.`,
  },
  conhecimento: {
    label: 'Conhecimento e curiosidades',
    needsNews: false,
    hashtags: ['#Shorts', '#curiosidades', '#ciencia', '#voceSabia', '#neuralupdate'],
    task: (t, d) => `FORMATO: CONHECIMENTO fascinante (ciência, universo, mistérios, tecnologia).
Tema: "${t.title}"
Crie um Short de ${d}s explicando de forma SIMPLES e DE TIRAR O FÔLEGO.
Comece com um fato que dá nó na cabeça, explique com analogias do dia a dia.
100% FACTUAL (ciência consolidada — nada de pseudociência, conspiração ou achismo).
REGRA DE HOOK (CRÍTICA): O 1º segundo do vídeo DEVE conter a palavra-chave central do título na voz, criando tensão imediata. Exemplo: se o título menciona "buraco negro engolindo planeta", a primeira frase deve ser sobre isso — nunca uma introdução genérica. A tensão deve ser estabelecida em ≤8 palavras.`,
  },
};

// Temas evergreen (sem precisar de notícia) — bons no YouTube porque rankeiam na BUSCA
const TUTORIAL_POOL = [
  'como usar o ChatGPT pra estudar de graça',
  'como criar imagens incríveis com IA no Gemini',
  'como resumir qualquer vídeo do YouTube com IA',
  'como usar o Claude pra escrever textos melhores',
  'como automatizar tarefas repetitivas com IA sem programar',
  'como transformar suas fotos com IA de graça',
  'como usar IA pra montar um currículo melhor',
  'como pesquisar melhor usando o Perplexity',
  'como criar legendas automáticas pros seus vídeos com IA',
  'como usar IA pra organizar seus estudos',
];
// Análise do canal (jun/2026): espaço/quântica performa 5-10x melhor que o resto
// (Schrödinger 766 views, buraco negro 340+ vs notícias ~30-90). Pool ampliado
// com temas VIZINHOS dos campeões — mesmo apelo, sem repetir o mesmo título.
const CONHECIMENTO_POOL = [
  // quântica / física (família do Schrödinger)
  'o que é mecânica quântica explicada de forma simples',
  'o gato de Schrödinger explicado de verdade',
  'entrelaçamento quântico: a conexão assustadora que Einstein odiava',
  'o experimento da dupla fenda que quebra a realidade',
  'como os computadores quânticos vão mudar tudo',
  'teletransporte quântico já existe e funciona assim',
  // buraco negro / espaço-tempo (família do buraco negro)
  'por que o tempo passa mais devagar perto de um buraco negro',
  'o que existe dentro de um buraco negro',
  'radiação de Hawking: como um buraco negro evapora',
  'o que acontece se você cair em um buraco negro',
  'viagem no tempo é possível? o que a física diz de verdade',
  'estrelas de nêutrons: uma colher delas pesa bilhões de toneladas',
  // universo / mistérios
  'os maiores mistérios não resolvidos do universo',
  'o paradoxo de Fermi: por que ainda não achamos aliens',
  'por que o universo está acelerando sua expansão',
  'matéria escura: 85% do universo é invisível',
  'o que havia antes do Big Bang segundo a ciência',
  'como o universo vai acabar segundo a física',
  'vivemos em uma simulação? o que a ciência responde',
  // mente / tecnologia
  'como a inteligência artificial realmente aprende',
  'como funciona a criptografia que protege suas senhas',
  'o que é o efeito borboleta e por que ele importa',
  'como o cérebro humano se compara a um computador',
  'por que seu cérebro apaga memórias de propósito',
  // buraco negro expandido (família 340+ views)
  'espaguetificação: como um buraco negro te destrói átomo por átomo',
  'ondas gravitacionais: em 2015 ouvimos dois buracos negros se fundindo',
  'o paradoxo da informação: o problema que obcecou Hawking por 30 anos',
  // quântica expandida (família 766 views)
  'interpretação dos muitos mundos: existe um você que fez a escolha oposta',
  'o princípio da incerteza de Heisenberg: é impossível saber tudo sobre uma partícula',
  'o efeito Zeno quântico: observar uma partícula pode congelá-la no tempo',
  // universo com números absurdos
  'você é literalmente feito de poeira de estrelas mortas há bilhões de anos',
  'um grama de antimáteria libera mais energia que qualquer bomba já criada',
  'o Big Rip: como o universo pode se rasgar até os próprios átomos sumirem',
  'por que nada pode ser mais rápido que a luz e como isso distorce o tempo',
  // mente & tempo (relatable, alto compartilhamento fora da bolha tech)
  'por que o tempo parece passar mais rápido conforme você envelhece',
  'a seta do tempo: por que você se lembra do passado mas não do futuro',
  // novos (jun/2026) — famílias campeãs (buraco negro/espaço/quântica), evitando temas já feitos
  'o que aconteceria se o Sol desaparecesse agora mesmo',
  'o universo tem um som — e os cientistas já gravaram ele',
  'por que o vácuo do espaço não é realmente vazio',
  'quasares: os objetos mais brilhantes do universo e o que eles escondem',
  'o paradoxo dos gêmeos: por que viajar perto da velocidade da luz te deixa mais jovem',
  'quantos universos cabem dentro de um buraco negro segundo a física',
  'por que dois relógios atômicos idênticos nunca mais concordam depois de separados',
  'o universo pode ser um holograma gigante? o que a física diz sobre isso',
  'a anatomia de um buraco negro: o que existe em cada camada até o centro',
  'a estrela mais próxima da Terra de virar um buraco negro',
  'o experimento que sugere que o passado pode ser influenciado pelo futuro',
  'por que astronautas voltam do espaço mais altos (e o que isso revela sobre gravidade)',
];
// Sorteia evitando temas usados recentemente (anti-repetição).
function pickFromPool(arr, recentTopics = []) {
  const recent = new Set(recentTopics.map(t => (t || '').toLowerCase().trim()));
  const fresh = arr.filter(t => !recent.has(t.toLowerCase().trim()));
  const pool = fresh.length ? fresh : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Geração de roteiro + SEO YouTube (multi-formato) ─────────────────────────
async function generateScript(topic, format = 'noticia_tech', durationSeconds = 24) {
  const fmt = FORMATS[format] || FORMATS.noticia_tech;
  const descRule = fmt.needsNews
    ? `descrição 300-800 chars: 1ª linha = gancho + "Análise completa: ${BLOG_URL}". Depois resume a notícia, dá contexto e CITA A FONTE. Termina com 3-5 hashtags. Sem inventar números.`
    : `descrição 300-800 chars: 1ª linha = gancho + "Análise completa: ${BLOG_URL}". Depois aprofunda o tema com valor real. Termina com 3-5 hashtags. NÃO use "Fonte:" (não é notícia).`;
  const sourceField = fmt.needsNews ? `\n  "source": "nome da fonte da notícia (ex: G1, TechCrunch)",` : '';

  const prompt = `
${fmt.task(topic, durationSeconds)}

Aplique TODAS as suas técnicas de SEO/retenção do YouTube, respeitando as regras invioláveis:
- VÍDEO CURTO E RÁPIDO (REGRA DURA): o campo "script" deve ter NO MÁXIMO 55 PALAVRAS (~22-25s falados). Conte as palavras; se passar, CORTE sem dó. Short curto retém e cresce mais.
- GANCHO NO 1º SEGUNDO: a 1ª frase JÁ entrega o choque/curiosidade — nada de introdução ("hoje vou falar", "você sabia"). Vai direto no impacto.
- RITMO ACELERADO: frases curtas, uma ideia por frase, sem enrolação. Corta tudo que não prende.
- CTA É SÓ VISUAL — NUNCA FALADO: o campo "cta_text_overlay" cuida disso na tela. NÃO escreva "Tem mais no blog", "link na descrição" nem qualquer menção ao blog no campo "script". O script termina com a frase de loop — ponto final.
- LOOP NATURAL (REGRA DE OURO VIRAL): a ÚLTIMA frase do "script" DEVE ecoar a primeira — cria um loop perfeito que faz o viewer assistir de novo sem perceber. Ex: abre com "Você está viajando no tempo AGORA" → fecha com "...então sim, neste segundo, você está viajando no tempo." Sem CTA depois do loop. O loop é o que faz vídeos passarem de 100k pra 1M de views.
- ESCADA DE CHOQUE: cada frase deve ser MAIS surpreendente que a anterior. Progressão obrigatória: fato curioso → fato chocante → fato impossível de acreditar → CTA. Nunca nivelado.
- NÚMERO ESPECÍFICO NO MEIO: ao redor da metade do roteiro, use um número exato (NUNCA "bilhões" — sempre "13.800.000.000" ou "93 bilhões de anos-luz" ou "10^80 átomos"). Número absurdo específico para o scroll.
- NÃO mencione fonte no texto FALADO. ${fmt.needsNews ? 'A fonte vai só na descrição.' : ''}
- NÃO invente fatos. ${fmt.needsNews ? 'Baseie-se na manchete.' : 'Mantenha 100% factual e correto.'}

REGRA CRÍTICA para image_queries (será usada no Pexels — imagens reais):
- NUNCA genérico: "artificial intelligence", "technology", "business", "innovation", "digital"
- SEMPRE descreva a CENA exata como um cinematógrafo (lighting dramático, close-ups, moody, editorial, cinematic)
- Específicas do TEMA (ex: quântica → "glowing particle physics simulation dark"; buraco negro → "black hole space accretion disk cinematic"; tutorial ChatGPT → "person typing laptop ai chat screen glow")
- Queries em INGLÊS, 4-8 palavras cada
- Varie: 2 com pessoa, 2 com objeto/cena do tema, 2 atmosféricas

Responda APENAS em JSON válido:
{
  "title": "título de BUSCA: 60-70 chars, palavra-chave no começo + gancho. SEM #Shorts.",
  "hook": "frase exata do 1º segundo — choque ou curiosidade extrema",
  "script": "roteiro narrado (só texto falado, SEM nenhum CTA verbal). NUNCA cita fonte. NÃO inventa fatos. ÚLTIMA FRASE = eco da primeira (loop perfeito). SEM 'Tem mais no blog' ou qualquer menção ao Neural Update.",
  "description": "${descRule}",${sourceField}
  "tags": ["8-15 termos de busca (PT e alguns EN), sem #"],
  "hashtags": ["#Shorts","#tag2","#tag3","#tag4"],
  "cta": "frase final FALADA puxando pro blog Neural Update (sem URL)",
  "best_post_time": "HH:MM",
  "image_queries": ["query1 ingles especifica","query2","query3","query4","query5","query6"],
  "hook_text_overlay": "texto grande na tela no 1º segundo (máx 6 palavras)",
  "cta_text_overlay": "texto do card final puxando pro blog (ex: Analise completa - link na descricao)",
  "algorithm_notes": "por que vai performar (retenção + busca)"
}`;
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = parseJSON(await callLLM(prompt, 2200));
      r.format = format;
      if (!Array.isArray(r.hashtags) || !r.hashtags.length) r.hashtags = fmt.hashtags;
      if (!r.hashtags.some(h => /#shorts/i.test(h))) r.hashtags.unshift('#Shorts'); // garante #Shorts
      if (!Array.isArray(r.tags) || !r.tags.length) r.tags = [topic.title || format];
      return r;
    } catch (e) { lastErr = e; console.warn('[llm] roteiro tentativa ' + attempt + ' falhou: ' + e.message); }
  }
  throw lastErr;
}

async function analyzePerformance(videos) {
  if (!videos || !videos.length) return null;
  const text = await callLLM(`
Analise a performance destes Shorts e dê insights baseados no algoritmo do YouTube (retenção + busca):
${JSON.stringify(videos.map(v => ({ title: v.title, topic: v.topic, format: v.format, views: v.views || 0 })), null, 2)}

JSON:
{
  "top_patterns": ["padrão 1","padrão 2"],
  "avoid": ["o que evitar"],
  "next_topics": ["tópico 1","tópico 2","tópico 3"],
  "best_times": ["HH:MM","HH:MM"],
  "title_tip": "dica de título pra busca",
  "tag_tip": "dica de tags"
}`, 1000);
  return parseJSON(text);
}

module.exports = {
  generateScript, analyzePerformance, callLLM,
  FORMATS, TUTORIAL_POOL, CONHECIMENTO_POOL, pickFromPool,
  BLOG_URL, BLOG_NAME,
};
