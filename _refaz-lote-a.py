# -*- coding: utf-8 -*-
"""Refaz os 5 Shorts de 14-15/ago pelo PLAYBOOK-SHORTS.

Molde aprovado pelo Marcelo no nw-beta-pictoris-d:
  · duração POR FORMATO: notícia 40-54s · viral existencial 34-44s · aula ~35-40s
  · abertura: substantivo concreto (notícia) ou "você" + afirmação incompleta (viral)
    — nunca número, nunca "Existe uma..."
  · MAS no meio (o conflito que mantém o loop aberto)
  · PIVÔ POÉTICO na penúltima frase
  · BORDÃO no fim, em 100% dos vídeos
  · loop fechado: a última frase conversa com a primeira
  · aula fecha anunciando a próxima com dia, data e hora, e SÓ DEPOIS o bordão
As imagens são as que já existem; as deixas foram escritas pra cair na ordem delas.
"""
import io, os

V = {
'vsl17-materia-escura': dict(cues=[
    "A matéria que forma", "O resto é invisível", "A gente sabe que",
    "Com a matéria visível", "Alguma coisa que não", "Você mora dentro da"],
 roteiro="""A matéria que forma você e tudo que dá pra ver é a minoria do universo.

O resto é invisível. Não emite luz, não reflete, não absorve. E está atravessando o seu corpo agora.

A gente sabe que existe por um detalhe: as galáxias giram rápido demais.

Com a matéria visível, elas já teriam se despedaçado.

Alguma coisa que não dá pra ver segura cada uma inteira.

Você mora dentro da exceção. O universo é feito de outra coisa.

Eu abro isso no ebook O Lado Sombrio do Universo. Link na bio.

Neural Update. O universo está te esperando."""),

'v40-mais-perto-do-espaco': dict(cues=[
    "Você está mais perto", "A fronteira oficial começa", "Isso é uma hora",
    "Se existisse uma estrada", "A coisa mais distante", "Só que fica na"],
 roteiro="""Você está mais perto do espaço do que da praia.

A fronteira oficial começa a cem quilômetros de altitude. Direto pra cima.

Isso é uma hora de carro. Menos que a distância até a maioria das capitais.

Se existisse uma estrada vertical saindo da sua janela, você chegaria no espaço antes do mar.

A coisa mais distante da nossa imaginação é a mais próxima de você que existe.

Só que fica na única direção que ninguém olha.

Neural Update. O universo está te esperando."""),

'nw-arco-gravitacional': dict(cues=[
    "Um arco de luz", "Entre ela e a", "E espaço entortado desvia",
    "A luz dela saiu", "Ninguém construiu esse telescópio", "E ele mostra um"],
 roteiro="""Um arco de luz esticado no céu, e ele é uma galáxia inteira deformada.

Entre ela e a Terra tem um aglomerado tão pesado que entorta o espaço em volta.

E espaço entortado desvia a luz. O aglomerado virou uma lente natural.

A luz dela saiu há nove bilhões de anos e chegou aqui esticada num arco, sete vezes mais brilhante.

Ninguém construiu esse telescópio. A gravidade construiu.

E ele mostra um pedaço do passado que nenhum instrumento nosso alcançaria sozinho.

Neural Update. O universo está te esperando."""),

'pl17-escada-cosmica-2': dict(cues=[
    "Como medir a distância", "A escola ensina triangulação", "Pra longe existem estrelas",
    "Sabendo o brilho verdadeiro", "É como julgar um", "Na próxima aula como"],
 roteiro="""Como medir a distância de uma estrela que ninguém vai visitar?

A escola ensina triangulação. Só funciona pras vizinhas.

Pra longe, existem estrelas que piscam num ritmo constante, e o ritmo revela o brilho real delas.

Sabendo o brilho verdadeiro e vendo o que chega aqui, a diferença dá a distância.

É como julgar um farol pela força da luz.

Na próxima aula: como descobrimos que o universo se expande. Segunda, dia dezessete, às duas.

Neural Update. O universo está te esperando."""),

'v41-nunca-tocou-em-nada': dict(cues=[
    "Você nunca tocou em", "Encosta a mão na", "Os elétrons da sua",
    "O que você chama", "Todo abraço que você", "E mesmo assim funcionou"],
 roteiro="""Você nunca tocou em nada na vida. Nem uma vez.

Encosta a mão na mesa. Você sente? Não sente.

Os elétrons da sua pele e os da mesa têm a mesma carga. Carga igual empurra carga igual, e eles se repelem antes de encostar.

O que você chama de toque é o seu cérebro traduzindo essa força em sensação.

Todo abraço que você já deu foi um campo elétrico empurrando outro, num vão pequeno demais pra notar.

E mesmo assim funcionou.

Neural Update. O universo está te esperando."""),
}

for slug, d in V.items():
    p = os.path.join('exports', slug)
    io.open(os.path.join(p, 'roteiro.txt'), 'w', encoding='utf-8').write(d['roteiro'].strip() + '\n')
    io.open(os.path.join(p, 'cues.txt'), 'w', encoding='utf-8').write('\n'.join(d['cues']) + '\n')
    mp4 = os.path.join(p, slug + '.mp4')
    if os.path.exists(mp4):
        os.remove(mp4)
    print('%-28s %3d palavras' % (slug, len(d['roteiro'].split())))
