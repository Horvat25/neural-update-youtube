'use strict';
/**
 * lote-08-13ago.js — spec do lote de 08 a 13/ago no formato que o
 * `distribui-lote.js` consome (ele só precisa de { slug, tags }; o resto —
 * publishAt, descrição, _isca — ele lê do meta.json de cada pasta).
 *
 * Os specs de origem estão em `lotes/*.json` (formato novo, usado pelo
 * `lote-spec.js`). Este arquivo é o adaptador entre os dois.
 *
 *   node distribui-lote.js lote-08-13ago.js
 */
const fs = require('fs');
const path = require('path');

const LOTES = ['09-ago.json', '10-ago.json', '11-ago.json', '12-13-ago.json'];

// os 3 do dia 08 são anteriores ao formato de lote e já foram distribuídos à mão
const DIA_08 = [
  { slug: 'nw-dois-crepusculos', tags: ['exoplaneta', 'jameswebb', 'astronomia', 'ciencia', 'espaco', 'cosmos'] },
  { slug: 'vsl14-emaranhamento', tags: ['emaranhamento', 'fisicaquantica', 'einstein', 'ciencia', 'universo', 'quantica'] },
  { slug: 'v34-ultimo-suspiro', tags: ['atomos', 'respiracao', 'ciencia', 'curiosidades', 'universo', 'historia'] },
];

const doLote = LOTES.flatMap(f => {
  const p = path.join(__dirname, 'lotes', f);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8')).map(it => ({
    slug: it.slug,
    // hashtags do meta já vêm com "#"; aqui o distribui-lote espera tag crua
    tags: (it.hashtags || []).map(h => h.replace(/^#/, '')),
  }));
});

module.exports = [...DIA_08, ...doLote];
