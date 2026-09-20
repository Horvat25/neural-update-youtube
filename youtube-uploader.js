'use strict';
/**
 * youtube-uploader.js — publica o Short via YouTube Data API v3 (upload resumável).
 * Sem navegador. Usa OAuth2 (refresh_token) do youtube-auth.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google, getAuthorizedClient, isConnected } = require('./youtube-auth');

const BLOG_URL = process.env.BLOG_URL || 'https://neural-update.com.br';

// Descrição: garante o link do blog nas PRIMEIRAS linhas (clicável) + hashtags no fim.
function buildDescription({ description, hashtags, blogUrl = BLOG_URL, includeBlog = true, blogLabel = 'Análise completa' }) {
  let desc = (description || '').trim();
  if (includeBlog && blogUrl && !desc.includes(blogUrl)) desc = `${blogLabel}: ${blogUrl}\n\n${desc}`;
  const tags = (hashtags || []).filter(h => typeof h === 'string' && h.startsWith('#'));
  const lower = desc.toLowerCase();
  const extra = tags.filter(h => !lower.includes(h.toLowerCase()));
  if (extra.length) desc += `\n\n${extra.slice(0, 15).join(' ')}`;
  return desc.slice(0, 4900); // limite do YouTube é 5000
}

// Título: garante #Shorts (ajuda a detecção como Short) sem estourar 100 chars.
function buildTitle(title, hashtags) {
  let t = (title || 'Neural Update').trim();
  const hasShorts = /#shorts/i.test(t) || (hashtags || []).some(h => /#shorts/i.test(h));
  if (hasShorts && !/#shorts/i.test(t) && t.length + 8 <= 100) t += ' #Shorts';
  return t.slice(0, 100);
}

function recordVideoIdInMeta({ videoPath, metaPath, videoId, url, publishAt } = {}) {
  const alvo = metaPath || (videoPath ? path.join(path.dirname(videoPath), 'meta.json') : null);
  if (!alvo || !fs.existsSync(alvo)) return { persisted: false, metaPath: alvo, reason: 'meta_not_found' };
  const meta = JSON.parse(fs.readFileSync(alvo, 'utf8'));
  meta._youtube = {
    ...(meta._youtube || {}),
    videoId,
    url: url || `https://youtube.com/watch?v=${videoId}`,
    publishAt: publishAt || meta.publishAt || null,
    agente: 'codex',
    gerado_em: new Date().toISOString(),
  };
  fs.writeFileSync(alvo, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  return { persisted: true, metaPath: alvo };
}

async function uploadToYouTube({ videoPath, metaPath, title, description, tags, hashtags, privacyStatus, publishAt, notifySubscribers } = {}) {
  if (!videoPath || !fs.existsSync(videoPath)) throw new Error('Vídeo não encontrado: ' + videoPath);

  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });
  // Para AGENDAR, o YouTube exige privacyStatus 'private' + publishAt (ISO 8601). Vira público sozinho na hora.
  const privacy = publishAt ? 'private' : (privacyStatus || process.env.YT_PRIVACY || 'unlisted');

  const requestBody = {
    snippet: {
      title: buildTitle(title, hashtags),
      description: buildDescription({
        description,
        hashtags,
        blogUrl: arguments[0].blogUrl,
        includeBlog: arguments[0].includeBlog,
        blogLabel: arguments[0].blogLabel,
      }),
      tags: (tags || []).filter(Boolean).slice(0, 30),
      categoryId: process.env.YT_CATEGORY_ID || '28', // 28 = Ciência & Tecnologia
      defaultLanguage: arguments[0].defaultLanguage || 'pt-BR',
      defaultAudioLanguage: arguments[0].defaultAudioLanguage || arguments[0].defaultLanguage || 'pt-BR',
    },
    status: {
      privacyStatus: privacy,        // 'public' | 'unlisted' | 'private'
      selfDeclaredMadeForKids: false,
      // 11/09/2026: declaração "conteúdo alterado ou sintético". Nossas imagens são cenas
      // realistas geradas por IA e a narração é sintética; a regra de conteúdo inautêntico do
      // YouTube (esclarecida em jul/2026) pune quem NÃO declara (advertência → 90 dias sem
      // monetização → saída do YPP). A API nunca tinha recebido esse campo.
      containsSyntheticMedia: true,
      ...(publishAt ? { publishAt } : {}), // agendamento
    },
    // 11/09/2026: vídeo com CTA de afiliado (#publi na descrição — projetor Shopee, Kindle)
    // declara "Promoção paga: Sim". Ganhamos comissão; o YouTube trata como promoção e mostra
    // um aviso discreto. Quem quiser forçar passa `pago: true/false`.
    ...((arguments[0].pago ?? /#publi/i.test(description || ''))
      ? { paidProductPlacementDetails: { hasPaidProductPlacement: true } } : {}),
  };

  // ⚠️ NOTIFICAÇÃO — 19/08/2026. O YouTube manda no máximo **3 notificações por canal a
  // cada 24h**, e isso conta upload, live e estreia juntos. A grade são 3 Shorts/dia, ou
  // seja: os Shorts consumiam as 3 e qualquer live entrava como 4ª — sem avisar ninguém,
  // sem erro em lugar nenhum. Ninguém decidiu isso; era só o padrão `true` da API rodando
  // sozinho, porque este parâmetro nunca foi passado.
  //
  // MEDIDO em 19/08/2026 (28 dias, YouTube Analytics por origem de tráfego): notificação
  // trouxe 71 views (0,2%) e 36 minutos, contra 39.930 views (94,3%) vindos do feed de
  // Shorts. Ou seja ~2,5 views/dia.
  //
  // DECISÃO DO MARCELO (19/08): **manter a notificação ligada nos Shorts assim mesmo**,
  // mesmo sabendo que isso consome as 3 vagas do dia e que uma live pode ficar sem aviso.
  // Não reabrir sem motivo novo.
  //
  // O parâmetro fica aqui exposto porque ele NÃO existe no `videos.update` — só dá pra
  // definir no insert. Quem precisar de um upload silencioso passa `notifySubscribers: false`.
  const notificar = notifySubscribers !== false;

  try {
    const res = await youtube.videos.insert(
      { part: ['snippet', 'status', ...(requestBody.paidProductPlacementDetails ? ['paidProductPlacementDetails'] : [])],
        notifySubscribers: notificar, requestBody, media: { body: fs.createReadStream(videoPath) } },
      { maxContentLength: Infinity, maxBodyLength: Infinity } // upload resumável de arquivo grande
    );
    const id = res.data.id;
    const url = `https://youtube.com/shorts/${id}`;
    let metaRegistro;
    try {
      // Falha ao gravar o sidecar nunca pode fazer o chamador repetir um upload que ja ocorreu.
      metaRegistro = recordVideoIdInMeta({ videoPath, metaPath, videoId: id, url, publishAt });
      if (metaRegistro.persisted) console.log(`[youtube]   ↳ videoId gravado em ${metaRegistro.metaPath}`);
      else console.warn(`[youtube]   ↳ meta.json nao encontrado; videoId ficou somente no estado do chamador`);
    } catch (e) {
      metaRegistro = { persisted: false, metaPath, reason: e.message };
      console.warn(`[youtube]   ↳ upload concluido, mas o meta.json nao foi atualizado: ${e.message}`);
    }
    console.log(`[youtube] ✓ publicado (${privacy}${notificar ? ', COM notificação' : ', sem notificação'}): ${url}`);
    return { id, videoId: id, url, privacyStatus: privacy, notifySubscribers: notificar, metaRegistro };
  } catch (e) {
    const reason =
      e?.errors?.[0]?.reason ||
      e?.response?.data?.error?.errors?.[0]?.reason ||
      e?.response?.data?.error?.message;
    if (reason === 'quotaExceeded' || reason === 'uploadLimitExceeded') {
      throw new Error('[youtube] Quota estourada: videos.insert custa ~1600 unidades; limite padrão 10.000/dia (~6 uploads). Tente depois.');
    }
    if (/invalid_grant|No refresh token|invalid_request/i.test(reason || e.message || '')) {
      throw new Error('[youtube] Token inválido/expirado. Rode de novo: node youtube-login.js');
    }
    throw new Error('[youtube] Falha no upload: ' + (reason || e.message));
  }
}

module.exports = { uploadToYouTube, isConnected, buildDescription, buildTitle, recordVideoIdInMeta };
