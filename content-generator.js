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
100% FACTUAL (ciência consolidada — nada de pseudociência, conspiração ou achismo).`,
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
const CONHECIMENTO_POOL = [
  'o que é mecânica quântica explicada de forma simples',
  'os maiores mistérios não resolvidos do universo',
  'como a inteligência artificial realmente aprende',
  'por que o tempo passa mais devagar perto de um buraco negro',
  'o paradoxo de Fermi: por que ainda não achamos aliens',
  'o que existe dentro de um buraco negro',
  'como funciona a criptografia que protege suas senhas',
  'o gato de Schrödinger explicado de verdade',
  'por que o universo está acelerando sua expansão',
  'como os computadores quânticos vão mudar tudo',
  'o que é o efeito borboleta e por que ele importa',
  'como o cérebro humano se compara a um computador',
];
function pickFromPool(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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
- RITMO ACELERADO: frases curtas, uma ideia por frase, sem enrolação. Corta tudo que não prende. O CTA do blog no fim entra nas 55 palavras (curtíssimo: "Tem mais no nosso blog").
- NÃO mencione fonte no texto FALADO. ${fmt.needsNews ? 'A fonte vai só na descrição.' : ''}
- NÃO invente fatos. ${fmt.needsNews ? 'Baseie-se na manchete.' : 'Mantenha 100% factual e correto.'}
- O roteiro FALADO TERMINA com CTA pro nosso blog "${BLOG_NAME}" (sem ler a URL; "no nosso blog" / "link na descrição").

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
  "script": "roteiro narrado (só texto falado). NUNCA cita fonte. NÃO inventa fatos. TERMINA convidando pra ler no nosso blog Neural Update (sem ler URL).",
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
