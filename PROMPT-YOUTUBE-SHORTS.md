# PROMPT — Construir o agente "Neural Update — YouTube Shorts"

> ⚠️ **Histórico (prompt original de construção).** O `neural-image-agent` ("banco de imagens", porta 3030) citado abaixo foi **removido em 2026-06-24** — o pipeline de imagem hoje é 100% Higgsfield, local, sem servidor satélite. Ver [CLAUDE.md](CLAUDE.md) pro estado atual; este arquivo fica só como registro do brief original.

## Papel
Você é um engenheiro de software senior. Construa, de ponta a ponta, um app Node.js que **gera Shorts verticais automaticamente e publica no YouTube**, espelhando a arquitetura de um projeto irmão de TikTok já existente (`neural-update-tiktok`). Trabalhe de forma coerente, testando cada peça, e **reaproveite módulos provados** em vez de reinventar.

## Contexto / arquitetura (2 apps que se comunicam por HTTP)
1. **neural-image-agent** (JÁ EXISTE, porta 3030) — "banco de imagens" agnóstico de canal. Recebe `POST /scene-images { script, count, sceneQueries }` e devolve imagens editoriais (foto de pessoa famosa com fundo removido + logo da marca, OU b-roll de conceito do Pexels, sempre 1080x1920 com selo "NEURAL UPDATE"). Cacheia tudo por hash em `bank/concepts` → **o banco se auto-alimenta**. **REUTILIZE ESSE AGENTE COMO ESTÁ.**
2. **neural-update-youtube** (VOCÊ VAI CRIAR) — app cliente que: escolhe tema → escreve roteiro (LLM) → manda o roteiro pro agente e recebe as imagens → monta o Short (FFmpeg) → **publica no YouTube via API oficial**.

## Stack
- Node.js + Express (dashboard/API), `googleapis` (YouTube Data + Analytics API), `fluent-ffmpeg` + `ffmpeg-static`, `msedge-tts` (TTS grátis), `axios`, `dotenv`, `node-cron`.
- LLM via OpenRouter (`anthropic/claude-sonnet-4-5`) pra roteiro.
- **NÃO use Playwright pra publicar** — o YouTube tem API oficial (use OAuth2). Playwright só se precisar de algo manual.

## Diferença-chave: publicação via YouTube Data API v3 (NÃO navegador)
- Crie um projeto no Google Cloud, ative **YouTube Data API v3** e **YouTube Analytics API**, gere um **OAuth Client ID (tipo Desktop)**.
- Scopes: `youtube.upload`, `youtube.readonly`, `yt-analytics.readonly`.
- Faça um `youtube-login.js` (one-time): abre a URL de consentimento no navegador, recebe o code via **redirect em loopback (localhost)**, troca por tokens e salva o **refresh_token** em `.yt-tokens.json`. Reuse o refresh_token nas próximas execuções (sem re-login).
- Upload: `youtube.videos.insert` (upload resumável) com:
  - `snippet`: `title` (com gancho + `#Shorts`), `description` (rica, com a URL do blog clicável + hashtags), `tags`, `categoryId` (`28` = Ciência & Tecnologia).
  - `status`: `privacyStatus` (`public`/`unlisted`/`private`), `selfDeclaredMadeForKids: false`.
- **Quota**: `videos.insert` custa ~1600 unidades; o limite padrão é 10.000/dia (~6 uploads/dia). 2/dia sobra. Trate erro de quota com mensagem clara.
- Para virar **Short**: vídeo **vertical 1080x1920** e **≤ 60s** + `#Shorts` no título/descrição (o YouTube detecta pelo aspecto+duração).

## Estatísticas reais (API oficial, sem scraping)
- Inscritos/views totais: `youtube.channels.list({ part:'statistics', mine:true })`.
- Por vídeo / período: `youtubeAnalytics.reports.query` (views, watch time, retenção). Mostre no dashboard.

## Estrutura de arquivos (espelhe o projeto de TikTok)
```
neural-update-youtube/
  dashboard.js           # Express + UI (porta 3001)
  content-generator.js   # LLM (Maya), MULTI-FORMATO, regras de credibilidade + CTA blog
  video-creator.js       # pipeline FFmpeg (REAPROVEITE do tiktok, é agnóstico)
  image-client.js        # chama /scene-images do agente (porta 3030)
  tts.js                 # Edge TTS (REAPROVEITE)
  ass-captions.js        # legenda karaokê (REAPROVEITE)
  music-manager.js       # trilhas geradas localmente (REAPROVEITE)
  youtube-uploader.js    # NOVO: API oficial (insert resumável)
  youtube-login.js       # NOVO: OAuth one-time (loopback)
  youtube-stats.js       # NOVO: channels.statistics + Analytics API
  auto-agent.js          # orquestra tema→roteiro→vídeo→upload, rotação de formatos
  scheduler.js           # node-cron 2x/dia + agendamento sob demanda
  daily-post.js          # ciclo one-shot (pro Agendador do SO)
  public/dashboard.html  # SPA com abas
```

## Formatos de vídeo (diversificação automática — round-robin)
Defina em `content-generator.js` um objeto `FORMATS` com prompt próprio por formato:
- `noticia_tech`: notícia real (Google News RSS + o blog Neural Update como fonte). **Fonte só na descrição, nunca na narração.**
- `tutorial`: "ensinando a usar ferramenta" (ChatGPT, IA, etc.) — passos numerados na fala.
- `conhecimento`: ciência/curiosidade (mecânica quântica, mistérios do universo, buraco negro...). **100% factual, sem pseudociência.**
Mantenha pools evergreen pros formatos sem notícia. Rotacione com um contador persistido. (No YouTube vale ter mais formatos "evergreen" porque o YT é movido por BUSCA, não só FYP.)

## Regras de CONTEÚDO (invioláveis)
- **Credibilidade**: nunca invente números/dados que não estejam na manchete; se faltar, fale geral.
- **Fonte da notícia**: só na **descrição** (texto), nunca na **narração** (voz).
- **CTA pro blog** (todo vídeo): a **voz** termina convidando pra ler no "nosso blog Neural Update" (sem ler a URL). A **descrição** traz a URL completa `https://neural-update.com.br` (no YouTube o link é clicável — aproveite, ponha logo nas 2 primeiras linhas).
- **SEO YouTube** (diferente do TikTok): título 60-70 chars com palavra-chave + gancho; descrição 300-800 chars com contexto, link do blog, e 3-5 hashtags; `tags` array com termos de busca.

## Qualidade do vídeo (REAPROVEITE o pipeline e respeite os parâmetros)
- 1080x1920, **30 fps**.
- Ken Burns (zoompan) por cena + transições `xfade` variadas (fade/smooth), 0.5s.
- **Legenda karaokê** estilo Opus Clip (ASS, palavra ativa destacada, fonte grande, contorno).
- Trilha **gerada localmente** (kick+baixo+arpejo+pad, multi-mood) — NÃO dependa de URLs externas. **Ducking** (sidechain) da música sob a voz + **loudnorm** (-14 LUFS).
- **End-card** nos últimos ~5s com CTA pro blog (sem emoji que o Arial não renderiza).
- A duração das imagens deve **cobrir exatamente a narração** (normalize as durações pós-xfade).

## Dashboard (SPA com abas — espelhe)
Abas: **Início** (auto-post, stats resumidas, pipeline ao vivo, fila com player), **Formatos** (gerar por formato), **Agendar** (agendar para horário; ticker publica), **Estatísticas** (dados reais via Analytics API), **Pesquisa** (manchetes que o bot está lendo + o blog). Tema escuro, profissional.

## Auto-publicação
- `scheduler.js`: node-cron 2x/dia (ex.: 12h e 19h BRT = 15h/22h UTC), chamando o ciclo completo (gera+publica) com rotação de formato.
- `daily-post.js`: ciclo one-shot pro Agendador de Tarefas do SO; **garante o agente de imagens no ar** (sobe se estiver offline) antes de gerar.

## ⚠️ Armadilhas conhecidas (resolva já — aprendemos na marra no projeto de TikTok)
1. **Duração**: `fluent-ffmpeg.ffprobe` falha sem binário do ffprobe → leia a duração do **stderr do ffmpeg-static** (regex `Duration:`). Senão o vídeo sai mais curto que o áudio e o `-shortest` corta o final.
2. **Música com FFmpeg `aevalsrc`**: como input lavfi, **vírgula é separador de filtro** → a expressão NÃO pode ter `between/mod/floor` (com vírgula). Faça ritmo com tremolo de senos (sem vírgula).
3. **Sidechain**: no mix, não consuma o mesmo pad 2x — use `asplit` pra duplicar a narração (uma pro mix, outra como chave do ducking).
4. **JSON do LLM**: às vezes vem malformado (hashtag sem aspas). Faça `parseJSON` com reparo leve + 1 retry.
5. **Emoji em `drawtext`**: o Arial não tem glifo → vira "□". Remova não-ASCII do texto de overlay (a legenda ASS pode manter acentos em UTF-8).
6. **Seleção de imagem**: a IA do roteiro gera `image_queries` específicas por cena → mande pro agente em `sceneQueries`. O banco busca no Pexels e cacheia (cresce sozinho). Pré-aqueça o banco com um `warm-bank.js` (ciência, quântica, espaço, mistérios, tutoriais, tech).

## Critérios de aceite
- `node youtube-login.js` autentica 1x e salva refresh_token.
- `node daily-post.js` gera um Short (formato rotacionado), com legenda, trilha, end-card, e **publica como `unlisted`** (pra revisar) ou `public`.
- Dashboard em http://localhost:3001 com as 5 abas funcionando; aba Estatísticas mostra inscritos/views REAIS via API.
- Verifique 1 vídeo de cada formato (notícia/tutorial/conhecimento) com imagens relevantes ao tema.
- Custo por vídeo ≈ só o roteiro (LLM); reporte o gasto.

Comece confirmando o que vai reaproveitar do projeto de TikTok, suba o plano e implemente por blocos, testando cada um.

---

### Notas de reuso (resumo)
- **Copie e use praticamente sem mudar:** `video-creator.js`, `tts.js`, `ass-captions.js`, `music-manager.js`, `image-client.js`, `scene-director.js` (no agente), `warm-bank.js`.
- **Adapte:** `content-generator.js` (persona/SEO YouTube + descrição com link clicável), `auto-agent.js` (troca `postToTikTok` por `youtube-uploader`), `dashboard.js` (porta 3001, aba Estatísticas via API).
- **Novo de verdade:** `youtube-uploader.js`, `youtube-login.js`, `youtube-stats.js`.
- O **neural-image-agent NÃO precisa ser duplicado** — os dois canais (TikTok e YouTube) consomem o mesmo banco na porta 3030.
