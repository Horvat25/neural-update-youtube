'use strict';
/**
 * gen-tiktok-captions.js — legendas TIKTOK da grade (formato TikTok, não YouTube).
 * Regras (LICOES-APRENDIDAS do TikTok): NÃO empurrar link externo (mata alcance);
 * CTA on-platform (comenta/salva/segue). Isca → "Comenta COSMOS" (funciona nativo).
 * Saída: tiktok-lote/_captions.json (máquina) + tiktok-lote/_captions.txt (copiar/colar).
 * Ordem = mesma da grade (publishAt). Legenda ≤ 2200 chars (limite TikTok).
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const BASE = path.join(ROOT, 'exports');
const OUT = path.join(ROOT, 'tiktok-lote');

// mesma lista/ordem do build-tiktok-lote
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

const CTA_ISCA = '\n\n💬 Comenta COSMOS que eu te mando na DM o PDF grátis com os 5 fenômenos mais assustadores do universo. 🎁';
const CTA_EBOOK = '\n\n🌌 Salva esse e me segue — tem muito mais sobre o lado sombrio do universo.';
const CTA_FOLLOW = '\n\n🔭 Segue e salva pra não perder a série O Universo em Números — do Big Bang ao infinito.';

// hashtags nativas do TikTok BR (descoberta > alcance)
const TT_TAGS = ['#ciencia','#espaço','#universo','#astronomia','#curiosidades','#aprendanotiktok','#nasa','#cosmos'];

function hookFrom(desc) {
  const first = String(desc || '').split('\n\n')[0].trim();
  return first.replace(/\s*https?:\/\/\S+/g, '').trim();
}
const isEbook = s => /^vsl/.test(s);

const manifest = {};
const lines = ['===== LEGENDAS TIKTOK (copiar/colar na ordem) =====\n'];
let n = 0;
for (const slug of SLUGS) {
  const mp = path.join(BASE, slug, 'meta.json');
  if (!fs.existsSync(mp)) continue;
  const meta = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const isca = !!meta._isca;
  const cta = isEbook(slug) ? CTA_EBOOK : (isca ? CTA_ISCA : CTA_FOLLOW);
  const tags = [...new Set([...(meta.hashtags || []).map(h => h.toLowerCase()), ...TT_TAGS])].slice(0, 12);
  const caption = `${hookFrom(meta.description)}${cta}\n\n${tags.join(' ')}`.slice(0, 2190);
  const file = `${slug}.mp4`;
  manifest[file] = { caption, hashtags: tags, isca, publishAt: meta.publishAt };
  n++;
  lines.push(`\n#${String(n).padStart(2, '0')} — ${file}${isca ? '  [COMENTA COSMOS]' : ''}\n${'-'.repeat(50)}\n${caption}\n`);
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, '_captions.json'), JSON.stringify(manifest, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT, '_captions.txt'), lines.join('\n'), 'utf8');
console.log(`Legendas TikTok: ${n} → tiktok-lote/_captions.json + _captions.txt`);
