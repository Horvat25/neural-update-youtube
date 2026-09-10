'use strict';
/**
 * gen-grade-lote.js — cria os 18 pacotes da grade (2 aulas + 9 notícias + 7 virais).
 * Cada pasta: roteiro.txt, hook.txt, prompts.txt, meta.json (com _prod = voz/trilha/topico/isca).
 * Identidade: logo (pipeline), assinatura Neural Update, "você". Isca (PDF) na regra 1-em-3 por stream.
 */
const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, 'exports');
const BLOG = 'Mais ciência no nosso blog Neural Update 👉 https://neural-update.com.br';
const MUSIC = 'Music: Kevin MacLeod (incompetech.com) — CC BY 4.0';
const PL_BASICO = 'https://www.youtube.com/playlist?list=PLQlXGsP6ERAs';

const ITEMS = [
// ===================== AULAS (14h, voz Thalita, didático) =====================
{
  slug: 'aula-materia-escura', stream: 'aula', voice: 'female', track: 'cosmic-infinite-perspective.mp3',
  topic: 'materia escura aula didatica', isca: true, publishAt: '2026-07-16T17:00:00.000Z',
  hook: 'AULA\nA MATÉRIA QUE\nNINGUÉM VÊ',
  roteiro: `Aula de hoje: a matéria escura, a coisa mais comum do universo que ninguém nunca viu. Presta atenção: some as estrelas de uma galáxia e some a massa delas. Não fecha a conta. As galáxias giram tão rápido que deviam se despedaçar e voar pra longe — mas alguma coisa invisível segura elas inteiras. A gente chama essa coisa de matéria escura. Ela não brilha, não reflete, não emite nada: só puxa pela gravidade. E tem cinco vezes mais dela do que toda a matéria normal junta, tudo que você consegue ver. Ou seja: o universo é feito quase todo de uma coisa que a gente ainda não enxerga. Na próxima aula: a energia escura, a força que está rasgando o universo. Sexta, dia dezoito, às duas da tarde. Te espero.`,
  prompts: [
'a spiral galaxy spinning, surrounded by a faint glowing invisible halo of dark matter holding it together, elegant scientific visualization',
'a galaxy rotating so fast its stars should fly apart, motion blur of spinning stars, dramatic',
'an invisible web of dark matter filaments glowing faintly across the cosmos, connecting galaxies, beautiful and mysterious',
'a scale showing visible matter as a tiny sliver next to a huge invisible mass, dark matter concept, educational',
'a scientist looking at a galaxy through equations, the invisible mass revealed only by gravity, teaching moment',
'the cosmic web of dark matter, a vast glowing scaffold shaping where galaxies form, majestic',
'a person looking up at the Milky Way realizing most of it is invisible, awe and humility',
  ],
  title: '🎓 Matéria escura: a coisa invisível que segura as galáxias #Shorts',
  desc1: 'AULA da escola Universo do Zero: a matéria escura — 5x mais comum que toda a matéria visível, invisível, e sem ela as galáxias se despedaçariam.',
  tags: ['matéria escura', 'galáxias', 'gravidade', 'curso de astronomia', 'universo do zero', 'astronomia', 'ciência', 'universo'],
  hashtags: ['#matériaescura', '#astronomia', '#ciência', '#universo', '#neuralupdate'],
  next: 'energia escura — sexta, dia 18, às 14h', playlistLine: `🎓 Curso completo (em ordem): ${PL_BASICO}`,
},
{
  slug: 'aula-energia-escura', stream: 'aula', voice: 'female', track: 'cosmic-the-descent.mp3',
  topic: 'energia escura expansao universo aula', isca: false, publishAt: '2026-07-18T17:00:00.000Z',
  hook: 'AULA\nA FORÇA QUE\nRASGA O UNIVERSO',
  roteiro: `Aula de hoje: a energia escura, o maior mistério da ciência inteira. Durante décadas a gente teve certeza de uma coisa: a gravidade estava freando a expansão do universo, puxando tudo de volta. Até que, em mil novecentos e noventa e oito, os astrônomos mediram com cuidado e levaram o susto da história. O universo não está só se expandindo — ele está acelerando. Alguma coisa está empurrando as galáxias pra longe umas das outras, cada vez mais rápido. Batizaram essa coisa de energia escura. E ela é setenta por cento de tudo que existe. A verdade honesta? Ninguém sabe o que é. Só sabemos que ela vai vencer: lá na frente, vai separar tudo. Na próxima aula: as ondas gravitacionais, quando o espaço vira água. Domingo, dia vinte, às duas da tarde. Te espero.`,
  prompts: [
'the universe expanding and accelerating, galaxies flying apart faster and faster, driven by an invisible force, dramatic cosmic scene',
'two visions side by side: gravity pulling galaxies back versus dark energy pushing them apart, conceptual',
'astronomers in 1998 discovering the accelerating universe, a shocking graph glowing, historic moment',
'a pie chart of the universe glowing in space: 70 percent dark energy dominating everything, educational',
'galaxies drifting into lonely isolation in a far future, the universe torn apart by dark energy, melancholic',
'the fabric of space itself stretching and pulling galaxies apart, surreal and grand',
'a person contemplating the vast expanding cosmos, the mystery of dark energy, wonder',
  ],
  title: '🎓 Energia escura: a força misteriosa que rasga o universo #Shorts',
  desc1: 'AULA da escola Universo do Zero: a energia escura — 70% do universo, descoberta em 1998 acelerando a expansão, e ninguém sabe o que é.',
  tags: ['energia escura', 'expansão do universo', 'aceleração cósmica', 'curso de astronomia', 'universo do zero', 'astronomia', 'ciência', 'universo'],
  hashtags: ['#energiaescura', '#astronomia', '#ciência', '#universo', '#neuralupdate'],
  next: 'ondas gravitacionais — domingo, dia 20, às 14h', playlistLine: `🎓 Curso completo (em ordem): ${PL_BASICO}`,
},

// ===================== NOTÍCIAS (08h, voz masc., descoberta espacial) =====================
{
  slug: 'news1-webb-galaxia', stream: 'news', voice: 'male', track: 'cosmic-infinite-perspective.mp3',
  topic: 'james webb galaxia mais distante descoberta', isca: false, publishAt: '2026-07-10T11:00:00.000Z',
  hook: 'A GALÁXIA MAIS\nDISTANTE JÁ VISTA',
  roteiro: `O telescópio James Webb acabou de bater um recorde que parecia impossível. Ele encontrou a galáxia mais distante já vista: a luz dela viajou por mais de treze bilhões de anos pra chegar até nós. Isso quer dizer que a gente está vendo essa galáxia como ela era quando o universo tinha só trezentos milhões de anos — um bebê recém-nascido. E o que assusta os cientistas: ela é grande e brilhante demais pra ter se formado tão cedo. Os livros de astronomia estão sendo reescritos agora, na sua frente. O universo é mais rápido do que a gente imaginava. Aqui é o Neural Update, te trazendo o cosmos todo dia.`,
  prompts: [
'the James Webb space telescope capturing the most distant galaxy ever seen, a tiny ancient red dot of light, majestic golden mirrors',
'ancient light traveling 13 billion years across the cosmos to reach us, long glowing trail through deep space',
'a newborn galaxy from the early universe, surprisingly bright and large, glowing in deep red, wonder',
'a deep field of the earliest galaxies, thousands of ancient specks of light, humbling scale',
'astronomers rewriting astronomy books as new data arrives, a discovery moment, awe',
  ],
  title: '📰 Webb achou a galáxia mais DISTANTE do universo #Shorts',
  desc1: 'O telescópio James Webb encontrou a galáxia mais distante já vista — a luz dela viajou 13 bilhões de anos, mostrando o universo recém-nascido.',
  tags: ['james webb', 'galáxia mais distante', 'descoberta espacial', 'astronomia', 'notícia espaço', 'ciência', 'universo'],
  hashtags: ['#jameswebb', '#espaço', '#astronomia', '#ciência', '#neuralupdate'],
},
{
  slug: 'news2-k2-18b', stream: 'news', voice: 'male', track: 'quantum-investigations.mp3',
  topic: 'exoplaneta k2-18b sinal de vida bioassinatura', isca: false, publishAt: '2026-07-11T11:00:00.000Z',
  hook: 'ACHARAM UM SINAL\nDE VIDA?',
  roteiro: `Talvez a maior notícia da década: num planeta a cento e vinte anos-luz da Terra, o telescópio James Webb detectou uma molécula que, aqui no nosso planeta, só é produzida por seres vivos. O planeta se chama K2 dezoito b, e fica na zona habitável da estrela dele — a faixa onde pode existir água líquida. Calma, não é a confirmação de aliens: pode existir um jeito não-vivo de produzir essa molécula que a gente ainda não conhece. Mas é o sinal mais forte que já tivemos. Pela primeira vez, a pergunta "estamos sozinhos?" tem um lugar concreto pra procurar. Aqui é o Neural Update, te trazendo o cosmos todo dia.`,
  prompts: [
'a distant ocean exoplanet in the habitable zone of its star, possible signs of life, blue and mysterious, cinematic',
'the James Webb telescope analyzing the atmosphere of a faraway planet, spectral lines of a life molecule glowing',
'a molecule that on Earth is only made by living things, glowing in an alien atmosphere, evocative',
'an alien ocean world under a red dwarf star, waves and clouds, the question of life, breathtaking',
'a person looking up wondering if we are alone, the cosmos full of possibility, emotional',
  ],
  title: '📰 Webb achou um possível SINAL DE VIDA em outro planeta #Shorts',
  desc1: 'O James Webb detectou no exoplaneta K2-18b uma molécula que, na Terra, só é feita por seres vivos — o sinal mais forte de vida fora daqui até hoje.',
  tags: ['k2-18b', 'sinal de vida', 'exoplaneta', 'james webb', 'vida extraterrestre', 'astronomia', 'ciência', 'espaço'],
  hashtags: ['#vida', '#exoplaneta', '#espaço', '#ciência', '#neuralupdate'],
},
{
  slug: 'news3-buraco-antigo', stream: 'news', voice: 'male', track: 'dark-bump-in-the-night.mp3',
  topic: 'buraco negro mais antigo james webb descoberta', isca: true, publishAt: '2026-07-12T11:00:00.000Z',
  hook: 'O BURACO NEGRO\nMAIS ANTIGO\nJÁ ACHADO',
  roteiro: `O James Webb achou uma coisa que não deveria existir: o buraco negro mais antigo já visto, de quando o universo tinha menos de meio bilhão de anos. E o problema é o tamanho dele — é gigante demais pra ter crescido tão rápido. Buracos negros levam bilhões de anos pra ficarem desse tamanho, comendo estrelas e gás devagar. Esse aqui apareceu cedo demais, do nada. Os cientistas não sabem explicar como ele cresceu tão rápido no universo bebê. É mais um mistério que o Webb jogou na mesa. Toda semana o telescópio quebra uma certeza antiga. Aqui é o Neural Update, te trazendo o cosmos todo dia.`,
  prompts: [
'a colossal ancient black hole in the early universe, glowing accretion disk, impossibly large for its age, ominous and grand',
'the James Webb telescope detecting a black hole in the infant universe, a dark giant among young stars',
'a supermassive black hole devouring gas and stars in the early cosmos, dramatic and dark',
'a timeline showing a black hole appearing far too early, breaking the rules, conceptual',
'scientists puzzled by an impossible discovery, a dark mystery in deep space, intriguing',
  ],
  title: '📰 O buraco negro mais ANTIGO do universo não deveria existir #Shorts',
  desc1: 'O James Webb achou o buraco negro mais antigo já visto — grande demais para ter crescido tão cedo no universo bebê. Ninguém sabe como.',
  tags: ['buraco negro mais antigo', 'james webb', 'universo primordial', 'descoberta espacial', 'astronomia', 'ciência', 'espaço'],
  hashtags: ['#buraconegro', '#espaço', '#astronomia', '#ciência', '#neuralupdate'],
},
{
  slug: 'news4-interestelar', stream: 'news', voice: 'male', track: 'cosmic-the-descent.mp3',
  topic: 'objeto interestelar cometa de outra estrela', isca: false, publishAt: '2026-07-13T11:00:00.000Z',
  hook: 'UM VISITANTE\nDE OUTRA\nESTRELA',
  roteiro: `Um objeto acabou de entrar no nosso sistema solar vindo de fora — de outra estrela. É a terceira vez na história que a gente flagra um visitante interestelar atravessando a nossa vizinhança. Ele não veio do Sol: veio de muito, muito mais longe, viajando pelo espaço por talvez bilhões de anos antes de passar aqui. Os astrônomos correram os telescópios pra estudar ele antes que fosse embora pra sempre, porque cada visitante desses é uma amostra grátis de outro sistema estelar batendo na nossa porta. É pedaço de outro mundo passando de raspão. Aqui é o Neural Update, te trazendo o cosmos todo dia.`,
  prompts: [
'an interstellar object from another star tumbling through our solar system, a strange dark elongated rock, mysterious',
'a visitor from deep space entering the solar system, the Sun distant behind it, cinematic',
'telescopes racing to observe a fast interstellar traveler before it leaves forever, dramatic',
'a fragment from another star system, ancient and worn from billions of years of travel, evocative',
'the object leaving the solar system forever, a lonely visitor disappearing into the dark',
  ],
  title: '📰 Um objeto de OUTRA estrela entrou no sistema solar #Shorts',
  desc1: 'Pela terceira vez na história, um objeto interestelar — vindo de outra estrela — foi flagrado atravessando o nosso sistema solar.',
  tags: ['objeto interestelar', 'cometa interestelar', 'sistema solar', 'descoberta espacial', 'astronomia', 'ciência', 'espaço'],
  hashtags: ['#espaço', '#astronomia', '#interestelar', '#ciência', '#neuralupdate'],
},
{
  slug: 'news5-agua-espaco', stream: 'news', voice: 'male', track: 'cosmic-infinite-perspective.mp3',
  topic: 'reservatorio de agua gigante no espaco quasar', isca: false, publishAt: '2026-07-14T11:00:00.000Z',
  hook: 'O MAIOR OCEANO\nDO UNIVERSO',
  roteiro: `Os astrônomos encontraram o maior reservatório de água do universo — e ele não está num planeta. Está flutuando no espaço, em volta de um buraco negro gigante, a doze bilhões de anos-luz daqui. E a quantidade é absurda: cento e quarenta trilhões de vezes toda a água de todos os oceanos da Terra, juntos. Um oceano tão grande que a nossa cabeça nem consegue imaginar, boiando no vácuo como vapor. E ele já estava lá quando o universo tinha só um sexto da idade atual — ou seja, água existe no cosmos praticamente desde o começo. A água do seu copo faz parte dessa história antiga. Aqui é o Neural Update, te trazendo o cosmos todo dia.`,
  prompts: [
'a colossal cloud of water vapor floating in space around a distant quasar, glowing blue, unimaginable scale',
'a supermassive black hole surrounded by the largest ocean of water in the universe, cosmic and vast',
'trillions of times Earth oceans worth of water as a glowing cloud in deep space, breathtaking',
'the early universe already full of water, ancient and blue, evocative',
'a glass of water on Earth connected by light to a vast cosmic water cloud, poetic',
  ],
  title: '📰 O MAIOR oceano do universo flutua no espaço #Shorts',
  desc1: 'Astrônomos acharam o maior reservatório de água do universo: 140 trilhões de vezes os oceanos da Terra, flutuando em volta de um buraco negro distante.',
  tags: ['água no espaço', 'maior reservatório de água', 'quasar', 'buraco negro', 'descoberta espacial', 'astronomia', 'ciência'],
  hashtags: ['#água', '#espaço', '#astronomia', '#ciência', '#neuralupdate'],
},
{
  slug: 'news6-euclid', stream: 'news', voice: 'male', track: 'quantum-investigations.mp3',
  topic: 'telescopio euclid mapa universo escuro materia escura', isca: true, publishAt: '2026-07-15T11:00:00.000Z',
  hook: 'O MAPA DO LADO\nESCURO DO\nUNIVERSO',
  roteiro: `Um telescópio está fazendo uma coisa que ninguém nunca fez: mapear o lado escuro do universo. O telescópio Euclid vai fotografar bilhões de galáxias pra desenhar, pela primeira vez, onde está a matéria escura e a energia escura — as duas coisas invisíveis que formam noventa e cinco por cento de tudo que existe. Pensa nisso: durante toda a história, a humanidade só conseguiu ver cinco por cento do universo. Os outros noventa e cinco são escuros, invisíveis. O Euclid é a nossa primeira lanterna apontada pro escuro. E o que ele achar pode reescrever a física inteira. Aqui é o Neural Update, te trazendo o cosmos todo dia.`,
  prompts: [
'the Euclid space telescope mapping billions of galaxies, drawing an invisible web of dark matter, majestic',
'a glowing 3D map of the dark universe, filaments of dark matter and energy revealed, beautiful',
'a pie showing 95 percent of the universe as invisible dark sectors, only 5 percent visible, striking',
'a telescope shining a light into the cosmic darkness for the first time, symbolic and grand',
'a vast field of billions of galaxies being catalogued, humbling scale, deep space',
  ],
  title: '📰 O telescópio que mapeia o LADO ESCURO do universo #Shorts',
  desc1: 'O telescópio Euclid vai mapear bilhões de galáxias para revelar onde estão a matéria e a energia escura — os 95% invisíveis do universo.',
  tags: ['euclid', 'matéria escura', 'energia escura', 'mapa do universo', 'descoberta espacial', 'astronomia', 'ciência'],
  hashtags: ['#espaço', '#astronomia', '#universo', '#ciência', '#neuralupdate'],
},
{
  slug: 'news7-bennu', stream: 'news', voice: 'male', track: 'cosmic-the-descent.mp3',
  topic: 'asteroide bennu amostra ingredientes da vida', isca: false, publishAt: '2026-07-16T11:00:00.000Z',
  hook: 'OS TIJOLOS DA VIDA\nNUM ASTEROIDE',
  roteiro: `Uma sonda trouxe pra Terra um punhado de poeira de um asteroide chamado Bennu — e o que acharam dentro é de arrepiar. A amostra tem os ingredientes da vida: aminoácidos, os tijolos que montam as proteínas, e as bases que formam o nosso DNA. Tudo isso, num asteroide de quatro bilhões e meio de anos que nunca teve vida. Isso reforça uma ideia poderosa: os ingredientes pra vida não nasceram só na Terra — eles estavam espalhados pelo espaço, e podem ter chegado aqui de carona num asteroide. Talvez a vida seja um kit que o universo distribui. Aqui é o Neural Update, te trazendo o cosmos todo dia.`,
  prompts: [
'a spacecraft collecting a sample of dust from a dark rocky asteroid in space, dramatic and precise',
'a sample capsule of asteroid dust glowing on Earth, containing the building blocks of life, evocative',
'amino acids and DNA building blocks found inside ancient asteroid dust, molecular and beautiful',
'an ancient asteroid drifting through space carrying the ingredients of life, poetic',
'the idea that life ingredients rained onto early Earth from asteroids, cosmic and hopeful',
  ],
  title: '📰 Um asteroide trouxe os INGREDIENTES da vida #Shorts',
  desc1: 'A sonda que trouxe poeira do asteroide Bennu achou aminoácidos e bases do DNA — os tijolos da vida, espalhados pelo espaço.',
  tags: ['bennu', 'asteroide', 'ingredientes da vida', 'aminoácidos', 'origem da vida', 'astronomia', 'ciência', 'espaço'],
  hashtags: ['#vida', '#espaço', '#asteroide', '#ciência', '#neuralupdate'],
},
{
  slug: 'news8-frb', stream: 'news', voice: 'male', track: 'quantum-investigations.mp3',
  topic: 'rajada rapida de radio sinal misterioso frb', isca: false, publishAt: '2026-07-17T11:00:00.000Z',
  hook: 'UM SINAL QUE\nBRILHA MAIS QUE\nUM BILHÃO DE SÓIS',
  roteiro: `Existe um tipo de sinal no universo que dura menos que um piscar de olhos, mas libera, nesse instante, mais energia do que o Sol produz em um bilhão de anos. São as rajadas rápidas de rádio. Elas vêm de bilhões de anos-luz de distância, aparecem do nada e somem. Por muito tempo ninguém sabia a origem — e teve gente séria cogitando civilizações alienígenas. Agora os astrônomos rastrearam algumas até estrelas mortas superpoderosas, os magnetares. Mas várias continuam sem explicação. O universo ainda está mandando mensagens que a gente não consegue ler. Aqui é o Neural Update, te trazendo o cosmos todo dia.`,
  prompts: [
'a fast radio burst exploding across the cosmos, a blinding flash brighter than a billion suns, dramatic',
'a mysterious signal from billions of light years away flashing and vanishing, eerie and grand',
'a powerful dead star, a magnetar, unleashing a burst of radio energy, violent and beautiful',
'radio telescopes on Earth catching a split-second cosmic signal, tense discovery moment',
'the universe sending unreadable messages across space, mysterious and poetic',
  ],
  title: '📰 O sinal que brilha mais que 1 BILHÃO de sóis #Shorts',
  desc1: 'As rajadas rápidas de rádio liberam num piscar mais energia que o Sol em 1 bilhão de anos. Vêm de longe, aparecem do nada — e muitas seguem sem explicação.',
  tags: ['rajada rápida de rádio', 'frb', 'sinal misterioso', 'magnetar', 'descoberta espacial', 'astronomia', 'ciência'],
  hashtags: ['#espaço', '#sinal', '#astronomia', '#ciência', '#neuralupdate'],
},
{
  slug: 'news9-planeta-diamante', stream: 'news', voice: 'male', track: 'cosmic-infinite-perspective.mp3',
  topic: 'exoplaneta feito de diamante carbono descoberta', isca: true, publishAt: '2026-07-18T11:00:00.000Z',
  hook: 'UM PLANETA FEITO\nDE DIAMANTE',
  roteiro: `Os astrônomos encontraram um planeta que pode ser feito, em boa parte, de diamante. Ele fica a quarenta anos-luz da Terra, e é uma super-Terra: maior e mais densa que o nosso mundo. O segredo está na química dele — é um planeta riquíssimo em carbono, e sob a pressão e o calor absurdos lá dentro, o carbono vira exatamente aquilo que a gente usa em anel: diamante. Imagina uma crosta com camadas de diamante do tamanho de continentes. É o tipo de lugar que a ficção científica inventaria, mas que o universo real construiu de verdade. O cosmos é mais criativo que qualquer roteirista. Aqui é o Neural Update, te trazendo o cosmos todo dia.`,
  prompts: [
'a distant exoplanet made largely of diamond, its crust glittering with crystalline facets, breathtaking',
'a carbon-rich super-Earth where extreme pressure turns carbon into diamond, glowing and surreal',
'continent-sized layers of diamond under an alien sky, sparkling and dramatic',
'a comparison of Earth and a denser diamond planet 40 light years away, cosmic scale',
'a science fiction world made real, a shimmering diamond planet in deep space, wonder',
  ],
  title: '📰 Existe um planeta feito de DIAMANTE #Shorts',
  desc1: 'Astrônomos acharam a 40 anos-luz uma super-Terra riquíssima em carbono — sob pressão extrema, boa parte dela pode ser diamante puro.',
  tags: ['planeta de diamante', 'super-terra', 'exoplaneta', 'descoberta espacial', 'carbono', 'astronomia', 'ciência', 'espaço'],
  hashtags: ['#planeta', '#espaço', '#astronomia', '#ciência', '#neuralupdate'],
},

// ===================== VIRAIS (22h, voz masc., padrões campeões) =====================
{
  slug: 'viral1-zoo', stream: 'viral', voice: 'male', track: 'quantum-investigations.mp3',
  topic: 'hipotese do zoologico aliens nos observam fermi', isca: false, publishAt: '2026-07-13T01:00:00.000Z',
  hook: 'E SE OS ALIENS\nSÓ ESTÃO TE\nOBSERVANDO?',
  roteiro: `Existe uma resposta arrepiante pra pergunta "por que a gente nunca achou aliens?". Chama-se hipótese do zoológico. A ideia é a seguinte: talvez o universo esteja cheio de civilizações avançadas — e todas elas concordaram em nos deixar em paz. A gente seria tipo um animal numa reserva natural: observado de longe, estudado, mas nunca tocado, pra não estragar o experimento. Pensa: se você achasse um formigueiro selvagem, você entraria falando com as formigas? Uma civilização um milhão de anos mais velha talvez nos veja assim. O silêncio do espaço não prova que estamos sozinhos. Pode significar exatamente o contrário. Você acha que estão nos observando agora?`,
  prompts: [
'Earth seen from space as if inside a protective glass dome, watched by unseen alien eyes, eerie and beautiful',
'advanced alien civilizations quietly observing humanity from a distance, silhouettes in the stars, mysterious',
'humanity as animals in a cosmic nature reserve, observed but untouched, conceptual and unsettling',
'a giant alien eye watching Earth from the darkness of space, ominous',
'a silent galaxy full of hidden civilizations, all watching, all quiet, chilling',
  ],
  title: 'E se os ALIENS só estão te observando? 👽 #Shorts',
  desc1: 'A hipótese do zoológico: talvez o universo esteja cheio de civilizações avançadas que concordaram em nos observar de longe, como animais numa reserva.',
  tags: ['hipótese do zoológico', 'paradoxo de fermi', 'aliens', 'vida extraterrestre', 'universo', 'astronomia', 'ciência'],
  hashtags: ['#aliens', '#universo', '#espaço', '#ciência', '#neuralupdate'],
},
{
  slug: 'viral2-kilonova', stream: 'viral', voice: 'male', track: 'cosmic-the-descent.mp3',
  topic: 'kilonova ouro nasce de estrelas de neutrons colidindo', isca: false, publishAt: '2026-07-14T01:00:00.000Z',
  hook: 'O OURO DO SEU\nDEDO VEIO DE UMA\nCATÁSTROFE',
  roteiro: `Olha pro ouro que você tem: uma aliança, um brinco, um dente. Cada átomo desse ouro nasceu na explosão mais violenta que existe depois do Big Bang. Ouro não se forma em estrelas normais — precisa de uma coisa muito mais brutal. Quando duas estrelas de nêutrons, os cadáveres mais densos do universo, colidem, elas soltam uma explosão chamada kilonova. Numa fração de segundo, ela forja montanhas de ouro, platina e prata, e cospe tudo pelo espaço. Bilhões de anos depois, esse ouro virou parte da Terra, e um pedacinho acabou no seu dedo. Você usa a joia de uma catástrofe cósmica. Legal, né?`,
  prompts: [
'two neutron stars spiraling into a violent collision, a kilonova explosion forging gold, spectacular and bright',
'gold and platinum being born in the blast of colliding dead stars, streams of precious metal in space, dramatic',
'a wedding ring glowing, its gold traced back to an ancient cosmic explosion, poetic',
'neutron stars, the densest corpses in the universe, about to collide, ominous and grand',
'gold atoms scattering across space after a kilonova, eventually becoming part of Earth, beautiful',
  ],
  title: 'O OURO do seu dedo nasceu de uma catástrofe cósmica ✨ #Shorts',
  desc1: 'Todo ouro do universo nasceu quando estrelas de nêutrons colidiram numa explosão chamada kilonova. A joia que você usa é feita de uma catástrofe cósmica.',
  tags: ['kilonova', 'estrelas de nêutrons', 'ouro', 'origem do ouro', 'universo', 'astronomia', 'ciência', 'espaço'],
  hashtags: ['#ouro', '#universo', '#espaço', '#ciência', '#neuralupdate'],
},
{
  slug: 'viral3-planeta-nove', stream: 'viral', voice: 'male', track: 'dark-bump-in-the-night.mp3',
  topic: 'planeta nove escondido no sistema solar', isca: true, publishAt: '2026-07-15T01:00:00.000Z',
  hook: 'TEM UM PLANETA\nESCONDIDO NO\nSISTEMA SOLAR',
  roteiro: `Pode existir um nono planeta gigante escondido no nosso sistema solar, agora, e a gente nunca viu. Lá nos confins, muito além de Netuno, um monte de objetos gelados está com a órbita torta — todos inclinados do mesmo jeito estranho, como se alguma coisa enorme estivesse puxando eles pela gravidade. Os cálculos apontam pra um planeta com dez vezes a massa da Terra, orbitando tão longe que leva mais de dez mil anos pra dar uma volta no Sol. Ele seria tão escuro e distante que os telescópios ainda não conseguiram flagrar. O nosso próprio quintal ainda esconde um gigante. Você acha que vão achar ele?`,
  prompts: [
'a giant dark ninth planet hidden in the far outer solar system, barely lit by a distant tiny Sun, mysterious',
'icy objects beyond Neptune with strangely tilted orbits, pulled by an unseen giant, conceptual',
'a super-Earth sized dark planet orbiting far in the cold darkness, ominous and grand',
'astronomers searching the dark outer solar system for a hidden planet, tense',
'the Sun as a tiny distant star seen from Planet Nine, extreme cold and loneliness, breathtaking',
  ],
  title: 'Tem um PLANETA escondido no sistema solar? 🪐 #Shorts',
  desc1: 'Objetos gelados além de Netuno têm órbitas tortas, como se um planeta gigante e escuro os puxasse. O Planeta Nove pode estar lá — e a gente nunca viu.',
  tags: ['planeta nove', 'planeta x', 'sistema solar', 'netuno', 'mistério', 'astronomia', 'ciência', 'espaço'],
  hashtags: ['#planetanove', '#espaço', '#astronomia', '#ciência', '#neuralupdate'],
},
{
  slug: 'viral4-laniakea', stream: 'viral', voice: 'male', track: 'cosmic-infinite-perspective.mp3',
  topic: 'laniakea superaglomerado nosso endereco no universo escala', isca: false, publishAt: '2026-07-16T01:00:00.000Z',
  hook: 'SEU ENDEREÇO\nREAL NO\nUNIVERSO',
  roteiro: `Deixa eu te dar o seu endereço completo. Você mora na Terra, que orbita o Sol, que é uma estrela na Via Láctea. A Via Láctea faz parte de um grupo de galáxias, que faz parte de um aglomerado, que faz parte de uma estrutura colossal chamada Laniakea. Laniakea tem cem mil galáxias e é tão gigantesca que a luz leva quinhentos milhões de anos pra atravessar ela de ponta a ponta. E aqui vem o arrepio: tudo em Laniakea, incluindo a gente, está escorregando na direção de um ponto misterioso no centro, um sumidouro gravitacional que a gente nem consegue ver. Você é um grão de poeira surfando nessa correnteza. Consegue sentir o tamanho disso?`,
  prompts: [
'the Laniakea supercluster, a vast glowing web of a hundred thousand galaxies flowing toward a center, majestic',
'a zoom out from Earth to Sun to Milky Way to Laniakea, nested cosmic scales, breathtaking',
'streams of galaxies flowing like rivers toward a mysterious gravitational point, grand and beautiful',
'the Milky Way as a tiny speck within the immense Laniakea structure, humbling scale',
'a person standing under the stars realizing their cosmic address, awe and smallness',
  ],
  title: 'Seu ENDEREÇO real no universo vai te assustar 🌌 #Shorts',
  desc1: 'Terra, Sol, Via Láctea, e por fim Laniakea: um superaglomerado de 100 mil galáxias, todas escorregando para um sumidouro gravitacional invisível.',
  tags: ['laniakea', 'superaglomerado', 'via láctea', 'escala do universo', 'grande atrator', 'astronomia', 'ciência'],
  hashtags: ['#universo', '#laniakea', '#espaço', '#ciência', '#neuralupdate'],
},
{
  slug: 'viral5-pale-blue-dot', stream: 'viral', voice: 'male', track: 'cosmic-the-descent.mp3',
  topic: 'pale blue dot ponto azul palido carl sagan terra', isca: false, publishAt: '2026-07-17T01:00:00.000Z',
  hook: 'ISSO É TUDO QUE\nVOCÊ JÁ CONHECEU',
  roteiro: `Em mil novecentos e noventa, uma sonda a seis bilhões de quilômetros da Terra virou a câmera pra trás e tirou uma última foto de casa. Nela, a Terra é isso: um único ponto azul, minúsculo, quase perdido num raio de luz. Um pontinho. E o astrônomo Carl Sagan escreveu: naquele ponto está todo mundo que você ama, todo mundo que você conhece, todo mundo que já existiu. Cada rei, cada guerra, cada história de amor, tudo aconteceu ali, naquele pixel suspenso no escuro. Olhar pra essa foto muda alguma coisa dentro da gente. A gente é pequeno — mas a gente é tudo que temos. Cuida dela.`,
  prompts: [
'the pale blue dot, Earth as a single tiny point of light suspended in a ray of sunlight, seen from the edge of the solar system, humbling',
'a distant spacecraft turning its camera back toward a nearly invisible Earth, poetic and vast',
'Earth as a lonely blue pixel in the immense darkness of space, emotional',
'everything humanity has ever been contained in one tiny point of light, conceptual and moving',
'a person holding the pale blue dot image, feeling the fragility of home, tender',
  ],
  title: 'Esse pontinho é TUDO que você já conheceu 🌍 #Shorts',
  desc1: 'Em 1990, uma sonda a 6 bilhões de km tirou a última foto da Terra: um ponto azul minúsculo. Carl Sagan lembrou que ali está tudo que já amamos.',
  tags: ['pale blue dot', 'ponto azul pálido', 'carl sagan', 'terra vista do espaço', 'voyager', 'astronomia', 'ciência'],
  hashtags: ['#terra', '#carlsagan', '#espaço', '#ciência', '#neuralupdate'],
},
{
  slug: 'viral6-sempre-caindo', stream: 'viral', voice: 'male', track: 'cosmic-infinite-perspective.mp3',
  topic: 'voce nunca para de cair orbita gravidade conceito', isca: true, publishAt: '2026-07-18T01:00:00.000Z',
  hook: 'VOCÊ NUNCA\nPARA DE CAIR',
  roteiro: `Vou te contar uma verdade estranha: os astronautas na estação espacial não estão flutuando porque não tem gravidade. A gravidade lá em cima é quase igual à daqui. Eles flutuam porque estão caindo. Sem parar. É assim: a estação vai tão rápido pra frente que, enquanto ela cai na direção da Terra, o planeta curva embaixo dela na mesma velocidade. Ela cai pra sempre e nunca chega no chão. Isso é uma órbita: uma queda eterna que erra o alvo. E a Lua? Também está caindo na Terra. E a Terra está caindo em volta do Sol. Tudo no universo está numa queda que nunca termina. Você, agora, está caindo pelo espaço. Sabia disso?`,
  prompts: [
'an astronaut floating inside the space station, actually in perpetual free fall around Earth, serene and surprising',
'the space station falling toward Earth while the planet curves away beneath it, orbital motion, conceptual',
'the Moon eternally falling toward Earth but never landing, an endless orbit, beautiful',
'Earth falling around the Sun in an eternal curve, cosmic and elegant',
'a person realizing they are always falling through space, wonder and vertigo',
  ],
  title: 'Você NUNCA para de cair (é ciência) 🌍 #Shorts',
  desc1: 'Astronautas não flutuam por falta de gravidade — eles estão caindo pra sempre. Isso é uma órbita: uma queda eterna que erra o chão. E você também está caindo.',
  tags: ['órbita', 'gravidade', 'queda livre', 'estação espacial', 'lua', 'astronomia', 'ciência', 'física'],
  hashtags: ['#gravidade', '#espaço', '#física', '#ciência', '#neuralupdate'],
},
{
  slug: 'viral7-quasar', stream: 'viral', voice: 'male', track: 'dark-some-amount-of-evil.mp3',
  topic: 'quasar objeto mais brilhante buraco negro comendo', isca: false, publishAt: '2026-07-19T01:00:00.000Z',
  hook: 'O FAROL MAIS\nBRILHANTE DO\nUNIVERSO',
  roteiro: `O objeto mais brilhante do universo é, ironicamente, alimentado pela coisa mais escura que existe: um buraco negro. Chama-se quasar. Funciona assim: um buraco negro gigante, no centro de uma galáxia, devora matéria com tanta fome e tanta violência que o gás em volta esquenta a milhões de graus e brilha mais que a galáxia inteira. Existe um quasar que brilha mais que quinhentos trilhões de sóis, e devora o equivalente a um Sol por dia. Se ele estivesse perto da Terra, seria mais brilhante que a Lua no céu — e nos fritaria. É o motor mais monstruoso do cosmos: a luz vindo da escuridão. Assustador e lindo ao mesmo tempo, não é?`,
  prompts: [
'a quasar, a supermassive black hole devouring matter and blazing brighter than a whole galaxy, spectacular and violent',
'a glowing accretion disk around a black hole heated to millions of degrees, brightest object in the universe',
'a quasar outshining 500 trillion suns, a blinding beacon in deep space, awe and terror',
'a black hole eating a sun a day, jets of light blasting into space, monstrous and grand',
'the brightest light in the cosmos born from the darkest object, poetic contrast, beautiful',
  ],
  title: 'O FAROL mais brilhante do universo é um buraco negro 🕳️ #Shorts',
  desc1: 'O quasar é o objeto mais brilhante do universo — um buraco negro gigante devorando matéria com tanta violência que brilha mais que 500 trilhões de sóis.',
  tags: ['quasar', 'buraco negro', 'objeto mais brilhante', 'disco de acreção', 'universo', 'astronomia', 'ciência', 'espaço'],
  hashtags: ['#quasar', '#buraconegro', '#espaço', '#ciência', '#neuralupdate'],
},
];

for (const it of ITEMS) {
  const dir = path.join(BASE, it.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'roteiro.txt'), it.roteiro.trim(), 'utf8');
  fs.writeFileSync(path.join(dir, 'hook.txt'), it.hook, 'utf8');
  fs.writeFileSync(path.join(dir, 'prompts.txt'), it.prompts.join('\n'), 'utf8');
  const iscaLine = it.isca ? '\n🎁 PDF GRÁTIS — os 5 fenômenos mais assustadores do universo (baixe de graça): https://neural-update.com.br/ebook#isca-gratis\n' : '';
  const descParts = [it.desc1, iscaLine];
  if (it.playlistLine) descParts.push('', it.playlistLine);
  if (it.next) descParts.push('', `⏭️ Próxima aula: ${it.next}.`);
  descParts.push('', BLOG, '', it.hashtags.join(' '), '', MUSIC);
  const meta = {
    title: it.title, description: descParts.filter(x => x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n'),
    tags: it.tags, hashtags: it.hashtags, privacyStatus: 'private', publishAt: it.publishAt,
    _isca: it.isca, _prod: { stream: it.stream, voice: it.voice, track: it.track, topic: it.topic, hookBig: false },
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  const w = it.roteiro.trim().split(/\s+/).length;
  console.log(`${it.slug} [${it.stream}${it.isca ? '+ISCA' : ''}] ${w}p | ${it.publishAt.slice(0, 10)} | ${it.title.length}c`);
}
console.log(`OK ${ITEMS.length} pacotes da grade criados.`);
