# -*- coding: utf-8 -*-
"""Refaz os 12 Shorts de 17-20/ago + a aula pl17, pelo PLAYBOOK-SHORTS.

NOVO NA AULA (pedido do Marcelo, 13/08 — "senti que metade do vídeo era ela falando
o bordão e a próxima aula, e muito pouco conteúdo"):
  · SEM BORDÃO em aula. Ele decidiu isso pra o vídeo não inchar. (Sobrepõe a regra
    do playbook de "bordão em 100%" — decisão do dono vale mais.)
  · O anúncio da próxima aula sai ACELERADO, marcado com ">>" no roteiro. É recado,
    não conteúdo — passa rápido e devolve segundos pro ensino.
  · Mais conteúdo por vídeo: a explicação ganha o espaço que o recado perdeu.

Nos demais formatos: bordão no fim, pivô poético antes dele, abertura com substantivo
concreto (notícia) ou "você" (viral), nunca número no primeiro segundo.
"""
import io, os

V = {
# ---------------- 17/ago
'nw-buraco-negro-errante-2026': dict(cues=[
    "Todo buraco negro supermassivo", "Astrônomos acharam um a", "E ele estava invisível",
    "Só apareceu porque uma", "Quem viu foi um", "Ou seja existem monstros"],
 roteiro="""Todo buraco negro supermassivo mora no centro da galáxia dele. Esse não.

Astrônomos acharam um a trinta mil anos-luz do núcleo, vagando pela periferia.

E ele estava invisível: adormecido, sem comer nada, sem emitir luz nenhuma.

Só apareceu porque uma estrela passou perto demais e foi despedaçada. O clarão entregou a posição.

Quem viu foi um telescópio que varre o céu toda noite, com uma inteligência artificial treinada pra reconhecer esse brilho.

Ou seja: existem monstros desse tamanho vagando por aí, e a gente só descobre quando eles comem alguma coisa.

Neural Update. O universo está te esperando."""),

'pl18-universo-em-expansao': dict(voz='female', cues=[
    "Como alguém descobriu que", "Na aula passada a", "A resposta veio da",
    "Edwin Hubble mediu dezenas", "Isso não é galáxia", "Na próxima aula de"],
 roteiro="""Como alguém descobriu que o universo inteiro está crescendo?

Na aula passada a gente aprendeu a medir a distância de uma galáxia.

A resposta veio da cor. Quando uma fonte de luz se afasta, a onda dela chega esticada, mais pro vermelho. É a mesma coisa da sirene que muda de tom quando o carro passa por você.

Edwin Hubble mediu dezenas de galáxias e comparou. Quanto mais longe, mais rápido se afastando.

Isso não é galáxia correndo pelo espaço. É o espaço crescendo entre elas.

>> Na próxima aula: de onde saiu o número treze vírgula oito bilhões de anos. Quarta, dia dezenove, às duas."""),

'v43-mais-rapido-que-astronauta': dict(cues=[
    "Você é mais rápido", "A Estação Espacial corre", "Só que a Terra",
    "Ou seja você está", "A diferença é que", "Velocidade sem referência não"],
 roteiro="""Você é mais rápido que qualquer astronauta que já existiu. Sentado aí.

A Estação Espacial corre a vinte e oito mil quilômetros por hora, e isso já parece absurdo.

Só que a Terra dá a volta no Sol a cento e sete mil. E você está grudado nela.

Ou seja: você está quase quatro vezes mais rápido que o astronauta que te impressiona.

A diferença é que tudo em volta vai junto, na mesma velocidade.

Velocidade sem referência não existe. É por isso que você jura que está parado.

Neural Update. O universo está te esperando."""),

# ---------------- 18/ago
'nw-gaia-bh3': dict(cues=[
    "Um buraco negro adormecido", "Adormecido quer dizer que", "Então como acharam Por",
    "Alguma coisa muito pesada", "Não dá pra ver", "E é assim que"],
 roteiro="""Um buraco negro adormecido dentro da nossa galáxia, e ele é o mais pesado do tipo já encontrado por aqui. Trinta e três vezes a massa do Sol.

Adormecido quer dizer que ele não está comendo nada. E buraco negro que não come não brilha.

Então como acharam? Por uma estrela companheira que bamboleava de um jeito estranho.

Alguma coisa muito pesada e muito escura estava puxando ela numa órbita torta.

Não dá pra ver o buraco negro. Dá pra ver o que ele faz com quem está do lado.

E é assim que a gente mapeia o escuro: pelo estrago que ele deixa.

Neural Update. O universo está te esperando."""),

'vsl19-chiado-do-big-bang': dict(cues=[
    "Aquele chiado de TV", "Uma parte pequena daquele", "Ela está em todo",
    "Aponte uma antena pra", "Durante décadas milhões de", "Eu abro isso no"],
 roteiro="""Aquele chiado de TV antiga fora do ar tinha o Big Bang dentro.

Uma parte pequena daquele ruído vinha da radiação cósmica de fundo: o calor que sobrou do começo do universo.

Ela está em todo lugar, atravessando tudo, vindo de todas as direções ao mesmo tempo.

Aponte uma antena pra qualquer canto do céu e ela está lá.

Durante décadas, milhões de pessoas ficaram olhando o eco do nascimento do universo achando que a televisão tinha quebrado.

Eu abro isso no ebook O Lado Sombrio do Universo. Link na bio.

Neural Update. O universo está te esperando."""),

'v44-bacterias-vs-estrelas': dict(cues=[
    "A nossa galáxia tem", "O seu corpo carrega", "São cem vezes mais",
    "A galáxia toda cabe", "E a maioria delas", "Você não é uma"],
 roteiro="""A nossa galáxia tem mais estrelas do que você consegue imaginar. Agora olha pra baixo.

O seu corpo carrega cerca de trinta e oito trilhões de bactérias.

São cem vezes mais organismos vivos do que existem estrelas na Via Láctea inteira.

A galáxia toda cabe, em número, dentro de você.

E a maioria delas não é sua inimiga: digerem sua comida e treinam seu sistema imune.

Você não é uma pessoa. Você é um lugar onde muita coisa mora.

Neural Update. O universo está te esperando."""),

# ---------------- 19/ago
'nw-quinteto-jwst': dict(cues=[
    "Cinco galáxias colidindo ao", "A luz dessa cena", "Nessa idade a expectativa",
    "Cinco de uma vez", "E elas estão fabricando", "O universo se montou"],
 roteiro="""Cinco galáxias colidindo ao mesmo tempo, e isso não deveria existir tão cedo.

A luz dessa cena saiu quando o universo tinha uns oitocentos milhões de anos. Bebê.

Nessa idade a expectativa era achar galáxias pequenas, separadas, ainda se montando sozinhas.

Cinco de uma vez, não.

E elas estão fabricando estrelas a duzentas e cinquenta massas solares por ano. A nossa galáxia hoje faz uma ou duas.

O universo se montou muito mais rápido e muito mais violento do que os modelos previam.

Neural Update. O universo está te esperando."""),

'pl19-idade-do-universo': dict(voz='female', cues=[
    "De onde saiu o", "Não foi chute Da", "Então é só rodar",
    "Só que ninguém aceita", "E as duas contas", "Na próxima aula o"],
 roteiro="""De onde saiu o número treze vírgula oito bilhões de anos?

Não foi chute. Da aula passada a gente já sabe a velocidade com que as galáxias se afastam.

Então é só rodar o filme de trás pra frente. Se tudo está se separando, tudo já esteve junto. A conta diz quando.

Só que ninguém aceita um número desses vindo de um caminho só. Mediram de novo por outra estrada: a radiação que sobrou do Big Bang.

E as duas contas bateram. É por isso que esse número é confiável.

>> Na próxima aula: o que existia antes disso tudo. Sexta, dia vinte e um, às duas."""),

'v45-centro-do-universo': dict(cues=[
    "Você está no centro", "O universo se expande", "O espaço inteiro cresce",
    "De onde você olhar", "Você enxerga até uma", "Uma pessoa numa galáxia"],
 roteiro="""Você está no centro do universo. E isso não é poesia, é geometria.

O universo se expande, e a expansão não tem ponto de origem.

O espaço inteiro cresce ao mesmo tempo.

De onde você olhar, tudo parece se afastar de você, em todas as direções.

Você enxerga até uma certa distância. Essa bolha é o seu universo observável, e você está no meio dela.

Uma pessoa numa galáxia distante está no meio da dela. Todo mundo é o centro. Ninguém é.

Neural Update. O universo está te esperando."""),

# ---------------- 20/ago
'nw-terra-teve-aneis': dict(cues=[
    "A Terra pode ter", "Pesquisadores pegaram vinte e", "Todas caíram perto do",
    "Asteroide vindo do espaço", "E logo depois disso", "Tem um documentário de"],
 roteiro="""A Terra pode ter tido anéis como os de Saturno. E a pista está no chão.

Pesquisadores pegaram vinte e uma crateras de um período há uns quatrocentos e sessenta e seis milhões de anos e reconstruíram onde elas caíram.

Todas caíram perto do equador da época. Nenhuma em latitude alta.

Asteroide vindo do espaço bate em qualquer lugar. Chuva concentrada no equador é o padrão de material caindo de um anel.

E logo depois disso a Terra entrou numa das eras glaciais mais severas que já teve.

Tem um documentário de quinze minutos sobre isso aqui no canal.

Neural Update. O universo está te esperando."""),

'vsl20-estrelas-mortas-mentira': dict(cues=[
    "Você já ouviu que", "Quase todas as estrelas", "Elas estão vivas Mas",
    "Você vê cada uma", "O céu que você", "Eu abro isso no"],
 roteiro="""Você já ouviu que as estrelas que você vê no céu já morreram. Isso é mentira.

Quase todas as estrelas visíveis a olho nu estão a menos de mil anos-luz, e estrela vive por bilhões de anos.

Elas estão vivas. Mas tem uma versão verdadeira dessa ideia, e ela é pior.

Você vê cada uma num momento diferente do passado.

O céu que você olha não é um retrato. É uma colagem de milhares de épocas acontecendo ao mesmo tempo na sua cara.

Eu abro isso no ebook O Lado Sombrio do Universo. Link na bio.

Neural Update. O universo está te esperando."""),

'v46-toneladas-de-ar': dict(cues=[
    "O ar está te", "Parece que ar não", "Todo esse peso está",
    "Você não é esmagado", "Você vive num empate", "E quando esse empate"],
 roteiro="""O ar está te esmagando neste momento, e você não sente nada.

Parece que ar não pesa, mas pesa. Acima de você tem uma coluna de dezenas de quilômetros, indo até onde a atmosfera acaba.

Todo esse peso está te empurrando pra baixo agora: quase uma tonelada só nos seus ombros.

Você não é esmagado por um motivo só: o seu corpo empurra de volta com exatamente a mesma força.

Você vive num empate permanente e não sente nenhum dos dois lados.

E quando esse empate se quebra, quando a pressão de fora some, o seu corpo ganha. E aí você incha.

Neural Update. O universo está te esperando."""),

# ---------------- aula 15/ago, refeita com as regras novas
'pl17-escada-cosmica-2': dict(voz='female', cues=[
    "Como medir a distância", "A escola ensina triangulação", "Pra longe existem estrelas",
    "E aqui está o", "Sabendo o brilho real", "Na próxima aula como"],
 roteiro="""Como medir a distância de uma estrela que ninguém vai visitar?

A escola ensina triangulação. Isso funciona só pras vizinhas.

Pra longe, existem estrelas chamadas cefeidas, que ficam mais brilhantes e mais fracas num ritmo constante.

E aqui está o truque: quanto mais devagar a estrela pisca, mais potente ela é de verdade. O ritmo entrega o brilho real dela.

Sabendo o brilho real e vendo o que chega aqui, a diferença dá a distância. É como julgar um farol pela força da luz.

>> Na próxima aula: como descobrimos que o universo se expande. Segunda, dia dezessete, às duas."""),
}

for slug, d in V.items():
    p = os.path.join('exports', slug)
    io.open(os.path.join(p, 'roteiro.txt'), 'w', encoding='utf-8').write(d['roteiro'].strip() + '\n')
    io.open(os.path.join(p, 'cues.txt'), 'w', encoding='utf-8').write('\n'.join(d['cues']) + '\n')
    mp4 = os.path.join(p, slug + '.mp4')
    if os.path.exists(mp4):
        os.remove(mp4)
    print('%-30s %3d palavras%s' % (slug, len(d['roteiro'].split()), '  [aula]' if d.get('voz') else ''))
