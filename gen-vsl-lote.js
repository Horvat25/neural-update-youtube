'use strict';
/**
 * gen-vsl-lote.js — cria as 3 VSLs de marketing do ebook (ângulos diferentes, nunca repetidos).
 * Dias ímpares 14h: 13, 15, 17/07. CTA na narração: link na bio + fixado. Voz masc., clima sombrio.
 */
const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, 'exports');
const BLOG = 'Mais ciência no nosso blog Neural Update 👉 https://neural-update.com.br';
const MUSIC = 'Music: Kevin MacLeod (incompetech.com) — CC BY 4.0';

const ITEMS = [
{
  slug: 'vsl2-gato', voice: 'male', track: 'quantum-investigations.mp3', topic: 'gato schrodinger vivo e morto ebook',
  publishAt: '2026-07-13T17:00:00.000Z',
  hook: 'O GATO QUE ESTÁ\nVIVO E MORTO\nAO MESMO TEMPO',
  roteiro: `Tem um experimento na física em que um gato fica vivo e morto ao mesmo tempo — e não é filosofia de boteco, é ciência séria, comprovada em laboratório. Antes de você olhar, a natureza mantém as duas realidades juntas. Esse é só UM dos vinte e um fenômenos que eu reuni no ebook O Lado Sombrio do Universo. Tem também o planeta onde chove vidro, o sinal que sumiu pra sempre, o buraco negro que canta uma nota. Tudo real, tudo ilustrado, explicado de um jeito que dá arrepio e você entende. Custa menos que um lanche. O link tá na bio e fixado aqui nos comentários. Vem pro lado sombrio.`,
  prompts: [
'a ghostly cat existing as alive and dead at the same time, eerie double exposure, quantum superposition, unsettling and beautiful',
'a mysterious dark ebook cover glowing with cosmic horror, the dark side of the universe, ominous',
'a planet where molten glass rains sideways under a violent orange sky, dramatic',
'a black hole singing a single deep note, sound waves rippling through space, surreal',
'a glowing book opening to reveal pages of dark cosmic phenomena, inviting mystery',
  ],
  title: '📕 O gato que está VIVO e MORTO ao mesmo tempo #Shorts',
  desc1: 'Um gato vivo e morto ao mesmo tempo é ciência real — e um dos 21 fenômenos do ebook "O Lado Sombrio do Universo", ilustrado.',
  cta: '📕 Garanta o seu (menos que um lanche): https://neural-update.com.br/ebook\n👉 Link na bio e fixado nos comentários.',
  tags: ['gato de schrödinger', 'física quântica', 'ebook', 'o lado sombrio do universo', 'universo', 'ciência', 'curiosidades'],
  hashtags: ['#ebook', '#quântica', '#universo', '#ciência', '#neuralupdate'],
  pinned: '📕 O Lado Sombrio do Universo — os 21 fenômenos mais assustadores do cosmos, ilustrado, por menos que um lanche: https://neural-update.com.br/ebook',
},
{
  slug: 'vsl3-wow', voice: 'male', track: 'dark-bump-in-the-night.mp3', topic: 'sinal wow radio espaco sumiu ebook',
  publishAt: '2026-07-15T17:00:00.000Z',
  hook: 'O SINAL QUE VEIO\nDO ESPAÇO\nE SUMIU',
  roteiro: `Em mil novecentos e setenta e sete, um telescópio captou um sinal vindo do espaço tão forte e tão estranho que o cientista de plantão só conseguiu escrever uma palavra no papel: "Wow!". O sinal durou setenta e dois segundos, veio da direção de uma estrela distante, e nunca mais se repetiu. Até hoje, quase cinquenta anos depois, ninguém sabe o que foi. Esse mistério é um dos vinte e um que eu reuni no ebook O Lado Sombrio do Universo — os fenômenos mais assustadores e reais do cosmos, todos ilustrados. Se arrepio de mistério é a sua praia, esse livro é pra você. Link na bio e fixado. Menos que um lanche.`,
  prompts: [
'a mysterious powerful radio signal arriving from deep space in 1977, glowing waveform, the famous Wow signal, eerie',
'a scientist writing Wow on a printout as a strange signal appears, dramatic vintage lab moment',
'a signal coming from the direction of a distant star and then vanishing forever, lonely and mysterious',
'a dark ebook cover about the dark side of the universe, ominous cosmic horror',
'a radio telescope at night listening to the silent cosmos, waiting, atmospheric',
  ],
  title: '📕 O SINAL que veio do espaço e sumiu pra sempre #Shorts',
  desc1: 'Em 1977 um telescópio captou o sinal "Wow!" — 72 segundos, nunca mais repetido, sem explicação. É um dos 21 mistérios do ebook "O Lado Sombrio do Universo".',
  cta: '📕 Garanta o seu (menos que um lanche): https://neural-update.com.br/ebook\n👉 Link na bio e fixado nos comentários.',
  tags: ['sinal wow', 'wow signal', 'seti', 'aliens', 'ebook', 'o lado sombrio do universo', 'mistério', 'ciência'],
  hashtags: ['#ebook', '#aliens', '#universo', '#ciência', '#neuralupdate'],
  pinned: '📕 O Lado Sombrio do Universo — os 21 fenômenos mais assustadores do cosmos, ilustrado, por menos que um lanche: https://neural-update.com.br/ebook',
},
{
  slug: 'vsl4-chuva-vidro', voice: 'male', track: 'dark-some-amount-of-evil.mp3', topic: 'planeta chove vidro derretido ebook HD189733b',
  publishAt: '2026-07-17T17:00:00.000Z',
  hook: 'CHOVE VIDRO\nDERRETIDO\nNESSE PLANETA',
  roteiro: `Existe um planeta de verdade onde chove vidro derretido. E o pior: não cai pra baixo — voa de lado, a sete mil quilômetros por hora, porque o vento lá é mais rápido que o som. Uma tempestade de cacos de vidro cortando o céu, num mundo azul lindo e mortal a sessenta e três anos-luz daqui. Esse inferno é real, e é só um dos vinte e um fenômenos do meu ebook O Lado Sombrio do Universo. Cada página é um lugar que parece ficção científica, mas existe de verdade lá fora. Ilustrado, arrepiante, e custa menos que um lanche. O link tá na bio e fixado nos comentários. Corre conhecer o lado sombrio.`,
  prompts: [
'a beautiful deep blue exoplanet where molten glass rains sideways at extreme speed, glass shards streaking through the sky, deadly and gorgeous',
'a violent storm of molten glass shards flying horizontally faster than sound on an alien world, dramatic',
'a stunning cobalt blue planet seen from space, hiding a deadly glass rain, beautiful and ominous',
'a dark ebook cover about the dark side of the universe, cosmic horror aesthetic',
'a glowing book revealing impossible but real alien worlds, page by page, magical and dark',
  ],
  title: '📕 O planeta onde CHOVE VIDRO de lado a 7.000 km/h #Shorts',
  desc1: 'Um planeta real onde chove vidro derretido de lado, mais rápido que o som. É um dos 21 mundos impossíveis (e reais) do ebook "O Lado Sombrio do Universo".',
  cta: '📕 Garanta o seu (menos que um lanche): https://neural-update.com.br/ebook\n👉 Link na bio e fixado nos comentários.',
  tags: ['chuva de vidro', 'HD 189733b', 'exoplaneta', 'ebook', 'o lado sombrio do universo', 'planeta estranho', 'astronomia', 'ciência'],
  hashtags: ['#ebook', '#planeta', '#espaço', '#ciência', '#neuralupdate'],
  pinned: '📕 O Lado Sombrio do Universo — os 21 fenômenos mais assustadores do cosmos, ilustrado, por menos que um lanche: https://neural-update.com.br/ebook',
},
];

for (const it of ITEMS) {
  const dir = path.join(BASE, it.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'roteiro.txt'), it.roteiro.trim(), 'utf8');
  fs.writeFileSync(path.join(dir, 'hook.txt'), it.hook, 'utf8');
  fs.writeFileSync(path.join(dir, 'prompts.txt'), it.prompts.join('\n'), 'utf8');
  const meta = {
    title: it.title,
    description: [it.desc1, '', it.cta, '', BLOG, '', it.hashtags.join(' '), '', MUSIC].join('\n'),
    tags: it.tags, hashtags: it.hashtags, privacyStatus: 'private', publishAt: it.publishAt,
    _isca: false, _pinnedComment: it.pinned,
    _prod: { stream: 'vsl', voice: it.voice, track: it.track, topic: it.topic, hookBig: false },
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  console.log(`${it.slug} [vsl] ${it.roteiro.trim().split(/\s+/).length}p | ${it.publishAt.slice(0,10)} | ${it.title.length}c`);
}
console.log(`OK ${ITEMS.length} VSLs de marketing criadas.`);
