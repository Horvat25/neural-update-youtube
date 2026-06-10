# Neural Update — YouTube Shorts (memória do projeto)

Agente Node.js que **gera Shorts verticais automaticamente e publica no YouTube** via API oficial.
Projeto irmão do `neural-update-tiktok`. Marca: **Neural Update** (IA/tech, público BR). Blog: https://neural-update.com.br

## Arquitetura (2 apps que conversam por HTTP)
1. **neural-image-agent** (JÁ EXISTE, porta 3030) — "banco de imagens" agnóstico de canal. Recebe `POST /scene-images { script, count, source, sceneQueries }` e devolve imagens editoriais 1080x1920 com selo da marca. **Reutilizado como está** (via `image-client.js`).
2. **neural-update-youtube** (este) — escolhe tema → roteiro (LLM) → pede imagens ao agente → monta o Short (FFmpeg) → **publica no YouTube (API oficial, OAuth)**.

## O que foi REAPROVEITADO do projeto TikTok (cópia ~verbatim)
- `tts.js` — Edge TTS PT-BR + word boundaries (timing da legenda). Lê duração do stderr do ffmpeg-static (sem ffprobe).
- `ass-captions.js` — legenda karaokê estilo Opus Clip (.ass).
- `music-manager.js` — trilhas geradas localmente com FFmpeg (sem URL externa).
- `image-client.js` — cliente do banco de imagens (porta 3030).
- `video-creator.js` — pipeline FFmpeg: Ken Burns + xfade + legenda ASS + ducking(sidechain)+loudnorm + end-card, 1080x1920 @30fps, ≤58s. Só troquei a marca d'água (`@neural.update` → `neural-update.com.br`).
- `image-search.js` — versão ENXUTA (só Pexels; removi o Playwright/screenshot do original pra não arrastar dependência pesada).

## O que é NOVO / adaptado pro YouTube
- `content-generator.js` — persona "Lucas Reis" (estrategista YouTube). SEO: título 60-70 chars com palavra-chave, **descrição com link do blog nas 1ªs linhas** (clicável) + hashtags, **tags** de busca. Mantém 3 formatos + pools. LLM via OpenRouter (`anthropic/claude-sonnet-4-5`).
- `youtube-auth.js` — OAuth2 compartilhado (refresh_token em `.yt-tokens.json`).
- `youtube-login.js` — login one-time (loopback localhost:5757).
- `youtube-uploader.js` — `videos.insert` resumável (snippet+status, categoryId 28, #Shorts, privacy configurável). Trata erro de quota.
- `youtube-stats.js` — dados reais: `channels.statistics` + `youtubeAnalytics.reports` + últimos vídeos.
- `auto-agent.js` — orquestra; rotação de formatos `[noticia, conhecimento, noticia, tutorial]`; RSS Google News **+ o blog**; store em `data/posts.json` (sem Supabase).
- `daily-post.js` — one-shot (gera+publica 1) pro Agendador do Windows. Flags `--public/--unlisted/--private`.
- `process-schedule.js` — verificador autônomo da fila (`data/schedule.json`): posta 1 vencido + reagenda o resto +3h. Roda SEM o painel aberto.
- `scheduler.js` — (legado, node-cron) NÃO é o motor ativo.
- `server/dashboard.js` + `public/dashboard.html` — painel 5 abas + aba Configuração (OAuth pela tela), porta 3001.

## ⚙️ Agendamento & catch-up (Windows) — motor ATIVO
- Tarefa **NeuralUpdate-YouTube-3x** (09h/13h/19h): `node daily-post.js --public` → 3 vídeos novos/dia.
- Tarefa **NeuralUpdate-YouTube-Catchup** (cada 15 min): `node process-schedule.js` → processa a fila Agendar.
- Inicialização **NeuralUpdate-YT-Catchup.vbs** (pasta Startup): ao ligar o PC roda `process-schedule.js` na hora (catch-up imediato dos atrasados por queda de força).
- ⚠️ O **relógio interno (setInterval) do dashboard.js foi DESATIVADO** — a fila agora é disparada só pelo `process-schedule.js` (evita postar em dobro).
- Precisa do **PC ligado e logado**. PC off = não posta (recupera ao religar). 24/7 real só na nuvem.

## 📌 Estado atual (produção)
- Canal: **Neural Update** / **@NeuralUpdateBR** (UC-A9lvzxX_0tjPkf39qYGCg). Foto + banner Neural Update no ar.
- App OAuth (Google, projeto `fine-harbor-380403`, conta horvatvendas@gmail.com): **EM PRODUÇÃO** → refresh_token permanente (não expira em 7 dias).
- Formato dos vídeos: **Short curto ~24s / máx 55 palavras / gancho no 1º segundo** (alinhado ao TikTok). Config em `content-generator.js` (durationSeconds=24) e `video-creator.js` (clamp 16-32s).

## Formatos (diversificação automática)
- `noticia_tech` (precisa de notícia: Google News + blog) — fonte SÓ na descrição, nunca na voz.
- `tutorial` (evergreen) — passos numerados.
- `conhecimento` (evergreen) — ciência/quântica/mistérios, 100% factual.

## Regras de conteúdo (invioláveis)
- Nunca inventar números/dados fora da manchete.
- Fonte da notícia só na descrição (texto), nunca na narração (voz).
- CTA pro blog: VOZ convida sem ler URL; DESCRIÇÃO traz a URL completa (link clicável).

## Como rodar
```
npm install
# 1) preencher YT_CLIENT_ID / YT_CLIENT_SECRET no .env (Google Cloud → OAuth Desktop;
#    ativar YouTube Data API v3 + YouTube Analytics API; scopes upload/readonly/yt-analytics.readonly)
node youtube-login.js      # 1x — salva refresh_token em .yt-tokens.json
# 2) subir o banco de imagens (no projeto neural-image-agent): node src/index.js   (porta 3030)
node server/dashboard.js   # painel em http://localhost:3001
node daily-post.js --unlisted   # 1 ciclo: gera + publica como unlisted (revisar)
node youtube-stats.js      # estatísticas reais no terminal
```
Quota YouTube: `videos.insert` ≈ 1600 unidades; limite padrão 10.000/dia (~6 uploads). 2/dia sobra.

## Estado (2026-06-02)
- Código completo e com sintaxe validada (`node --check`).
- Chaves OpenRouter + Pexels já no `.env` (reaproveitadas do TikTok).
- **Pendente do Marcelo**: criar OAuth no Google Cloud e preencher YT_CLIENT_ID/SECRET + rodar `youtube-login.js`. Sem isso, gera vídeo mas não publica.
- **Não testado end-to-end** aqui: render real de vídeo (precisa do banco de imagens no ar) e upload (precisa do OAuth).

## Ambiente (do PC do Marcelo)
- Windows, Node v24, **sem Python/ffmpeg de sistema** → usamos `ffmpeg-static` (bundled). Não assumir ffmpeg no PATH.
