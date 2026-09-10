'use strict';
/**
 * lote-31jul-07ago.js — LOTE da grade de 31/07 a 07/08/2026.
 *
 * Só a especificação. O motor é `build-lote.js`.
 *
 * DECISÕES DE DADO (medidas em 29/07, ver memória `analises-obrigatorias-marcelo`
 * e o raio-X dos 7 dias):
 *  · **Roteiro de 75-85 palavras**, não 105-135. Faixa de 31-45s teve mediana 530
 *    contra 251 da faixa 46-60s — os 4 melhores da semana têm 36-37s.
 *  · **08h notícia é o slot campeão** (mediana 419). Os 8 itens abaixo são notícia
 *    REAL e datada de julho/2026 (pesquisada, não inventada).
 *  · **18h viral**: os campeões REINTERPRETAM O COTIDIANO (o nº1 do canal é
 *    "Você NUNCA para de cair"), não anunciam objeto exótico. Todos os 8 partem
 *    de algo que a pessoa já vive.
 *  · **Virais = custo ZERO**: 5 cenas vindas do banco (798 imgs), misturando
 *    2-3 pastas por vídeo pra não repetir a sequência de um vídeo já publicado.
 *  · Notícias: 3 cenas novas a 0,12 + 2 do banco = 0,36cr cada.
 */

// horários BRT→UTC: 08h=11:00Z · 14h=17:00Z · 18h=21:00Z
const H08 = 'T11:00:00.000Z';
const H18 = 'T21:00:00.000Z';

const ISCA = '\n📩 Comenta COSMOS que eu te mando o PDF grátis dos 5 fenômenos do universo.';
const CRED = '\n\nMusic: Kevin MacLeod (incompetech.com) — CC BY 4.0';

module.exports = [
  // ─────────────────────────────────────────── 08h NOTÍCIA (fato real, jul/2026)
  {
    slug: 'nw-atmosfera-rochoso', quando: '2026-07-31' + H08, voz: 'male',
    trilha: 'quantum-investigations.mp3',
    hook: 'ACHARAM AR EM OUTRO MUNDO',
    roteiro: 'Astrônomos confirmaram, pela primeira vez, atmosfera em um planeta rochoso dentro da zona habitável de outra estrela. Detectaram hélio escapando do planeta, e hélio escapando só faz sentido se existir uma atmosfera pra escapar dela. Isso é diferente de tudo que já foi achado: até agora, atmosfera confirmada era coisa de gigante gasoso. Planeta de rocha, na distância certa pra ter água líquida, com ar em volta. É o tipo de mundo que a gente estava procurando. Aqui é o Neural Update, te trazendo o cosmos todo dia.',
    bank: ['news2-k2-18b/img2', 'aula-transito/img4'],
    prompts: [
      'a rocky earth-like exoplanet seen from space with a thin delicate glowing atmosphere hugging its curve, a distant orange star behind it, cinematic vertical composition',
      'wisps of gas escaping from the upper atmosphere of a rocky planet and streaming away into space, backlit by the parent star, delicate and scientific',
      'two planets side by side, a huge gas giant and a small rocky world, both wrapped in atmosphere, clean comparison against black space',
    ],
    titulo: '📰 Acharam ATMOSFERA num planeta rochoso habitável 🪐 #Shorts',
    desc: 'Primeira atmosfera confirmada em um planeta rochoso dentro da zona habitável de outra estrela: detectaram hélio escapando, e hélio escapando exige atmosfera. Até agora, atmosfera confirmada era coisa de gigante gasoso.',
    tags: ['exoplaneta', 'atmosfera', 'zona habitavel', 'planeta rochoso', 'astronomia', 'noticia espacial'],
  },
  {
    slug: 'nw-esfera-dyson', quando: '2026-08-01' + H08, voz: 'male',
    trilha: 'dark-some-amount-of-evil.mp3',
    hook: 'COMO ACHAR UMA CIVILIZAÇÃO',
    roteiro: 'Saiu um estudo novo com pistas de como encontrar uma esfera de Dyson. A ideia é antiga: uma civilização muito avançada envolveria a própria estrela pra capturar toda a energia dela. O problema sempre foi como procurar. Agora os cientistas apontaram onde olhar: anãs vermelhas e anãs brancas são as estrelas mais promissoras, porque uma estrutura em volta delas deixaria uma assinatura de calor difícil de confundir com outra coisa. Ou seja: já existe uma lista de onde procurar. Aqui é o Neural Update, te trazendo o cosmos todo dia.',
    bank: ['viral1-zoo/img3', 's1-wow/img5'],
    prompts: [
      'a colossal artificial structure of dark panels partially enclosing a small red dwarf star, silhouetted against space, megastructure scale, cinematic vertical composition',
      'a faint infrared heat glow leaking from behind an artificial shell around a distant star, the telltale signature seen from far away, eerie and scientific',
      'a small dim white dwarf star with a thin engineered ring orbiting it, geometric and unnatural against the star field',
    ],
    titulo: '📰 Novas pistas de como achar uma ESFERA DE DYSON 🛰️ #Shorts',
    desc: 'Estudo novo aponta onde procurar uma esfera de Dyson: anãs vermelhas e anãs brancas são as estrelas mais promissoras, porque uma megaestrutura em volta delas deixaria uma assinatura de calor difícil de confundir.',
    tags: ['esfera de dyson', 'civilizacao avancada', 'seti', 'aliens', 'astronomia', 'noticia espacial'],
  },
  {
    slug: 'nw-radio-k218b', quando: '2026-08-02' + H08, voz: 'male',
    trilha: 'quantum-investigations.mp3',
    hook: 'APONTARAM O RÁDIO PRO PLANETA',
    roteiro: 'Duas das maiores redes de radiotelescópio do mundo apontaram juntas pro mesmo planeta. O alvo foi o K2 18 b, aquele onde detectaram uma molécula que na Terra é produzida por vida. Agora eles não estão procurando gás: estão procurando sinal. Uma varredura de rádio poderosa, atrás de qualquer transmissão que não tenha explicação natural. É a primeira vez que esse planeta vira alvo de escuta, e não só de análise química. E se tem sinal, ele leva cento e vinte anos pra chegar. Aqui é o Neural Update, te trazendo o cosmos todo dia.',
    bank: ['news2-k2-18b/img1', 's1-wow/img1'],
    prompts: [
      'a vast array of radio telescope dishes all pointed at the same spot in the night sky, coordinated and imposing, cinematic vertical composition',
      'a distant blue ocean exoplanet under a small red star, quiet and mysterious, seen from space',
      'an invisible radio signal rendered as faint concentric rings crossing a hundred light years of star field toward Earth, patient and vast',
    ],
    titulo: '📰 Apontaram radiotelescópios pro planeta do SINAL DE VIDA 📡 #Shorts',
    desc: 'VLA e MeerKAT fizeram juntas uma varredura de rádio no K2-18b, o exoplaneta onde foi detectada uma molécula que na Terra é produzida por vida. Agora a busca não é por gás — é por sinal.',
    tags: ['k2-18b', 'seti', 'radiotelescopio', 'exoplaneta', 'vida extraterrestre', 'noticia espacial'],
  },
  {
    slug: 'nw-energia-buraco-negro', quando: '2026-08-03' + H08, voz: 'male',
    trilha: 'dark-some-amount-of-evil.mp3',
    hook: 'TIRARAM ENERGIA DE UM BURACO NEGRO',
    roteiro: 'Cientistas conseguiram, em laboratório, reproduzir o processo de extrair energia de um buraco negro girando. Não foi um buraco negro de verdade: foi um aparelho que imita a rotação extrema dele. Mas o efeito é o mesmo que Roger Penrose previu no papel há décadas. Um buraco negro que gira arrasta o próprio espaço em volta, e esse arrasto pode devolver mais energia do que você jogou dentro. A teoria dizia que era possível. Agora tem experimento mostrando o mecanismo funcionando. Aqui é o Neural Update, te trazendo o cosmos todo dia.',
    bank: ['s4-colisao-bn/img2', 'w12-buraco-errante/img3'],
    prompts: [
      'a rapidly spinning black hole dragging the fabric of space around itself into a visible swirling vortex, glowing accretion disk tilted, cinematic vertical composition',
      'a laboratory apparatus producing an intense synthetic rotating field, glowing rings of light spinning inside a dark lab, precise and clinical',
      'a beam of energy entering a spinning vortex and leaving brighter and stronger on the other side, energy amplification visualized cleanly',
    ],
    titulo: '📰 Extraíram ENERGIA de um buraco negro girando ⚫ #Shorts',
    desc: 'Cientistas reproduziram em laboratório o processo de Penrose: um buraco negro em rotação arrasta o espaço em volta, e esse arrasto pode devolver mais energia do que entrou. A teoria tinha décadas. Agora tem experimento.',
    tags: ['buraco negro', 'processo de penrose', 'energia', 'rotacao', 'fisica', 'noticia espacial'],
  },
  {
    slug: 'nw-gas-supermassivo', quando: '2026-08-04' + H08, voz: 'male',
    trilha: 'dark-some-amount-of-evil.mp3',
    hook: 'FLAGRARAM O ALMOÇO DO MONSTRO',
    roteiro: 'O James Webb conseguiu a imagem mais detalhada já feita do gás que alimenta um buraco negro supermassivo. O alvo fica no centro da galáxia NGC 4696. Até agora a gente sabia que esses monstros comiam, mas não dava pra ver o prato chegando. Nessa imagem dá: filamentos de gás frio descendo em direção ao centro, canalizados por um caminho que ninguém tinha resolvido em detalhe. É a diferença entre saber que existe e enxergar acontecendo. Aqui é o Neural Update, te trazendo o cosmos todo dia.',
    bank: ['viral7-quasar/img2', 's4-colisao-bn/img4'],
    prompts: [
      'long delicate filaments of cool glowing gas spiraling inward toward the bright center of an elliptical galaxy, seen in infrared false color, cinematic vertical composition',
      'the dense luminous core of a giant galaxy with dust lanes threading across it, extremely detailed, deep space',
      'a supermassive black hole at a galactic center with streams of gas being funneled into its accretion disk from many directions, dramatic',
    ],
    titulo: '📰 Webb flagrou o GÁS alimentando um buraco negro gigante 🔭 #Shorts',
    desc: 'O James Webb fez a imagem mais detalhada já obtida do gás que alimenta o buraco negro supermassivo no centro da galáxia NGC 4696: filamentos de gás frio canalizados para o centro.',
    tags: ['james webb', 'buraco negro supermassivo', 'ngc 4696', 'galaxia', 'astronomia', 'noticia espacial'],
  },
  {
    slug: 'nw-anas-brancas-escondidas', quando: '2026-08-05' + H08, voz: 'male',
    trilha: 'quantum-investigations.mp3',
    hook: 'ESTAVAM ESCONDIDAS NA NOSSA CARA',
    roteiro: 'Descobriram quatro anãs brancas na nossa vizinhança que estavam escondidas em plena vista. Anã branca é o que sobra quando uma estrela como o Sol morre: um caroço do tamanho da Terra com a massa de uma estrela. Essas quatro estavam ao lado de anãs vermelhas mais brilhantes, e o brilho da vizinha simplesmente ofuscava elas nos catálogos. Ninguém precisou de telescópio novo. Precisou olhar de novo pro que já estava fotografado. Aqui é o Neural Update, te trazendo o cosmos todo dia.',
    bank: ['n13-ultima-estrela/img3', 'astronomia-astrofisica-aula/img9'],
    prompts: [
      'a tiny intensely bright white dwarf star almost lost in the glare of a much larger dim red companion star beside it, deep space, cinematic vertical composition',
      'a dense stellar remnant the size of Earth but with the mass of a star, rendered with extreme density and faint blue white glow',
      'an astronomical survey image being re-examined, faint points of light emerging from the glare of brighter neighbours, discovery in old data',
    ],
    titulo: '📰 Acharam 4 estrelas MORTAS escondidas do nosso lado ⚪ #Shorts',
    desc: 'Quatro anãs brancas próximas estavam escondidas em plena vista: o brilho de anãs vermelhas companheiras as ofuscava nos catálogos. Não precisou de telescópio novo — precisou reexaminar o que já estava fotografado.',
    tags: ['ana branca', 'estrela morta', 'ana vermelha', 'vizinhanca solar', 'astronomia', 'noticia espacial'],
  },
  {
    slug: 'nw-urano-torto', quando: '2026-08-06' + H08, voz: 'male',
    trilha: 'quantum-investigations.mp3',
    hook: 'URANO ESTÁ TODO ERRADO',
    roteiro: 'O James Webb mostrou que o campo magnético de Urano é ainda mais torto do que a gente pensava. Na Terra, o campo magnético é quase alinhado com o eixo de rotação. Em Urano ele é inclinado quase sessenta graus e nem sai do centro do planeta. O resultado é uma magnetosfera que cambaleia a cada rotação, como um pião desequilibrado. E o Webb viu essas forças magnéticas deformando o que acontece na atmosfera de lá. Urano não é só o planeta deitado. É o planeta desalinhado. Aqui é o Neural Update, te trazendo o cosmos todo dia.',
    bank: ['v22-saturno-aneis/img3', 'news6-euclid/img2'],
    prompts: [
      'the pale blue green disc of Uranus tilted on its side with faint rings around it, seen from space, serene and strange, cinematic vertical composition',
      'a lopsided magnetic field rendered as glowing distorted loops around a tilted ice giant planet, clearly off center and asymmetric',
      'the upper atmosphere of an ice giant being warped by invisible magnetic forces, subtle glowing aurora patterns in the wrong places',
    ],
    titulo: '📰 O campo magnético de URANO é torto (e o Webb viu) 🌀 #Shorts',
    desc: 'O James Webb mostrou forças magnéticas deformando Urano. O campo magnético do planeta é inclinado quase 60 graus e nem sai do centro — a magnetosfera cambaleia a cada rotação.',
    tags: ['urano', 'campo magnetico', 'james webb', 'gigante de gelo', 'astronomia', 'noticia espacial'],
  },
  {
    slug: 'nw-galaxia-tentaculos', quando: '2026-08-07' + H08, voz: 'male',
    trilha: 'dark-some-amount-of-evil.mp3',
    hook: 'UMA GALÁXIA COM TENTÁCULOS',
    roteiro: 'O James Webb fotografou uma galáxia com tentáculos. Não é figura de linguagem: são longos filamentos de gás e estrelas sendo arrancados dela e arrastados pra trás. Isso acontece quando uma galáxia atravessa o gás quente que preenche um aglomerado. A pressão funciona como vento, e o vento arranca o material dela como quem sopra fumaça. Cada tentáculo é uma trilha de estrelas nascendo fora da galáxia, no meio do nada. Ela está sendo depenada e deixando rastro. Aqui é o Neural Update, te trazendo o cosmos todo dia.',
    bank: ['news1-webb-galaxia/img3', 'n7-galaxias/img5'],
    prompts: [
      'a spiral galaxy with long trailing filaments of gas and stars being stripped away behind it, tentacle like streamers, deep space, cinematic vertical composition',
      'hot intracluster gas pressing against a galaxy like wind against smoke, the galaxy visibly deformed, dramatic',
      'newborn blue star clusters forming inside a trailing tail of stripped gas far outside any galaxy, isolated and strange',
    ],
    titulo: '📰 Webb achou uma galáxia com TENTÁCULOS 🐙 #Shorts',
    desc: 'O James Webb fotografou uma galáxia com longos filamentos de gás e estrelas sendo arrancados dela. Ela atravessa o gás quente de um aglomerado e a pressão age como vento, depenando a galáxia.',
    tags: ['james webb', 'galaxia', 'tentaculos', 'aglomerado de galaxias', 'astronomia', 'noticia espacial'],
  },

  // ─────────────────────────────────────── 18h VIRAL (custo ZERO, só banco)
  {
    slug: 'v26-centro-da-terra', quando: '2026-07-31' + H18, voz: 'male',
    trilha: 'dark-some-amount-of-evil.mp3',
    hook: 'VOCÊ ESTÁ A 6 MIL KM DO INFERNO',
    roteiro: 'O lugar mais quente que existe perto de você não é o deserto. É embaixo dos seus pés. O centro da Terra está a seis mil e quatrocentos quilômetros de distância, e lá tem ferro a cinco mil graus, quase a temperatura da superfície do Sol. Agora pensa numa cidade a seis mil quilômetros de você, de carro. Você provavelmente nunca foi tão longe. Mas a coisa mais extrema do planeta está exatamente a essa distância, e na vertical. Você mora em cima de uma estrela pequena e não sente nada. Você já pensou nisso?',
    bank: ['pl1-gravidade/img2', 'viral6-sempre-caindo/img1', 'n8-nasce-o-sol/img4', 'viral-terra-emagrecendo/img3', 'pl1-gravidade/img5'],
    titulo: 'Você está a 6.400 km do lugar mais QUENTE que conhece 🔥 #Shorts',
    desc: 'O centro da Terra tem ferro a cerca de 5.000 graus — quase a temperatura da superfície do Sol. E está a 6.400 km de você, na vertical.',
    tags: ['centro da terra', 'nucleo terrestre', 'temperatura', 'geologia', 'curiosidade', 'ciencia'],
  },
  {
    slug: 'v27-atomos-de-estrela', quando: '2026-08-01' + H18, voz: 'male',
    trilha: 'cosmic-ambient-espacial.mp3',
    hook: 'SEU CORPO JÁ FOI UMA ESTRELA',
    roteiro: 'O cálcio do seu osso e o ferro do seu sangue não existiam no começo do universo. Nos primeiros minutos só havia hidrogênio e hélio. Tudo mais pesado que isso foi fabricado dentro de estrelas, sob pressão absurda, e só saiu de lá quando essas estrelas explodiram. Então os átomos que estão sustentando você agora passaram por dentro de pelo menos uma estrela que morreu antes do Sol existir. Você não é feito de poeira estelar como metáfora. Você é feito de sobra de explosão. Onde você acha que o seu ferro foi forjado?',
    bank: ['n6-primeira-estrela/img2', 'astronomia-astrofisica-aula/img21', 'n4-tres-minutos/img3', 'pl3-ciclo-estelar/img4', 'n6-primeira-estrela/img6'],
    titulo: 'O ferro do seu sangue foi forjado dentro de uma ESTRELA ⭐ #Shorts',
    desc: 'Nos primeiros minutos do universo só existia hidrogênio e hélio. Todo elemento mais pesado foi fabricado dentro de estrelas e liberado quando elas explodiram — inclusive o cálcio do seu osso e o ferro do seu sangue.',
    tags: ['nucleossintese', 'poeira estelar', 'supernova', 'atomos', 'corpo humano', 'ciencia'],
  },
  {
    slug: 'v28-nunca-viu-o-sol', quando: '2026-08-02' + H18, voz: 'male',
    trilha: 'quantum-investigations.mp3',
    hook: 'VOCÊ NUNCA VIU O SOL',
    roteiro: 'Você nunca viu o Sol como ele é agora. A luz dele leva oito minutos e vinte segundos pra chegar aqui, então o Sol que você enxerga é o Sol de oito minutos atrás. E é pior: aquela luz levou dezenas de milhares de anos pra escapar do interior dele antes de sair viajando. A energia que aquece a sua pele hoje foi gerada no núcleo do Sol quando ainda existia mamute na Terra. Você não olha pro Sol. Você olha pro passado dele. E vale pra toda estrela do céu. Qual delas você acha que já morreu?',
    bank: ['n8-nasce-o-sol/img2', 'n5-primeira-luz/img4', 'pl6-espectroscopia/img2', 'w8-sol-sumisse/img3', 'n9-agora/img6'],
    titulo: 'Você nunca viu o Sol de VERDADE (só o de 8 minutos atrás) ☀️ #Shorts',
    desc: 'A luz do Sol leva 8 minutos e 20 segundos pra chegar. E antes disso, levou dezenas de milhares de anos pra escapar do interior dele. O calor na sua pele hoje foi gerado quando ainda existia mamute.',
    tags: ['sol', 'velocidade da luz', 'oito minutos', 'atraso da luz', 'curiosidade', 'astronomia'],
  },
  {
    slug: 'v29-ouro-do-anel', quando: '2026-08-03' + H18, voz: 'male',
    trilha: 'dark-some-amount-of-evil.mp3',
    hook: 'SEU OURO VEIO DE UMA COLISÃO',
    roteiro: 'Se você tem uma aliança de ouro, ela é mais violenta do que parece. Estrela comum não consegue fabricar ouro: falta energia. O ouro nasce quando duas estrelas de nêutrons colidem, num evento tão extremo que sacode o próprio espaço-tempo. Nessa colisão, em segundos, se forma o equivalente a vários planetas Terra em metal precioso, e isso é cuspido pelo espaço. Todo o ouro que existe na Terra chegou aqui assim, antes do planeta terminar de se formar. Você está usando destroço de catástrofe cósmica no dedo. Sabia disso?',
    bank: ['viral2-kilonova/img2', 'viral2-kilonova/img4', 'pl5-ondas-gravitacionais/img3', 's4-colisao-bn/img5', 'n6-primeira-estrela/img5'],
    titulo: 'Todo o OURO da Terra veio de uma colisão de estrelas 💫 #Shorts',
    desc: 'Estrela comum não fabrica ouro — falta energia. O ouro nasce na colisão de duas estrelas de nêutrons, num evento que sacode o espaço-tempo. Todo o ouro da Terra chegou aqui assim.',
    tags: ['ouro', 'kilonova', 'estrela de neutrons', 'nucleossintese', 'ondas gravitacionais', 'ciencia'],
  },
  {
    slug: 'v30-velocidade-agora', quando: '2026-08-04' + H18, voz: 'male',
    trilha: 'cosmic-ambient-espacial.mp3',
    hook: 'VOCÊ ESTÁ A 2 MILHÕES DE KM/H',
    roteiro: 'Você está sentado parado, e está se movendo mais rápido do que qualquer foguete já feito. A Terra gira, e leva você a mil e seiscentos quilômetros por hora. A Terra orbita o Sol a cento e sete mil. O Sol orbita a galáxia a oitocentos e vinte e oito mil. E a nossa galáxia inteira está caindo em direção a um superaglomerado chamado Laniakea a mais de dois milhões de quilômetros por hora. Soma tudo e você nunca esteve parado um segundo na vida. Nem enquanto dormia. Isso te deixa tonto?',
    bank: ['viral4-laniakea/img2', 'viral4-laniakea/img4', 'w2-grande-atrator/img3', 'n9-agora/img2', 'viral6-sempre-caindo/img4'],
    titulo: 'Você está viajando a 2 MILHÕES de km/h agora 🌀 #Shorts',
    desc: 'A Terra gira a 1.600 km/h, orbita o Sol a 107 mil, o Sol orbita a galáxia a 828 mil, e a galáxia cai em direção a Laniakea a mais de 2 milhões. Você nunca esteve parado.',
    tags: ['laniakea', 'velocidade da terra', 'movimento', 'grande atrator', 'curiosidade', 'astronomia'],
  },
  {
    slug: 'v31-ceu-deveria-ser-branco', quando: '2026-08-05' + H18, voz: 'male',
    trilha: 'quantum-investigations.mp3',
    hook: 'O CÉU DEVERIA SER BRANCO',
    roteiro: 'Olha pro céu de noite e responda: por que ele é escuro? Parece pergunta boba, mas ela derrubou a ideia de que o universo é eterno e infinito. Se fosse, existiria estrela em toda direção que você olhasse, sem exceção, e o céu noturno seria uma parede branca ofuscante. Isso se chama paradoxo de Olbers. A escuridão entre as estrelas só existe porque o universo teve um começo, então a luz das mais distantes ainda não teve tempo de chegar. O céu escuro é a prova de que o universo tem idade. Você já tinha pensado nisso?',
    bank: ['w5-noite-escura/img2', 'w5-noite-escura/img4', 'n5-primeira-luz/img2', 'n1-t-zero/img3', 'bosque-escuro/img5'],
    titulo: 'Por que o céu é ESCURO à noite? (deveria ser branco) 🌌 #Shorts',
    desc: 'Se o universo fosse eterno e infinito, haveria estrela em toda direção e o céu noturno seria uma parede branca. O paradoxo de Olbers: a escuridão é a prova de que o universo teve um começo.',
    tags: ['paradoxo de olbers', 'ceu escuro', 'universo infinito', 'big bang', 'cosmologia', 'astronomia'],
  },
  {
    slug: 'v32-mais-estrelas-que-areia', quando: '2026-08-06' + H18, voz: 'male',
    trilha: 'cosmic-ambient-espacial.mp3',
    hook: 'MAIS ESTRELAS QUE GRÃOS DE AREIA',
    roteiro: 'Pega um punhado de areia na praia e olha quantos grãos tem. Agora imagine toda a areia de todas as praias e desertos da Terra. Existem mais estrelas no universo observável do que todos esses grãos somados. E o número fica pior: cada estrela dessas pode ter planeta. A nossa galáxia sozinha tem cem bilhões de estrelas, e existem trilhões de galáxias. Quando alguém diz que é difícil a gente estar sozinho, é desse número que está falando. Cabe uma praia inteira dentro de uma galáxia. Consegue imaginar isso?',
    bank: ['extremos-universo/img3', 'n7-galaxias/img2', 'viral1-zoo/img4', 'extremos-universo/img8', 'n15-morte-termica/img2'],
    titulo: 'Existem mais ESTRELAS que grãos de areia na Terra 🏖️ #Shorts',
    desc: 'Toda a areia de todas as praias e desertos da Terra somada tem menos grãos do que o número de estrelas no universo observável. Nossa galáxia sozinha tem 100 bilhões, e existem trilhões de galáxias.',
    tags: ['quantas estrelas tem no universo', 'graos de areia', 'escala do universo', 'galaxias', 'curiosidade', 'astronomia'],
  },
  {
    slug: 'v33-seu-peso-muda', quando: '2026-08-07' + H18, voz: 'male',
    trilha: 'dark-some-amount-of-evil.mp3',
    hook: 'VOCÊ PESA MENOS NO PERU',
    roteiro: 'Você pesa menos em algumas partes do mundo, e isso não é dieta. A Terra não é uma bola perfeita: ela é achatada nos polos e inflada no equador. Quem está no equador está mais longe do centro do planeta e sente gravidade um pouco menor. Some a isso a rotação, que joga você levemente pra fora, e a densidade diferente da rocha embaixo dos seus pés. Resultado: a mesma pessoa pesa cerca de meio quilo menos no alto de uma montanha equatorial do que no polo. Sua balança mede o lugar, não só você. Onde você pesaria menos?',
    bank: ['pl1-gravidade/img3', 'pl1-gravidade/img4', 'viral-terra-emagrecendo/img2', 'pl2-mecanica-celeste/img5', 'viral6-sempre-caindo/img3'],
    titulo: 'Seu peso MUDA dependendo de onde você está na Terra ⚖️ #Shorts',
    desc: 'A Terra é achatada nos polos e inflada no equador. Quem está no equador fica mais longe do centro e sente gravidade menor. Somando rotação e densidade da rocha, dá cerca de meio quilo de diferença.',
    tags: ['gravidade', 'peso', 'equador', 'rotacao da terra', 'geoide', 'curiosidade'],
  },
].map(v => ({
  ...v,
  desc: v.desc + ISCA + CRED + '\n\n#astronomia #universo #espaço #ciencia #neuralupdate',
}));
