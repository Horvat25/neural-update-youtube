'use strict';
/**
 * build-lote-22.js — lote que fecha a grade até 22/07.
 *  08h virais (20,21,22) + 14h aula prometida (20).
 * Aplica a inteligência: 1ª fala = gancho (sem intro/bordão), 30-45s,
 * estrutura+estilo rotacionados (filtro anti-repetição), CTA de share
 * (nossa métrica mais fraca: 0,12%), img1 = clímax, loop no fim.
 */
const { generateImages } = require('./higgsfield-images');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PKGS = [
  {
    slug: 'v20-tita-voar',
    publishAt: '2026-07-20T11:00:00Z', // 08h BRT
    estrutura: 'ESCALA/ABSURDO', estilo: 'doc-70s',
    hook: 'A lua onde dá pra VOAR batendo os braços',
    roteiro: `Existe uma lua onde você conseguiria voar batendo os braços. É Titã, a maior lua de Saturno. A gravidade lá é sete vezes mais fraca que a da Terra, e o ar é quatro vezes mais denso. Com asas nas costas, um humano decolaria só batendo os braços. E veria rios, lagos e chuva caindo — só que nada disso é água: é metano líquido, a cento e oitenta graus negativos. Manda pra alguém que ia querer voar em Titã.`,
    prompts: [
      'an astronaut in a white spacesuit with large mechanical wings strapped to both arms, mid-flight and banking through a thick amber haze high above an alien moon, arms spread wide in a downstroke, low sun behind creating rim light through the fog, 1970s documentary film grain',
      'the surface of Titan moon with liquid methane rivers and lakes reflecting a dim orange sky, thick atmosphere, retro documentary photography',
      'Saturn with its rings looming enormous in the orange sky above Titan, seen from the misty surface, vintage film look',
      'liquid methane rain falling slowly in huge droplets through a dense orange atmosphere, alien weather, cinematic',
      'an astronaut standing on the shore of a vast black methane lake on Titan, dim eerie orange light, lonely and beautiful',
      'wide view of Titan the hazy golden moon floating in space next to Saturn, majestic scale, retro sci-fi documentary',
    ],
    meta: {
      title: 'Titã: a lua onde você poderia VOAR batendo os braços 🪐 #Shorts',
      description: 'Titã, a maior lua de Saturno, tem gravidade 7x mais fraca que a Terra e ar 4x mais denso — com asas nos braços, um humano decolaria. E lá chove metano líquido: é o único outro lugar do sistema solar com rios e lagos na superfície.\n\nMais ciência no nosso blog Neural Update 👉 https://neural-update.com.br\n\n#titã #saturno #espaço #ciência #universo #astronomia #neuralupdate',
      tags: ['titã', 'titan', 'lua de saturno', 'metano', 'voar em titã', 'saturno', 'astronomia', 'ciência', 'espaço', 'sistema solar'],
      privacyStatus: 'private',
    },
  },
  {
    slug: 'v21-venus-dia-ano',
    publishAt: '2026-07-21T11:00:00Z',
    estrutura: 'DETETIVE', estilo: 'pintura',
    hook: 'Em VÊNUS, 1 dia dura mais que 1 ano',
    roteiro: `Em Vênus, um único dia dura mais do que um ano inteiro. Parece erro de conta. Não é. Vênus gira tão devagar que uma volta no próprio eixo leva duzentos e quarenta e três dias terrestres. Mas a volta ao redor do Sol leva só duzentos e vinte e cinco. O planeta termina o ano antes de terminar o dia. E gira ao contrário: lá, o Sol nasce no oeste. Se você fizesse aniversário em Vênus, faria antes de acordar.`,
    prompts: [
      'planet Venus rotating impossibly slowly, thick swirling yellow toxic clouds, oil painting style, dramatic and surreal, cosmic scale',
      'the hellish volcanic surface of Venus glowing under dense crushing yellow clouds, painterly, oppressive atmosphere',
      'a sun rising in the wrong direction over an alien horizon, west instead of east, surreal painting, dreamlike',
      'Venus and its orbit around the sun visualized as a slow cosmic dance, elegant painterly diagram, golden and amber',
      'a clock face melting and stretching against the backdrop of Venus, time distortion, surreal oil painting',
      'planet Venus glowing pale gold in the black void of space, serene painterly beauty, majestic',
    ],
    meta: {
      title: 'Em VÊNUS, 1 dia dura MAIS que 1 ano (não é erro) 🪐 #Shorts',
      description: 'Vênus gira tão devagar que uma volta no próprio eixo leva 243 dias terrestres — mas a volta ao redor do Sol leva só 225. O planeta termina o ano antes de terminar o dia. E gira ao contrário: lá o Sol nasce no oeste.\n\nMais ciência no nosso blog Neural Update 👉 https://neural-update.com.br\n\n#vênus #planeta #espaço #ciência #universo #astronomia #neuralupdate',
      tags: ['vênus', 'venus', 'dia em vênus', 'ano em vênus', 'rotação retrógrada', 'sistema solar', 'astronomia', 'ciência', 'espaço', 'planetas'],
      privacyStatus: 'private',
    },
  },
  {
    slug: 'v22-saturno-aneis',
    publishAt: '2026-07-22T11:00:00Z',
    estrutura: 'ANTES-DEPOIS/URGENCIA', estilo: 'macro-realista',
    isca: true, // 3º vídeo do ciclo -> CTA da isca grátis
    hook: 'Saturno está PERDENDO os anéis',
    roteiro: `Saturno está perdendo os anéis, e a gente teve sorte de nascer agora. A NASA mediu: eles estão caindo no planeta como chuva de gelo, toneladas por segundo. Em cem milhões de anos, somem. E são novos: quando os dinossauros existiam, Saturno provavelmente nem tinha anéis. De toda a história do sistema solar, a humanidade apareceu bem na fatia de tempo em que dava pra ver. Manda pra alguém que precisa ver Saturno antes que acabe.`,
    prompts: [
      'Saturn losing its rings, glittering ice particles raining down onto the planet in streaks, hyper realistic macro detail, breathtaking and melancholic',
      'extreme close up macro of Saturn ring particles, chunks of ice and rock tumbling in sunlight, razor sharp detail',
      'Saturn in all its glory with brilliant defined rings, hyper realistic, the most beautiful object in the solar system',
      'a bare ringless Saturn as it may have looked in the age of dinosaurs, plain and strange, realistic',
      'ice rain falling from the rings into Saturn upper atmosphere creating faint glowing streaks, scientific realism',
      'Saturn with rings viewed from a distance shrinking against the vast black of space, sense of fleeting time, cinematic realism',
    ],
    meta: {
      title: 'Saturno está PERDENDO os anéis (e a gente teve sorte) 💫 #Shorts',
      description: 'A NASA mediu: os anéis de Saturno estão caindo no planeta como chuva de gelo, toneladas por segundo — em ~100 milhões de anos somem. E eles são recentes: na era dos dinossauros, Saturno provavelmente não tinha anéis. Nascemos exatamente na fatia de tempo em que dá pra ver.\n\n📩 Ebook GRÁTIS — Os 5 Fenômenos Mais Impressionantes do Universo: https://neural-update.com.br/ebook#isca-gratis\n\nMais ciência 👉 https://neural-update.com.br\n\n#saturno #anéis #espaço #ciência #universo #astronomia #neuralupdate',
      tags: ['saturno', 'anéis de saturno', 'nasa', 'chuva de anéis', 'sistema solar', 'astronomia', 'ciência', 'espaço', 'planetas'],
      privacyStatus: 'private',
    },
  },
  {
    slug: 'pl5-ondas-gravitacionais',
    publishAt: '2026-07-20T17:00:00Z', // 14h BRT — AULA PROMETIDA no fim da aula de energia escura
    estrutura: 'AULA', estilo: 'minimalismo-cientifico',
    aula: true,
    hook: 'Ondas gravitacionais: o espaço vira água',
    roteiro: `O espaço não é vazio: ele é um tecido. Quando duas coisas absurdamente pesadas se chocam, esse tecido balança, igual água num lago. Essas ondulações são as ondas gravitacionais. Einstein previu em mil novecentos e dezesseis e disse que nunca conseguiríamos medir. Ele errou. Em dois mil e quinze, o LIGO sentiu dois buracos negros colidindo a um bilhão e trezentos milhões de anos-luz daqui. A ondulação que chegou aqui era menor que um próton — e a gente ouviu. Na próxima aula: espectroscopia, como a luz revela do que as estrelas são feitas. Quarta, dia vinte e dois, às duas da tarde.`,
    prompts: [
      'two black holes spiraling into each other sending visible ripples through a glowing grid of spacetime, clean scientific minimalism, elegant',
      'a perfect grid of spacetime fabric being stretched and warped by a heavy sphere, minimalist scientific visualization, clean',
      'ripples spreading across a still dark lake surface, single drop, minimalist and meditative, metaphor for spacetime',
      'Albert Einstein silhouette against a chalkboard of equations, minimalist scientific illustration, respectful',
      'the LIGO detector long laser arms stretching across a desert landscape, clean architectural minimalism, aerial',
      'a single faint wave passing through Earth, visualized as an elegant ripple in a spacetime grid, minimalist cosmic',
    ],
    meta: {
      title: '🎓 Ondas gravitacionais: quando o espaço vira água #Shorts',
      description: 'Aula 5 da série Universo do Zero. O espaço-tempo é um tecido — e quando dois buracos negros colidem, ele balança. Einstein previu em 1916 e achou que nunca mediríamos; em 2015 o LIGO detectou uma ondulação MENOR QUE UM PRÓTON vinda de 1,3 bilhão de anos-luz.\n\n🎓 Playlist Universo do Zero: https://www.youtube.com/playlist?list=PLQlXGsP6ERAs\n\nMais ciência 👉 https://neural-update.com.br\n\n#ondasgravitacionais #einstein #ligo #espaço #ciência #astronomia #neuralupdate',
      tags: ['ondas gravitacionais', 'einstein', 'ligo', 'espaço-tempo', 'buracos negros', 'relatividade', 'astronomia', 'ciência', 'aula', 'universo do zero'],
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
    const palavras = p.roteiro.split(/\s+/).length;
    console.log(`\n=== ${p.slug} | ${p.estrutura} | ${p.estilo} | ${palavras} palavras ===`);
    console.log('  gerando imagens...');
    await generateImages(p.prompts, dir, (i, n) => process.stdout.write(`  img ${i}/${n}\r`));
    console.log('  imagens OK, montando vídeo...');
    const out = path.join(dir, `${p.slug}.mp4`);
    const r = spawnSync('node', ['make-short-img-flex.js', dir, out, 'espaco universo astronomia'], {
      cwd: __dirname, encoding: 'utf8', timeout: 600000,
      env: { ...process.env, SHORT_SEG: '6.2', SHORTS_VOICE: 'male' },
    });
    console.log((r.stdout || '').split('\n').filter(l => /narra|dur|PRONTO|aviso|✓/i.test(l)).join('\n'));
    if (!fs.existsSync(out)) console.error('  ✗ FALHOU:', (r.stderr || '').slice(-300));
    else console.log(`  ✓ ${p.slug}.mp4 (${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);
  }
  console.log('\n=== LOTE COMPLETO ===');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
