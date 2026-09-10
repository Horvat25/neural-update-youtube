'use strict';
/**
 * insta-refaz-fila.js — troca a mídia e a legenda dos itens do lote na fila do
 * Instagram, e religa eles.
 *
 * Contexto: os 21 Shorts foram REFEITOS (playbook), então as URLs de CDN da fila
 * apontavam pros vídeos velhos. Aqui cada um sobe de novo pro CloudFront e a
 * entrada existente é atualizada no lugar — sem duplicar, sem perder a data.
 *
 * A LEGENDA também muda (pedido do Marcelo: "a legenda tá fraca"). Antes era a
 * descrição do vídeo e mais nada, o que não dá motivo pra ninguém SALVAR — e
 * salvamento é o sinal mais forte que o Instagram lê. Agora leva:
 *   gancho · o que o vídeo conta · UMA informação que o vídeo NÃO conta · a FONTE
 *   (instituição/publicação) · CTA quando for vídeo-isca · hashtags.
 *
 * ⚠️ Roda sempre sobre um worktree do origin/main — a fila remota é a autoridade,
 * o workflow escreve o estado de volta a cada rodada.
 *
 *   node insta-refaz-fila.js <caminho-da-fila.json> [--seco]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FILA = process.argv[2];
const SECO = process.argv.includes('--seco');
if (!FILA) { console.error('uso: node insta-refaz-fila.js <fila.json> [--seco]'); process.exit(1); }

// 16/08/2026 — o "segue" SAIU e entrou o SEND. Motivo medido, não gosto:
// no Instagram de 2026 o "send" (mandar no direct pro amigo) pesa 3-5x mais que
// curtida e é o sinal MAIS FORTE pra alcançar quem ainda não segue. Some-se a isso
// que espanto é a emoção que mais faz compartilhar (Berger/Wharton) — e espanto é
// exatamente o que este canal produz. Ver estudio/ESTUDO-VIRALIZACAO-16AGO.md.
//
// ⚠️ São só DOIS pedidos por legenda, de propósito. Cada opção a mais dilui: foi
// o que matou a bio de 9 links em julho. Send (baixo atrito, alto alcance) + COSMOS
// (a conversão). O "segue" continua no vídeo, pelo bordão.
const SEND_IG = '📤 Manda pro amigo que acha que sabe tudo sobre o universo.';
const ISCA_IG = '📩 Comenta COSMOS que eu te mando o PDF grátis com 5 fenômenos do universo.';

function sobeCloudFront(mp4) {
  const r = spawnSync(`higgsfield upload create "${mp4}" --json`,
    { cwd: __dirname, encoding: 'utf8', shell: true, timeout: 900000 });
  const m = ((r.stdout || '') + (r.stderr || '')).match(/https:\/\/[^\s"]+\.mp4/);
  return m ? m[0] : null;
}

function legenda(it) {
  return [
    it.desc1,
    it.extra ? `👇 O que não coube no vídeo\n${it.extra}` : null,
    it.fonte ? `🔬 Fonte: ${it.fonte}` : null,
    // o "send" vai em TODO post; o "comenta COSMOS" só nos de isca
    it.isca ? `${SEND_IG}\n${ISCA_IG}` : SEND_IG,
    (it.hashtags || []).join(' '),
  ].filter(Boolean).join('\n\n');
}

const fila = JSON.parse(fs.readFileSync(FILA, 'utf8'));
const itens = ['lotes/14-16-ago.json', 'lotes/17-20-ago.json']
  .flatMap(f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')));
const porSlug = Object.fromEntries(itens.map(i => [i.slug, i]));

let trocados = 0;
for (const item of fila) {
  const spec = porSlug[item.slug];
  if (!spec) continue;
  if (item.status === 'publicado') { console.log(`· ${item.slug} já publicado — não toco`); continue; }

  // 16/08: preferir a versão com o CTA do Kindle quando ela existir. Os vídeos da
  // cadência "1 sim 1 não" têm um `<slug>-kindle.mp4` ao lado do original; mandar o
  // original pro Insta publicaria a versão SEM oferta e ninguém notaria a falha.
  const mp4Kindle = path.join(__dirname, 'exports', spec.slug, `${spec.slug}-kindle.mp4`);
  const mp4 = fs.existsSync(mp4Kindle)
    ? mp4Kindle
    : path.join(__dirname, 'exports', spec.slug, `${spec.slug}.mp4`);
  if (!fs.existsSync(mp4)) { console.error(`✗ ${spec.slug} — sem mp4`); continue; }
  if (mp4 === mp4Kindle) console.log(`  ↳ ${spec.slug}: usando a versão com CTA do Kindle`);

  if (SECO) { console.log(`[seco] ${spec.slug} → ${spec.publishAt}`); trocados++; continue; }

  process.stdout.write(`▲ ${spec.slug} … `);
  const url = sobeCloudFront(mp4);
  if (!url) { console.error('falhou o upload'); continue; }

  item.midia = url;
  item.legenda = legenda(spec);
  item.quando = spec.publishAt;
  item.status = 'agendado';
  delete item.motivo;
  trocados++;
  console.log('ok');
}

fila.sort((a, b) => new Date(a.quando) - new Date(b.quando));
if (!SECO) fs.writeFileSync(FILA, JSON.stringify(fila, null, 2) + '\n', 'utf8');
console.log(`\n${trocados} item(ns) atualizado(s) · fila com ${fila.length}`);
