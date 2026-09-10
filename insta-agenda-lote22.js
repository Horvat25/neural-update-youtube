'use strict';
/**
 * insta-agenda-lote22.js — imprime o SQL que agenda os 7 vídeos novos (15-16/jul)
 * na fila do Instagram, com a MESMA data/hora do YouTube.
 *
 * POR QUE a mesma data/hora (pedido explícito do usuário 16/jul):
 *   as AULAS anunciam a data da próxima DENTRO do vídeo —
 *     pl5 (ondas gravitacionais) diz "espectroscopia, QUARTA, DIA 22"
 *     pl6 (espectroscopia)       diz "redshift, SEXTA, DIA 24"
 *   Se o Insta postar em data diferente do YouTube, o vídeo se contradiz.
 *   Por isso o scheduled_for sai do publishAt do meta.json — nunca digitado à mão.
 *
 * POR QUE video_url no nosso domínio (e não no Storage):
 *   o bucket post-videos tem RLS que exige sessão autenticada (a chave anon dá
 *   403) e a SUPABASE_SERVICE_ROLE_KEY está vazia. Como a edge `publish-post`
 *   só repassa `post.video_url` pro Graph API do Instagram (aceita qualquer URL
 *   pública), hospedar em neural-update.com.br/reels/ resolve sem depender do
 *   botão "Importar Reels" do navegador.
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://neural-update.com.br/reels';
const WORKSPACE = 'a0000000-0000-0000-0000-000000000001';
const USER = '92a8a7ec-8f23-4c43-b762-62214573bf46';

// CTA por tipo. Instagram TEM link clicável na bio (diferente do Short do YouTube),
// então "link na bio" funciona aqui. O COMENTA COSMOS segue nos vídeos de isca —
// o usuário responde as DMs na mão por enquanto (ManyChat foi abandonado).
const CTA = {
  follow: '\n\n🔭 Segue o @neuralupdate pra não perder a série — ciência de verdade, sem enrolação.',
  isca: '\n\n📩 Comenta COSMOS que eu te mando o PDF grátis com 5 fenômenos do universo.',
  ebook: '\n\n📕 O ebook "O Lado Sombrio do Universo" — 21 fenômenos ilustrados, menos que um lanche, 7 dias de garantia. Link na bio.',
};

const POSTS = [
  { slug: 'vsl5-buraco-errante', tipo: 'marketing', cta: 'ebook', tags: '#buraconegro #universo #espaço #ciência #astronomia #neuralupdate #cosmos #curiosidades' },
  { slug: 'v20-tita-voar', tipo: 'conhecimento', cta: 'follow', tags: '#titã #saturno #espaço #ciência #universo #astronomia #neuralupdate #curiosidades' },
  { slug: 'pl5-ondas-gravitacionais', tipo: 'conhecimento', cta: 'follow', tags: '#ondasgravitacionais #einstein #ligo #espaço #ciência #astronomia #neuralupdate' },
  { slug: 'v21-venus-dia-ano', tipo: 'conhecimento', cta: 'follow', tags: '#vênus #planeta #espaço #ciência #universo #astronomia #neuralupdate #curiosidades' },
  { slug: 'vsl6-magnetar', tipo: 'marketing', cta: 'ebook', tags: '#magnetar #estreladenêutrons #universo #espaço #ciência #astronomia #neuralupdate' },
  { slug: 'v22-saturno-aneis', tipo: 'conhecimento', cta: 'isca', tags: '#saturno #anéis #nasa #espaço #ciência #universo #astronomia #neuralupdate' },
  { slug: 'pl6-espectroscopia', tipo: 'conhecimento', cta: 'follow', tags: '#espectroscopia #estrelas #luz #espaço #ciência #astronomia #neuralupdate' },
];

const esc = (s) => String(s).replace(/'/g, "''");

const linhas = POSTS.map((p) => {
  const meta = JSON.parse(fs.readFileSync(path.join(__dirname, 'exports', p.slug, 'meta.json'), 'utf8'));
  // hook = 1º parágrafo da descrição do YouTube (sem os links/CTA de lá)
  const hook = (meta.description || '').split('\n\n')[0].trim();
  const caption = `${hook}${CTA[p.cta]}\n\n${p.tags}`;
  const meta_json = JSON.stringify({
    import_kind: 'tiktok',
    import_source: `${p.slug}.mp4`,
    imported_at: new Date().toISOString(),
    origem: 'lote-22 (mesmo horário do YouTube — as aulas anunciam a data no vídeo)',
  });
  return `  ('${esc(caption)}', '${BASE_URL}/${p.slug}.mp4', 'reels', 'scheduled', '${meta.publishAt}'::timestamptz, ARRAY['instagram'], '${p.tipo}', '${esc(meta_json)}'::jsonb, '${WORKSPACE}'::uuid, '${USER}'::uuid)`;
});

const sql = `INSERT INTO posts (caption, video_url, media_type, status, scheduled_for, platforms, post_type, overlay_metadata, workspace_id, user_id)
VALUES
${linhas.join(',\n')}
RETURNING id, left(caption,40) AS legenda, to_char(scheduled_for AT TIME ZONE 'America/Sao_Paulo','DD/MM HH24:MI') AS quando_brt;`;

fs.writeFileSync(path.join(__dirname, 'insta-lote22.sql'), sql, 'utf8');
console.log(sql);
