'use strict';
/**
 * gen-insta-manifest.js — gera o tiktok-import-manifest.json que o ImportReelDialog
 * (instagram) lê pra importar os Reels com a legenda/hashtags/data certas.
 *
 * - Chave = nome do arquivo NA PASTA reels-insta.
 *   . vídeos com isca (10) → "<slug>-insta.mp4" (card COMENTA COSMOS).
 *   . demais (29)          → "<slug>.mp4".
 * - caption: hook científico (1º parágrafo da description, sem os links do YouTube)
 *   + CTA. Isca → "Comenta COSMOS" (ManyChat manda o PDF na DM). Demais → follow.
 * - scheduled_for = publishAt do YouTube (mesmo horário nas duas plataformas).
 * - orientation: "vertical" (todos 9:16).
 *
 * Escreve em D:\Neural Update\instagram\public\tiktok-import-manifest.json
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const BASE = path.join(ROOT, 'exports');
const OUT = 'D:\\Neural Update\\instagram\\public\\tiktok-import-manifest.json';

// Os 39 atualizados (mesma lista que ficou na pasta reels-insta).
const SLUGS = [
  'n1-t-zero','n2-inflacao','n3-um-segundo','n4-tres-minutos','n5-primeira-luz','n6-primeira-estrela',
  'n7-galaxias','n8-nasce-o-sol','n9-agora','n10-oceanos','n11-andromeda','n12-morte-do-sol',
  'n13-ultima-estrela','n14-ultimo-buraco-negro','n15-morte-termica',
  'aula-materia-escura','aula-energia-escura','aula-transito','pl4-zona-habitavel',
  'news1-webb-galaxia','news2-k2-18b','news3-buraco-antigo','news4-interestelar','news5-agua-espaco',
  'news6-euclid','news7-bennu','news8-frb','news9-planeta-diamante',
  'viral1-zoo','viral2-kilonova','viral3-planeta-nove','viral4-laniakea','viral5-pale-blue-dot',
  'viral6-sempre-caindo','viral7-quasar',
  'vsl-ebook','vsl2-gato','vsl3-wow','vsl4-chuva-vidro',
];

const CTA_ISCA = '\n\n💬 Comenta "COSMOS" aqui embaixo que eu te mando na sua DM o PDF GRÁTIS com os 5 fenômenos mais assustadores do universo. 🎁';
const CTA_EBOOK = '\n\n🌌 O ebook completo "O Lado Sombrio do Universo" — 21 fenômenos ilustrados — tá no link do perfil. Por menos que um lanche.';
const CTA_FOLLOW = '\n\n🔭 Segue o perfil pra acompanhar a série "O Universo em Números" — a história do cosmos em ordem, do Big Bang ao infinito.';

const IG_EXTRA = ['#reels','#astronomia','#espaço','#cosmos','#curiosidades'];

// O Instagram começou atrasado (dia 1 da saga já saiu hoje no YouTube). Pra nada
// cair no passado e a série sair INTEIRA e em ordem, o IG roda com um offset de
// dias sobre o publishAt do YouTube (mesmos horários, só deslocado). Default +1 dia.
const OFFSET_DAYS = parseInt(process.env.INSTA_OFFSET_DAYS || '1', 10);
function shift(iso) {
  if (!iso) return undefined;
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + OFFSET_DAYS);
  return d.toISOString();
}

// Pega só o 1º parágrafo (o hook científico) — antes de qualquer link/CTA do YouTube.
function hookFrom(desc) {
  const first = String(desc || '').split('\n\n')[0].trim();
  return first.replace(/\s*https?:\/\/\S+/g, '').trim();
}

function isEbook(slug) { return /^vsl/.test(slug); }

const manifest = {};
let n = 0, miss = [];
for (const slug of SLUGS) {
  const metaPath = path.join(BASE, slug, 'meta.json');
  if (!fs.existsSync(metaPath)) { miss.push(slug); continue; }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const isca = !!meta._isca;
  const ebook = isEbook(slug);
  // Só os 10 com isca têm versão -insta (card COMENTA COSMOS). VSLs do ebook
  // sobem como estão (CTA de bio na narração — funil PAGO, não o COSMOS grátis).
  const file = isca ? `${slug}-insta.mp4` : `${slug}.mp4`;

  const hook = hookFrom(meta.description);
  const cta = ebook ? CTA_EBOOK : (isca ? CTA_ISCA : CTA_FOLLOW);
  // hashtags do YouTube + extras de IG (sem duplicar).
  const tags = [...new Set([...(meta.hashtags || []), ...IG_EXTRA])];
  const caption = `${hook}${cta}\n\n${tags.join(' ')}`;

  manifest[file] = {
    caption,
    hashtags: tags,
    orientation: 'vertical',
    format: 'conhecimento',
    scheduled_for: shift(meta.publishAt),
  };
  n++;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`Manifesto: ${n} vídeos → ${OUT}`);
if (miss.length) console.log(`SEM meta.json (pulados): ${miss.join(', ')}`);
// também deixa uma cópia local pra conferência
fs.writeFileSync(path.join(ROOT, 'exports', '_tiktok-import-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
