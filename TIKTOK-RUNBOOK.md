# TikTok — postagem via API oficial (grátis, sem shadowban)

Pipeline pronto (10/jul/2026). Vídeos já renderizados com **trilha segura** em `tiktok-lote/`
(39, formato do Instagram, card COMENTA COSMOS nos 10 isca). Legendas em `tiktok-lote/_captions.txt`.

## Estado do setup (11/jul/2026) — JÁ FEITO
- App "Neural Update" (ID 7592421545646295052) em developers.tiktok.com, conta dev = Gmail.
- Sandbox com **Target User = `neuralupdate1`** (a antiga `neural.update` foi removida).
- Produtos Login Kit + Content Posting API; scopes user.info.basic, video.upload, video.publish.
- Redirect URI (sandbox): `https://a5f03faa-cc5d-472c-b6bd-e7fe654c2ab6.lovableproject.com/tiktok-callback`
  (já gravado em `.env` como TIKTOK_REDIRECT_URI). Scope de trabalho: `user.info.basic,video.upload`.

## O que FALTA (2 passos do usuário)
1. **Credenciais** — em App details → Credentials, revela (👁) e cola no `.env`:
   `TIKTOK_CLIENT_KEY=...` / `TIKTOK_CLIENT_SECRET=...` (direto no arquivo, nunca no chat).
2. `node tiktok-login.js` → autoriza como **`neuralupdate1`** → cola a URL `.../tiktok-callback?code=...`
   no terminal → salva `.tiktok-tokens.json`.

## Rotina (depois do setup)
- `node tiktok-push.js list` → mostra o que falta, na ordem da grade.
- `node tiktok-push.js 5` → manda os próximos 5 pros **rascunhos** do TikTok.
- No celular: TikTok → Rascunhos → abre, **cola a legenda** de `_captions.txt` → Postar
  (dá pra agendar na hora, no próprio app).

## Modo direto (100% automático) — quando escalar
Envia o app pra **auditoria** do TikTok (grátis, uns dias). Aprovado, troca no `.env`:
`TIKTOK_SCOPE=user.info.basic,video.publish` e roda `MODE=direct node tiktok-push.js 5`
→ publica sozinho, com a legenda, sem tocar no celular.

## Regenerar (se mudar vídeos/legendas)
- `node build-tiktok-lote.js`  (rebuild com trilha segura — pula prontos)
- `node gen-tiktok-captions.js` (legendas)
- `node tiktok-music-id.js tiktok-lote/<arquivo>.mp4`  (confere trilha antes de subir)

⚠️ NUNCA usar cosmic-the-descent / cosmic-infinite-perspective / dark-bump-in-the-night
(flagradas pelo Content ID → vídeo silenciado). Já estão em `assets/music-quarantine/`.
