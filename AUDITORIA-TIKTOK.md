# Auditoria do app TikTok — kit de submissão (preparado 11/jul/2026)

Objetivo: aprovar o app "Neural Update" pra **Direct Post público** → `tiktok-scheduler.js`
posta sozinho (legenda + horário + catch-up). Submissão: developers.tiktok.com → app → **App review**.

## Antes de submeter (checklist)
- [ ] REMOVER produtos/scopes não usados (Share Kit, Webhooks) — scopes extras sem demo = rejeição
      (foi provavelmente por isso que rejeitaram em abril: pediram 4 produtos e o demo não mostrava todos).
- [ ] Manter SÓ: Login Kit (user.info.basic) + Content Posting API (video.upload, video.publish).
- [ ] Terms/Privacy URLs: manter os do gram-text-wizard (páginas existem) ou trocar por
      https://neural-update.com.br/terms-of-service e /privacy-policy se essas páginas existirem.
- [ ] Demo video NOVO (o tiktok-demo.mp4 de março mostra o fluxo antigo): gravar a tela mostrando
      1) `node tiktok-login.js` → tela de consentimento do TikTok → autorizar @neuralupdate1 (sandbox);
      2) `node tiktok-push.js 1` → terminal mostra "✓ no rascunho";
      3) abrir o app TikTok → rascunho recebido;
      4) `node tiktok-scheduler.js list` → agenda de posts.
      (Requisito deles: fluxo end-to-end, sandbox, UI visível. mp4/mov, até 50MB.)

## Texto pro campo "Explain how each product and scope works" (colar em inglês)

Neural Update is a private, single-creator content pipeline (desktop Node.js scripts, platform "Web")
used exclusively by our own science-education TikTok account (@neuralupdate1). It is not a public
SaaS; there are no third-party users.

- **Login Kit (user.info.basic):** used once to authenticate our own creator account via the
  standard OAuth flow and display the connected account's name/avatar in the console, so the
  operator can verify the correct account is connected before any upload.

- **Content Posting API — video.upload:** our pipeline renders original educational science videos
  (FFmpeg + our own narration and CC-BY licensed music). The script uploads the finished MP4 as an
  inbox draft, so the creator reviews it in the TikTok app, adds the caption, and decides to post.

- **Content Posting API — video.publish:** used by our scheduler to publish the reviewed, original
  videos to our own account at pre-planned times (4 posts/day editorial grid). Captions are written
  by the creator in advance. We fully comply with the UX guidelines: creator info is queried before
  posting, the creator selects privacy via configuration, and only content owned by us is posted.

All content is our own original work. The integration runs locally on the creator's computer and
serves a single account we own. No user data is stored beyond the OAuth token required to operate.

## Depois de aprovado
1. `.env`: `TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE`
2. Testar 1: `node tiktok-scheduler.js` (posta o vencido, público, com legenda)
3. Ligar as automações do Windows (tarefa a cada 30 min + catch-up no boot) — aí é 100% automático.
