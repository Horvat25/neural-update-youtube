'use strict';
// Gera os 7 posts de feed de 18–24/09/2026 (rodar uma vez; os .json ficam em carrossel/posts/).
const fs = require('fs');
const path = require('path');
const I = 'carrossel/img/';
const segue = '👉 Segue @neuralupdate: ciência do espaço todo dia.';
const posts = [
  { slug: 'car-mito-ou-verdade-2-2026-09-18', quando: '2026-09-18T15:00:00.000Z', formato: 'carrossel · quiz (gera comentário)',
    legenda: 'Mito ou verdade? Mais 5 frases sobre o espaço. 🌠\n\nA da estrela cadente é a que mais engana: ela não é estrela nenhuma.\n\n💬 Comenta quantas você acertou.\n🔖 Salva pra usar na próxima discussão.\n' + segue + '\n\nFontes: NASA · ESA\n\n#curiosidades #espaco #astronomia #ciencia #neuralupdate',
    slides: [
      { tipo: 'capa', img: I + 'viral-poeira-no-telhado_cena2.png', kicker: 'Teste rápido · parte 2', titulo: 'Mito ou <em>verdade?</em>', sub: '5 frases sobre o espaço. Chuta antes de arrastar.' },
      { tipo: 'mito', veredito: 'MITO', img: I + 'viral-poeira-no-telhado_cena2.png', frase: '“Estrela cadente é uma estrela caindo.”', texto: 'É um <strong>grão de poeira</strong>, muitas vezes menor que um grão de areia, pegando fogo ao entrar na atmosfera a dezenas de km por segundo.' },
      { tipo: 'mito', veredito: 'MITO', astro: 'lua', frase: '“A Lua não gira.”', texto: 'Ela gira, sim: <strong>uma volta em torno de si</strong> no mesmo tempo em que dá uma volta na Terra. Por isso a gente sempre vê a mesma face.' },
      { tipo: 'mito', veredito: 'MITO', img: I + 'nw-quando-estrela-vira-supernova_cena6.png', frase: '“Buraco negro suga tudo como um aspirador.”', texto: 'Longe dele, a gravidade é igual à de qualquer objeto com a mesma massa. Se o Sol virasse um buraco negro, <strong>a Terra continuaria na mesma órbita</strong>.' },
      { tipo: 'mito', veredito: 'MITO', img: I + 'pl49-paradoxo-de-fermi_cena1.png', frase: '“Explosão no espaço faz barulho.”', texto: 'Som precisa de ar (ou outro meio) pra viajar. No vácuo <strong>não tem o que vibrar</strong>: a explosão seria silenciosa.' },
      { tipo: 'mito', veredito: 'VERDADE', astro: 'venus', frase: '“Em Vênus, um dia dura mais que um ano.”', texto: 'Vênus leva <strong>243 dias</strong> terrestres pra girar uma vez em torno de si, e só <strong>225</strong> pra dar a volta no Sol.', cta: true, fonte: 'Fontes: NASA Science · ESA' },
    ] },
  { slug: 'post-voyager-um-dia-luz-2026-09-19', quando: '2026-09-19T15:00:00.000Z', formato: 'post único · número de impacto (gera compartilhamento)',
    legenda: 'O objeto mais distante que a humanidade já lançou ainda está chegando a 1 dia-luz da Terra. 🛰️\n\nA Voyager 1 foi lançada em 1977 e viaja a uns 61 mil km/h. A luz faz esse caminho em 24 horas; a sonda levou quase meio século.\n\n📤 Manda pra quem acha que dá pra visitar outra estrela.\n' + segue + '\n\nFonte: NASA / JPL\n\n#voyager #nasa #espaco #curiosidades #neuralupdate',
    slides: [
      { tipo: 'numero', img: I + 'pl49-paradoxo-de-fermi_cena1.png', kicker: 'Você sabia?', numero: '1 dia-luz', titulo: 'é onde a Voyager 1 está chegando. Depois de quase 50 anos.', texto: 'Lançada em <strong>1977</strong>, ela é o objeto mais distante que já saiu da Terra. A luz faz o mesmo caminho em <strong>24 horas</strong>.', fonte: 'Fonte: NASA / JPL' },
    ] },
  { slug: 'car-sol-por-dentro-2026-09-20', quando: '2026-09-20T15:00:00.000Z', formato: 'carrossel · aula em slides (salvamento)',
    legenda: 'O que tem dentro do Sol? ☀️\n\nSão camadas, do núcleo de 15 milhões de graus até a coroa, que é mais quente que a própria superfície. E a energia que te ilumina hoje pode ter começado a sair lá de dentro há milhares de anos.\n\n🔖 Salva pra revisar.\n' + segue + '\n\nFonte: NASA Science (Sun)\n\n#sol #astronomia #ciencia #espaco #neuralupdate',
    slides: [
      { tipo: 'capa', img: I + 'nw-sol-vira-ana-branca_cena1.png', kicker: 'Aula rápida', titulo: 'O que tem <em>dentro</em> do Sol?', sub: 'Do núcleo até a coroa. Arrasta.' },
      { tipo: 'texto', img: I + 'nw-sol-vira-ana-branca_cena1.png', kicker: '1 · Núcleo', titulo: 'A usina', texto: 'Uns <strong>15 milhões de °C</strong>. É aqui que o hidrogênio vira hélio por fusão nuclear e libera a energia do Sol.' },
      { tipo: 'texto', img: I + 'nw-sol-vira-ana-branca_cena1.png', kicker: '2 · Zona radiativa', titulo: 'O labirinto da luz', texto: 'A energia é absorvida e reemitida tantas vezes que pode levar <strong>milhares de anos</strong> pra atravessar essa camada.' },
      { tipo: 'texto', img: I + 'nw-sol-vira-ana-branca_cena1.png', kicker: '3 · Zona convectiva', titulo: 'Uma panela fervendo', texto: 'O gás quente <strong>sobe</strong>, esfria perto da superfície e <strong>desce</strong> de novo, carregando a energia pra fora.' },
      { tipo: 'astro', astro: 'sol-branco', kicker: '4 · Fotosfera', titulo: 'A “superfície” que a gente vê', texto: 'Uns <strong>5.500 °C</strong>. É daqui que sai a luz que chega até você em cerca de 8 minutos.' },
      { tipo: 'lista', kicker: '5 · Coroa · resumo pra salvar', titulo: 'A camada de fora é a mais quente 🔖', linhas: [['Núcleo', '≈ 15 milhões °C'], ['Fotosfera', '≈ 5.500 °C'], ['Coroa', '> 1 milhão °C']], cta: true, fonte: 'Fonte: NASA Science (Sun)' },
    ] },
  { slug: 'car-ver-sem-telescopio-2026-09-21', quando: '2026-09-21T15:00:00.000Z', formato: 'carrossel · lista (salvamento + comentário)',
    legenda: '5 coisas do espaço que dá pra ver sem telescópio. 🔭\n\nNão precisa de equipamento: só céu escuro, paciência e saber o que procurar. A Estação Espacial é a mais fácil de confundir com avião.\n\n💬 Qual dessas você já viu? Comenta o número.\n🔖 Salva pra próxima noite de céu limpo.\n' + segue + '\n\nFonte: NASA\n\n#astronomia #ceunoturno #estrelas #espaco #neuralupdate',
    slides: [
      { tipo: 'capa', img: I + 'pl49-paradoxo-de-fermi_cena1.png', kicker: 'Olho nu', titulo: '5 coisas do espaço que você vê <em>sem telescópio</em>', sub: 'Só precisa de céu escuro. Arrasta.' },
      { tipo: 'astro', astro: 'lua', kicker: '1 · A Lua', titulo: 'Crateras e “mares”', texto: 'As manchas escuras são <strong>planícies de lava antiga</strong>. Perto da meia-lua, as sombras deixam o relevo mais visível.' },
      { tipo: 'astro', astro: 'venus', kicker: '2 · Vênus e Júpiter', titulo: 'As “estrelas” que não piscam', texto: 'Planetas brilham firme, sem cintilar. Vênus é o ponto mais brilhante do céu noturno depois da Lua.' },
      { tipo: 'texto', img: I + 'pl49-paradoxo-de-fermi_cena1.png', kicker: '3 · A nossa galáxia', titulo: 'Uma faixa de leite no céu', texto: 'Longe das luzes da cidade, dá pra ver o disco da <strong>nossa galáxia</strong> atravessando o céu.' },
      { tipo: 'texto', img: I + 'viral-poeira-no-telhado_cena2.png', kicker: '4 · Estrelas cadentes', titulo: 'Poeira pegando fogo', texto: 'Numa noite escura aparecem algumas por hora. Em chuvas de meteoros, bem mais.' },
      { tipo: 'lista', kicker: '5 · A Estação Espacial', titulo: 'Um ponto que cruza o céu sem piscar 🔖', linhas: [['1', 'Lua'], ['2', 'Vênus e Júpiter'], ['3', 'Via Láctea'], ['4', 'Estrelas cadentes'], ['5', 'Estação Espacial']], cta: true, fonte: 'Fonte: NASA (Spot the Station)' },
    ] },
  { slug: 'car-equinocio-primavera-2026-09-22', quando: '2026-09-22T15:00:00.000Z', formato: 'carrossel · aula em slides (salvamento)',
    legenda: 'Hoje à noite começa a primavera no Brasil. 🌱\n\nÉ o equinócio: o Sol fica bem em cima do equador, e o dia e a noite ficam com quase a mesma duração no planeta inteiro.\n\n🔖 Salva pra explicar pra alguém.\n📤 Manda pra quem acha que a estação muda porque a Terra chega mais perto do Sol.\n' + segue + '\n\nFonte: NASA Science\n\n#equinocio #primavera #astronomia #ciencia #neuralupdate',
    slides: [
      { tipo: 'capa', img: I + 'viral-sol-branco_cena1.png', kicker: 'Hoje · 22 de setembro', titulo: 'O que é o <em>equinócio?</em>', sub: 'A primavera começa hoje à noite no Brasil. Arrasta.' },
      { tipo: 'astro', astro: 'terra', kicker: 'O motivo', titulo: 'A Terra é torta', texto: 'O eixo dela é inclinado uns <strong>23 graus</strong>. Ao longo do ano, cada hemisfério recebe mais ou menos luz do Sol.' },
      { tipo: 'astro', astro: 'terra', kicker: 'No equinócio', titulo: 'Luz igual pros dois lados', texto: 'O Sol fica bem em cima do <strong>equador</strong>. Dia e noite duram quase o mesmo em todo o planeta.' },
      { tipo: 'mito', veredito: 'MITO', astro: 'sol-branco', frase: '“A estação muda porque a Terra chega mais perto do Sol.”', texto: 'Não. Quando é verão aqui, é inverno no hemisfério norte, com a <strong>mesma distância</strong> do Sol. Quem manda é a inclinação.' },
      { tipo: 'lista', kicker: 'Resumo pra salvar', titulo: 'Setembro no mundo 🔖', linhas: [['Hemisfério sul', 'começa a primavera'], ['Hemisfério norte', 'começa o outono'], ['Dia × noite', 'quase iguais']], cta: true, fonte: 'Fonte: NASA Science' },
    ] },
  { slug: 'car-de-carro-pelo-sistema-solar-2026-09-23', quando: '2026-09-23T15:00:00.000Z', formato: 'carrossel · calculadora (compartilhamento)',
    legenda: 'Quanto tempo de carro até cada lugar do espaço? 🚗\n\nA conta é a 100 km/h, sem parar nem pra abastecer. A Lua dá uma viagem longa. O resto passa de gerações.\n\n📤 Manda pra quem reclama de viagem de 6 horas.\n🔖 Salva a tabela.\n' + segue + '\n\nFonte: NASA Science\n\n#curiosidades #sistemasolar #astronomia #espaco #neuralupdate',
    slides: [
      { tipo: 'capa', img: I + 'serie-carro-p1-lua_cena1.png', kicker: 'Faça a conta', titulo: 'De <em>carro</em> pelo Sistema Solar', sub: 'A 100 km/h, sem parar. Arrasta.' },
      { tipo: 'numero', astro: 'lua', kicker: 'Até a Lua', numero: '≈ 160 dias', texto: '<strong>384 mil km</strong>. Cinco meses e pouco de estrada.' },
      { tipo: 'numero', astro: 'venus', kicker: 'Até Vênus (no ponto mais perto)', numero: '≈ 43 anos', texto: 'Uns <strong>38 milhões de km</strong>, quando ela passa mais perto da Terra.' },
      { tipo: 'numero', astro: 'marte', kicker: 'Até Marte (no ponto mais perto)', numero: '≈ 62 anos', texto: 'Uns <strong>55 milhões de km</strong>. Uma vida inteira ao volante.' },
      { tipo: 'numero', img: I + 'nw-sol-vira-ana-branca_cena1.png', kicker: 'Até o Sol', numero: '≈ 171 anos', texto: '<strong>150 milhões de km</strong>. Quem saísse no tempo de Dom Pedro II chegaria agora.' },
      { tipo: 'numero', astro: 'jupiter', kicker: 'Até Júpiter (no ponto mais perto)', numero: '≈ 670 anos', texto: 'Uns <strong>588 milhões de km</strong>. Quem saísse em 1356, na Idade Média, chegaria só agora.' },
      { tipo: 'lista', kicker: 'Resumo pra salvar', titulo: 'De carro, a 100 km/h 🔖', linhas: [['Lua', '≈ 160 dias'], ['Vênus', '≈ 43 anos'], ['Marte', '≈ 62 anos'], ['Sol', '≈ 171 anos'], ['Júpiter', '≈ 670 anos'], ['Próxima Centauri', '≈ 46 milhões de anos']], cta: true, fonte: 'Fonte: NASA Science' },
    ] },
  { slug: 'car-feito-de-estrelas-2026-09-24', quando: '2026-09-24T15:00:00.000Z', formato: 'carrossel · aula em slides (salvamento + compartilhamento)',
    legenda: 'Você é feito de pedaços de estrelas. Literalmente. ✨\n\nO hidrogênio do seu corpo veio do começo do universo. O carbono, o oxigênio e o ferro foram fabricados em estrelas que morreram antes do Sol nascer.\n\n📤 Manda pra alguém que precisa ouvir que é poeira de estrela.\n🔖 Salva pra lembrar.\n' + segue + '\n\nFonte: NASA Science\n\n#estrelas #supernova #astronomia #ciencia #neuralupdate',
    slides: [
      { tipo: 'capa', img: I + 'nw-quando-estrela-vira-supernova_cena6.png', kicker: 'Astronomia', titulo: 'Você é feito de <em>estrelas</em>', sub: 'De onde veio cada pedaço do seu corpo. Arrasta.' },
      { tipo: 'texto', img: I + 'pl49-paradoxo-de-fermi_cena1.png', kicker: 'Hidrogênio', titulo: 'Do começo do universo', texto: 'Quase todo o hidrogênio surgiu logo depois do <strong>Big Bang</strong>. Ele está na água do seu corpo.' },
      { tipo: 'texto', img: I + 'nw-sol-vira-ana-branca_cena1.png', kicker: 'Carbono e oxigênio', titulo: 'Fabricados dentro de estrelas', texto: 'A fusão no núcleo das estrelas transforma elementos leves em mais pesados, como o <strong>carbono</strong> e o <strong>oxigênio</strong>.' },
      { tipo: 'texto', img: I + 'nw-quando-estrela-vira-supernova_cena6.png', kicker: 'Ferro e mais pesados', titulo: 'Espalhados por explosões', texto: 'Quando estrelas explodem, esses elementos são jogados no espaço e viram parte de <strong>novas estrelas, planetas e gente</strong>.' },
      { tipo: 'lista', kicker: 'Resumo pra salvar', titulo: 'De onde vem você 🔖', linhas: [['Hidrogênio', 'Big Bang'], ['Carbono', 'estrelas'], ['Oxigênio', 'estrelas'], ['Ferro', 'estrelas que morreram']], cta: true, fonte: 'Fonte: NASA Science' },
    ] },
];
for (const p of posts) {
  const nome = p.quando.slice(0, 10) + '-' + p.slug.replace(/^(car|post)-/, '').replace(/-2026-09-\d\d$/, '') + '.json';
  fs.writeFileSync(path.join(__dirname, 'posts', nome), JSON.stringify(p, null, 1));
  console.log(nome);
}
