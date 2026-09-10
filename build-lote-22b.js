'use strict';
/**
 * build-lote-22b.js — fecha o slot das 14h até 22/07.
 *  21/07 = VSL marketing do ebook | 22/07 = aula espectroscopia (PROMETIDA pela aula de ondas gravitacionais)
 * Aplica a LEI ZERO ("a dança"): as 2 primeiras palavras do roteiro = 1ª legenda na tela,
 * afirmação incompleta apontada pro espectador, casada com o img1 (clímax).
 */
const { generateImages } = require('./higgsfield-images');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PKGS = [
  {
    slug: 'vsl5-lado-sombrio',
    publishAt: '2026-07-21T17:00:00Z', // 14h BRT, dia ímpar = marketing
    estilo: 'horror-cosmico',
    hook: 'O universo também é ASSUSTADOR',
    // Lei Zero: 1ª legenda = "VOCÊ ACHA"
    roteiro: `Você acha que o universo é só bonito. Ele também é sombrio. Tem um buraco negro solto vagando pela nossa galáxia agora, e ninguém sabe exatamente onde. Tem uma estrela morta que dissolveria cada átomo do seu corpo a mil quilômetros de distância. E tem um vazio tão grande que, se a Terra estivesse lá dentro, a humanidade acharia que está sozinha no cosmos. Eu juntei os vinte e um fenômenos mais sombrios do universo num ebook ilustrado, por menos que um lanche. O link tá na bio.`,
    prompts: [
      'a lone silhouette looking up at a beautiful starry sky that slowly reveals something monstrous and dark lurking behind the stars, cosmic horror, dread creeping in',
      'a rogue black hole drifting silently through a dense starfield, warping and smearing the light around it, invisible menace, ominous',
      'a magnetar neutron star crackling with violent blue-white magnetic energy, small but lethal, radiating death, terrifying',
      'an immense empty black void of space with almost no stars, one faint galaxy impossibly far away, crushing loneliness',
      'a dark illustrated book lying open, pages glowing faintly with cosmic imagery spilling out into the dark, mysterious and inviting',
      'planet Earth small and fragile glowing softly against an overwhelming dark cosmos full of hidden dangers, precious and vulnerable',
    ],
    meta: {
      title: '📕 O universo não é só bonito — ele é SOMBRIO 🌑 #Shorts',
      description: 'Um buraco negro solto vagando pela galáxia. Uma estrela morta que dissolve seus átomos a 1.000 km. Um vazio onde a humanidade se acharia sozinha. Os 21 fenômenos mais sombrios do universo estão no ebook ilustrado.\n\n🌌 EBOOK "O Lado Sombrio do Universo" (21 fenômenos, ilustrado): https://neural-update.com.br/ebook\n\n📩 Ou baixe o ebook GRÁTIS dos 5 fenômenos: https://neural-update.com.br/ebook#isca-gratis\n\n#universo #espaço #ciência #astronomia #buraconegro #neuralupdate',
      tags: ['universo', 'lado sombrio do universo', 'ebook', 'buraco negro errante', 'magnetar', 'vazio de bootes', 'astronomia', 'ciência', 'espaço'],
      privacyStatus: 'private',
    },
  },
  {
    slug: 'pl6-espectroscopia',
    publishAt: '2026-07-22T17:00:00Z', // 14h BRT, dia par = AULA (PROMETIDA no fim da aula de ondas gravitacionais)
    estilo: 'minimalismo-cientifico',
    hook: 'Espectroscopia: a luz entrega tudo',
    // Lei Zero: 1ª legenda = "VOCÊ DESCOBRE"
    roteiro: `Você descobre do que uma estrela é feita sem nunca chegar perto dela. O truque chama espectroscopia. Quando a luz da estrela atravessa um prisma, ela se abre num arco-íris. E nesse arco-íris aparecem linhas escuras. Cada elemento químico apaga uma linha específica, sempre no mesmo lugar: é uma impressão digital. Foi assim que a gente achou hélio no Sol antes de achar hélio na Terra. Toda vez que você lê que uma estrela tem ferro, foi a luz que contou. Na próxima aula: redshift. Sexta, dia vinte e quatro, às duas da tarde.`,
    prompts: [
      'a single beam of starlight passing through a glass prism and splitting into a clean rainbow spectrum with distinct dark absorption lines, scientific minimalism, elegant',
      'a distant star glowing alone in black space with a thin beam of its light traveling toward the viewer, minimalist and quiet',
      'a rainbow spectrum band with precise black vertical absorption lines like a barcode, clean scientific diagram, elegant minimalism',
      'a fingerprint made of light spectrum lines, metaphor for chemical identification, minimalist conceptual',
      'the Sun rendered simply with a spectrum band beneath it revealing its element lines, clean educational visualization',
      'an astronomer silhouette at a telescope with a delicate spectrum of light stretching across the dark sky above, minimalist and reverent',
    ],
    meta: {
      title: '🎓 Como sabemos do que as estrelas são feitas (sem ir lá) ✨ #Shorts',
      description: 'Aula 6 da série Universo do Zero. Espectroscopia: a luz da estrela atravessa um prisma, vira arco-íris, e cada elemento químico apaga uma linha específica — uma impressão digital. Foi assim que achamos hélio no Sol ANTES de achar hélio na Terra.\n\n🎓 Playlist Universo do Zero: https://www.youtube.com/playlist?list=PLQlXGsP6ERAs\n\nMais ciência 👉 https://neural-update.com.br\n\n#espectroscopia #estrelas #luz #astronomia #ciência #universo #neuralupdate',
      tags: ['espectroscopia', 'espectro', 'estrelas', 'hélio', 'linhas de absorção', 'astronomia', 'ciência', 'aula', 'universo do zero', 'luz'],
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
    console.log(`\n=== ${p.slug} | ${p.estilo} | 1ª legenda: "${duas}" ===`);
    await generateImages(p.prompts, dir, (i, n) => process.stdout.write(`  img ${i}/${n}\r`));
    const out = path.join(dir, `${p.slug}.mp4`);
    const r = spawnSync('node', ['make-short-img-flex.js', dir, out, 'espaco universo astronomia'], {
      cwd: __dirname, encoding: 'utf8', timeout: 600000,
      env: { ...process.env, SHORT_SEG: '6.2', SHORTS_VOICE: 'male' },
    });
    console.log((r.stdout || '').split('\n').filter(l => /narracao|final|PRONTO|falhou/i.test(l)).join('\n'));
  }
  // NÃO reaproveitar `lancamento-ebook-universo`: já foi ao ar (com outro título, por isso
  // o check por título deu falso "inédito") e é de antes da inteligência atual (Lei Zero,
  // prompt novo, CTA de share). Decisão do usuário 15/07: cada VSL é um vídeo NOVO e diferente.
  console.log('\n=== LOTE 22B COMPLETO ===');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
