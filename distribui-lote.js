'use strict';
/**
 * distribui-lote.js — leva o lote já pronto do YouTube pro INSTAGRAM e pro TIKTOK.
 *
 *   node distribui-lote.js lote-31jul-07ago.js lote-14h-ago.js
 *
 * O QUE FAZ, por plataforma:
 *
 * INSTAGRAM (agendado de verdade, via app Lovable/Supabase)
 *   1. sobe o mp4 pra CloudFront do Higgsfield (`higgsfield upload create`) —
 *      é GRÁTIS e devolve URL pública permanente. Isso resolve o bloqueio antigo:
 *      o bucket do Supabase tem RLS que exige sessão e a service_role key está
 *      vazia, então a chave anon dá 403. A edge `publish-post` só repassa
 *      `post.video_url` pro Graph API, e ele aceita qualquer URL pública.
 *   2. gera o INSERT em `posts` com `scheduled_for` = o MESMO publishAt do YouTube.
 *      ⚠️ Mesma data/hora é regra: as AULAS anunciam a data da próxima DENTRO do
 *      vídeo. Se o Insta postar em dia diferente, o vídeo se contradiz.
 *      O SQL sai em `insta-<lote>.sql` pra rodar no query_database.
 *
 * TIKTOK (rascunho, postagem manual)
 *   copia o mp4 pra `tiktok-legado/videos/` e escreve as legendas em
 *   `tiktok-legado/_captions.txt`. A auditoria do app ainda não saiu, então
 *   publicação automática segue bloqueada — o fluxo é o Marcelo abrir o app,
 *   colar a legenda e postar. Legenda de TikTok NÃO leva link externo.
 *
 * Estado em data/distribuicao.json — rodar de novo não repete upload.
 *
 * ⚠️ PASSAR TODOS OS SPECS DE UMA VEZ. O .sql e o _captions.txt são
 * SOBRESCRITOS a cada rodada: rodar spec por spec deixa só o último no arquivo.
 * Como as URLs ficam no estado, rodar com todos os specs é grátis e instantâneo.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EXPORTS = path.join(__dirname, 'exports');
const TIKTOK = 'D:\\Neural Update\\tiktok-legado\\videos';
const ESTADO = path.join(__dirname, 'data', 'distribuicao.json');

const WORKSPACE = 'a0000000-0000-0000-0000-000000000001';
const USER = '92a8a7ec-8f23-4c43-b762-62214573bf46';

// No Instagram existe link clicável na bio — diferente do Short do YouTube.
const CTA = {
  follow: '\n\n🔭 Segue o @neuralupdate pra não perder — ciência de verdade, sem enrolação.',
  isca: '\n\n📩 Comenta COSMOS que eu te mando o PDF grátis com 5 fenômenos do universo.',
  ebook: '\n\n📕 O ebook "O Lado Sombrio do Universo" — 21 fenômenos ilustrados, 7 dias de garantia. Link na bio.',
};

const estado = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, 'utf8')) : {};
const salva = () => {
  fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
  fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 2));
};

// sobe pra CloudFront e devolve a URL pública (grátis)
//
// ⚠️ Passar ARRAY de argumentos junto com shell:true não funciona no Windows:
// o shell só concatena, e o caminho "D:\Neural Update\..." quebra no espaço —
// todos os uploads falhavam. Com shell:true tem que ser UMA string, com o
// caminho entre aspas.
function sobeCloudFront(mp4) {
  const cmd = `higgsfield upload create "${mp4}" --json`;
  const r = spawnSync(cmd, { cwd: __dirname, encoding: 'utf8', shell: true, timeout: 900000 });
  const saida = (r.stdout || '') + (r.stderr || '');
  const m = saida.match(/https:\/\/[^\s"]+\.mp4/);
  if (!m) console.error('   ' + saida.trim().slice(-200));
  return m ? m[0] : null;
}

// Tipo de CTA. O prefixo do slug é só o FALLBACK: quem manda é o `_isca` do
// meta.json, porque a cadência 1-em-3 da isca gira entre os streams (em ago/2026
// ela caiu em viral `v##` e em notícia `nw-`, não nas aulas). Decidir só pelo
// prefixo mandava "Comenta COSMOS" pro vídeo errado e deixava o certo sem CTA.
function ctaDe(slug, meta) {
  if (meta && meta._isca) return 'isca';
  if (/^vsl/.test(slug)) return 'ebook';
  return 'follow';
}

// Instagram permite (e recompensa) contexto na legenda. O MP4 continua igual ao
// Short, mas a legenda passa a carregar os parágrafos úteis da descrição do
// YouTube sem URLs, hashtags ou CTA duplicado. Para um detalhe editorial que
// não exista na descrição, o spec/meta pode fornecer `instagramContext`.
function legendaInstagram(raw, contextoExtra) {
  const blocos = String(raw || '')
    .split(/\n\s*\n/)
    .map((bloco) => bloco
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/(?:^|\s)#[\wÀ-ÿ]+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim())
    .filter(Boolean)
    // O CTA do Instagram é definido abaixo, uma vez só e de forma mensurável.
    .filter((bloco) => !/mais ciência.*blog|link na descri[cç][aã]o/i.test(bloco));

  const hook = blocos.shift() || '';
  const detalhes = [
    ...blocos.filter((bloco) => !/^publicidade:/i.test(bloco)),
    contextoExtra,
  ].filter(Boolean).join('\n\n');

  return detalhes
    ? `${hook}\n\n🔎 O que não coube no vídeo\n${detalhes}`
    : hook;
}

const esc = s => String(s).replace(/'/g, "''");
const specs = process.argv.slice(2);
if (!specs.length) { console.error('uso: node distribui-lote.js <spec1.js> [spec2.js]'); process.exit(1); }

const linhasSql = [];
const legendasTk = [];
let subidos = 0, copiados = 0;

for (const arq of specs) {
  const spec = require(path.join(__dirname, arq));
  for (const v of spec) {
    const dir = path.join(EXPORTS, v.slug);
    const mp4 = path.join(dir, v.slug + '.mp4');
    if (!fs.existsSync(mp4)) { console.log(`· ${v.slug}: sem mp4, pulando`); continue; }

    const metaPath = path.join(dir, 'meta.json');
    const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
    const quando = meta.publishAt || v.quando;

    // ── Instagram: URL pública
    estado[v.slug] = estado[v.slug] || {};
    if (!estado[v.slug].url) {
      process.stdout.write(`↑ ${v.slug} `);
      const url = sobeCloudFront(mp4);
      if (!url) { console.log('FALHOU o upload'); continue; }
      estado[v.slug].url = url;
      salva();
      subidos++;
      console.log('ok');
    }

    // Legenda: gancho + contexto factual reaproveitado do material de origem.
    // O mesmo MP4 vai às plataformas, mas não a mesma experiência editorial.
    const hook = legendaInstagram(
      meta.description || v.desc || '',
      meta.instagramContext || v.instagramContext || '',
    );
    const cta = ctaDe(v.slug, meta);
    // dedup: as tags do meta já costumam trazer "neuralupdate", e o append cego
    // gerava "#neuralupdate #neuralupdate" em toda legenda.
    const tagsIg = [...new Set(
      (v.tags || []).slice(0, 6).map(t => '#' + t.replace(/[^a-z0-9à-ú]/gi, '')).concat('#neuralupdate')
    )].join(' ');
    const caption = `${hook}${CTA[cta]}\n\n${tagsIg}`;

    const overlay = JSON.stringify({
      import_kind: 'youtube',
      import_source: v.slug + '.mp4',
      imported_at: new Date().toISOString(),
      origem: `${arq} — mesmo horário do YouTube (as aulas anunciam a data no vídeo)`,
    });
    const tipo = /^vsl/.test(v.slug) ? 'marketing' : 'conhecimento';

    linhasSql.push(`  ('${esc(caption)}', '${estado[v.slug].url}', 'reels', 'scheduled', ` +
      `'${quando}'::timestamptz, ARRAY['instagram'], '${tipo}', '${esc(overlay)}'::jsonb, ` +
      `'${WORKSPACE}'::uuid, '${USER}'::uuid)`);

    // ── TikTok: copia o arquivo e guarda a legenda (sem link externo)
    if (fs.existsSync(TIKTOK)) {
      const destino = path.join(TIKTOK, v.slug + '.mp4');
      if (!fs.existsSync(destino)) { fs.copyFileSync(mp4, destino); copiados++; }
      // o "Comenta COSMOS" só entra no vídeo de isca (1 a cada 3). Antes ia em
      // TODOS, o que queimava o gatilho e tirava a força dele quando importava.
      const ctaTk = cta === 'isca'
        ? 'Comenta COSMOS que eu te mando o PDF grátis dos 5 fenômenos do universo 📩\n\n'
        : '';
      legendasTk.push(`═══ ${v.slug}  (YouTube: ${quando})\n${hook}\n\n` + ctaTk +
        `${tagsIg} #neuralupdate #astronomia #espaco\n`);
    }
  }
}

// SQL do Instagram
if (linhasSql.length) {
  const sql = `-- Instagram: ${linhasSql.length} Reels agendados no MESMO horário do YouTube.\n` +
    `-- Rodar no query_database do app do Instagram (Lovable).\n` +
    `INSERT INTO posts (caption, video_url, media_type, status, scheduled_for, platforms, post_type, overlay_metadata, workspace_id, user_id)\nVALUES\n` +
    linhasSql.join(',\n') +
    `\nRETURNING id, left(caption,45) AS legenda, to_char(scheduled_for AT TIME ZONE 'America/Sao_Paulo','DD/MM HH24:MI') AS quando_brt;\n`;
  const out = path.join(__dirname, 'insta-lote-ago.sql');
  fs.writeFileSync(out, sql, 'utf8');
  console.log(`\n✓ SQL do Instagram: ${out}  (${linhasSql.length} posts)`);
}

// legendas do TikTok
if (legendasTk.length) {
  const out = path.join(path.dirname(TIKTOK), '_captions-ago.txt');
  fs.writeFileSync(out, legendasTk.join('\n'), 'utf8');
  console.log(`✓ Legendas do TikTok: ${out}  (${legendasTk.length})`);
}

console.log(`\nuploads novos pra CloudFront: ${subidos} · mp4 copiados pro TikTok: ${copiados}`);
