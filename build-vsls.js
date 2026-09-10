'use strict';
/**
 * build-vsls.js — as 2 VSLs do slot 14h (dias ímpares) até 22/07.
 * REGRA (usuário 15/07): cada VSL vende UM fenômeno do ebook e é um vídeo DIFERENTE —
 * nunca repetir ângulo. Já usados: guarda-chuva "lado sombrio", gato, sinal Wow, chuva de vidro.
 * Escolhidos aqui: buraco negro errante (19/07) e magnetar (21/07) — ângulo de MEDO
 * (Jake Thomas: medo aparece em 39% dos títulos virais e é o que casa com "O Lado Sombrio").
 * LEI ZERO: 2 primeiras palavras do roteiro = 1ª legenda na tela, casada com o img1.
 */
const { generateImages } = require('./higgsfield-images');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PKGS = [
  {
    slug: 'vsl5-buraco-errante',
    publishAt: '2026-07-19T17:00:00Z', // 14h BRT (ímpar = marketing)
    // Lei Zero: 1ª legenda = "NINGUÉM SABE"
    roteiro: `Ninguém sabe onde ele está agora. Existe um buraco negro solto vagando pela nossa galáxia, arrancado do lugar onde nasceu. Ele não emite luz nenhuma. A única forma de perceber que passou perto é ver as estrelas do fundo entortarem. Os astrônomos estimam que existem milhões deles só na Via Láctea, e a gente mapeou quase nenhum. Esse é um dos vinte e um fenômenos do ebook O Lado Sombrio do Universo, ilustrado, por menos que um lanche. O link tá na bio.`,
    hook: 'Um buraco negro SOLTO na galáxia',
    prompts: [
      'a completely dark invisible black hole drifting through a dense starfield, betrayed only by the stars behind it bending and smearing into arcs, silent and unseen menace, cosmic dread',
      'gravitational lensing warping a field of stars into perfect rings around an empty dark sphere, precise and eerie, deep space',
      'a rogue black hole tearing away from its home galaxy, trailing distorted starlight behind it, violent ejection, dramatic',
      'a star map of the Milky Way with countless unmarked dark points hidden between the stars, unsettling implication, scientific visualization',
      'a dark illustrated book open with cosmic imagery spilling from its pages into the void, mysterious and inviting',
      'planet Earth small and unaware glowing in the dark, an unseen distortion passing far in the background, quiet dread',
    ],
    meta: {
      title: '📕 Um buraco negro SOLTO está vagando pela galáxia agora 🕳️ #Shorts',
      description: 'Ele não emite luz. A única pista de que passou perto é ver as estrelas do fundo entortarem. Existem milhões deles só na Via Láctea — e mapeamos quase nenhum. Um dos 21 fenômenos do ebook.\n\n🌌 EBOOK "O Lado Sombrio do Universo" (21 fenômenos, ilustrado): https://neural-update.com.br/ebook\n\n📩 Ebook GRÁTIS dos 5 fenômenos: https://neural-update.com.br/ebook#isca-gratis\n\n#buraconegro #universo #espaço #ciência #astronomia #neuralupdate',
      tags: ['buraco negro errante', 'buraco negro solto', 'via láctea', 'lente gravitacional', 'ebook', 'astronomia', 'ciência', 'espaço', 'universo'],
      privacyStatus: 'private',
    },
  },
  {
    slug: 'vsl6-magnetar',
    publishAt: '2026-07-21T17:00:00Z', // 14h BRT (ímpar = marketing)
    // Lei Zero: 1ª legenda = "VOCÊ DERRETERIA"
    roteiro: `Você derreteria antes de chegar perto. Existe uma estrela morta do tamanho de uma cidade com o campo magnético mais forte do universo: o magnetar. A mil quilômetros de distância, esse campo dissolveria cada átomo do seu corpo. Você não morreria queimado nem esmagado: você simplesmente deixaria de existir como matéria. E tem uns trinta deles catalogados na nossa galáxia. Esse é um dos vinte e um fenômenos do ebook O Lado Sombrio do Universo, ilustrado, por menos que um lanche. Link na bio.`,
    hook: 'A estrela que te DISSOLVE a 1.000 km',
    prompts: [
      'a magnetar neutron star crackling with violent blue-white magnetic field lines whipping and erupting into space, small but unimaginably lethal, terrifying energy',
      'extreme close up of a neutron star surface glowing white hot, twisted magnetic field lines arcing above it, hyper detailed and menacing',
      'magnetic field lines of a magnetar visualized as vast twisting ribbons of blue energy engulfing the space around it, overwhelming power',
      'matter and atoms visibly dissolving and unraveling into streaks of light near an intense magnetic field, disintegration, unsettling',
      'a dark illustrated book open with cosmic imagery spilling from its pages into the void, mysterious and inviting',
      'a tiny city-sized star compared to a vast planet for scale, deceptively small yet radiating lethal energy, dramatic scale contrast',
    ],
    meta: {
      title: '📕 A estrela morta que te DISSOLVE a 1.000 km de distância ☠️ #Shorts',
      description: 'O magnetar tem o campo magnético mais forte do universo. A 1.000 km, ele dissolveria cada átomo do seu corpo — você não morreria queimado, deixaria de existir como matéria. Um dos 21 fenômenos do ebook.\n\n🌌 EBOOK "O Lado Sombrio do Universo" (21 fenômenos, ilustrado): https://neural-update.com.br/ebook\n\n📩 Ebook GRÁTIS dos 5 fenômenos: https://neural-update.com.br/ebook#isca-gratis\n\n#magnetar #estreladeneutrons #universo #espaço #ciência #astronomia #neuralupdate',
      tags: ['magnetar', 'estrela de nêutrons', 'campo magnético', 'estrela morta', 'ebook', 'astronomia', 'ciência', 'espaço', 'universo'],
      privacyStatus: 'private',
    },
  },
];

(async () => {
  for (const p of PKGS) {
    const dir = path.join(__dirname, 'exports', p.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'roteiro.txt'), p.roteiro, 'utf8');
    fs.writeFileSync(path.join(dir, 'hook.txt'), p.hook, 'utf8');
    fs.writeFileSync(path.join(dir, 'prompts.txt'), p.prompts.join('\n'), 'utf8');
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ ...p.meta, publishAt: p.publishAt }, null, 2), 'utf8');
    const duas = p.roteiro.split(/\s+/).slice(0, 2).join(' ').toUpperCase();
    console.log(`\n=== ${p.slug} | 1ª legenda: "${duas}" ===`);
    await generateImages(p.prompts, dir, (i, n) => process.stdout.write(`  img ${i}/${n}\r`));
    const out = path.join(dir, `${p.slug}.mp4`);
    const r = spawnSync('node', ['make-short-img-flex.js', dir, out, 'espaco universo astronomia'], {
      cwd: __dirname, encoding: 'utf8', timeout: 600000,
      env: { ...process.env, SHORT_SEG: '6.2', SHORTS_VOICE: 'male' },
    });
    console.log((r.stdout || '').split('\n').filter(l => /narracao|final|PRONTO|falhou/i.test(l)).join('\n'));
  }
  console.log('\n=== VSLs COMPLETAS ===');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
