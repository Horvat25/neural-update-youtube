'use strict';
/**
 * Creates draft English metadata files for the watermarked Higgsfield batch.
 * The files are intentionally conservative: review/edit before upload.
 *
 * Usage:
 *   node prepare-english-metadata.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MANIFEST = path.join(ROOT, 'exports', 'english-ready', 'manifest.json');
const META_DIR = path.join(ROOT, 'exports', 'english-ready', 'metadata');

const TITLE_MAP = [
  [/buraco|black-hole|bh/i, 'What Happens If You Fall Into a Black Hole? #Shorts'],
  [/fermi/i, 'The Fermi Paradox: Why Is Space So Silent? #Shorts'],
  [/soul/i, 'How Long Would You Survive in Space? #Shorts'],
  [/giants/i, 'Giant Fighting Robots Are Closer Than You Think #Shorts'],
  [/diamond|diamante/i, 'The Planet Where It Rains Diamonds #Shorts'],
  [/dyson/i, 'The Megastructure That Could Power a Civilization #Shorts'],
  [/portais|portal/i, 'Could Portals Actually Exist? #Shorts'],
  [/quantica|q1|q2|q3|q4|q5|q6/i, 'Quantum Physics Is Stranger Than Fiction #Shorts'],
  [/einstein/i, 'Einstein Changed Time Forever #Shorts'],
  [/tesla/i, 'Tesla Saw the Future Before Everyone Else #Shorts'],
  [/newton/i, 'Newton Discovered the Rules of Reality #Shorts'],
  [/hawking/i, 'Stephen Hawking Explained the Edge of the Universe #Shorts'],
  [/elon/i, 'Elon Musk Is Betting Everything on the Future #Shorts'],
  [/matusalem/i, 'The Star Older Than the Universe? #Shorts'],
  [/ton618/i, 'The Largest Black Hole Ever Found #Shorts'],
  [/neutrons/i, 'Neutron Stars Are Almost Impossible to Imagine #Shorts'],
  [/bb-short|buraco-branco/i, 'White Holes: The Opposite of Black Holes? #Shorts'],
];

function titleFor(item) {
  const key = `${item.sourceRelative} ${path.basename(item.watermarked)}`;
  const hit = TITLE_MAP.find(([re]) => re.test(key));
  return hit ? hit[1] : 'This Space Fact Sounds Impossible #Shorts';
}

function baseName(file) {
  return path.basename(file, '.mp4').replace(/-wm$/i, '');
}

function tagsFor(title) {
  const t = title.toLowerCase();
  const tags = ['science', 'space', 'technology', 'neural update', 'shorts'];
  if (t.includes('quantum')) tags.push('quantum physics', 'physics');
  if (t.includes('black hole')) tags.push('black hole', 'astronomy');
  if (t.includes('robot')) tags.push('robots', 'ai', 'future tech');
  if (t.includes('tesla')) tags.push('nikola tesla', 'inventions');
  if (t.includes('einstein')) tags.push('einstein', 'relativity');
  return [...new Set(tags)];
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
fs.mkdirSync(META_DIR, { recursive: true });

const created = [];
for (const item of manifest) {
  const title = titleFor(item);
  const name = `${baseName(item.watermarked)}.en.meta.json`;
  const out = path.join(META_DIR, name);
  const meta = {
    title,
    description:
      'A cinematic science short from Neural Update.\n\n' +
      'More AI, science and future-tech stories coming soon.\n\n' +
      '#Shorts #Science #Space #Technology #NeuralUpdate',
    tags: tagsFor(title),
    hashtags: ['#Shorts', '#Science', '#Space', '#Technology', '#NeuralUpdate'],
    privacyStatus: 'private',
    sourceVideo: item.source,
    watermarkedVideo: item.watermarked,
    needsEnglishVoiceover: true,
    channel: 'english'
  };
  fs.writeFileSync(out, JSON.stringify(meta, null, 2));
  created.push(out);
}

console.log(`[english-meta] ${created.length} metadata file(s) ready in ${META_DIR}`);
