# -*- coding: utf-8 -*-
"""Acrescenta FONTE e EXTRA a cada item dos lotes, pra legenda do Instagram.

POR QUE (pedido do Marcelo, 13/08): "a legenda tá fraca". Estava mesmo — era a
descrição do vídeo repetida e mais nada. Isso não dá motivo pra ninguém SALVAR, e
salvamento é o sinal mais forte que o Instagram lê.

Dois campos novos:
  fonte — instituição/publicação de onde veio a informação. Credibilidade importa
          num canal de ciência, e é o que separa a gente de página de repost.
  extra — uma informação que NÃO está no vídeo. É o que faz a pessoa salvar:
          ela leu a legenda e levou algo a mais do que assistiu.
"""
import io, json, os

DADOS = {
'nw-beta-pictoris-d': dict(
  fonte='Estudo liderado por Aidan Gibbs, Universidade da Califórnia em San Diego',
  extra='O sistema Beta Pictoris é um dos mais estudados do céu porque é um bebê: tem cerca de 20 milhões de anos, contra os 4,6 bilhões do nosso. É basicamente uma janela para como o Sistema Solar era enquanto ainda estava se montando.'),
'vsl17-materia-escura': dict(
  fonte='Curvas de rotação galáctica medidas por Vera Rubin nos anos 1970',
  extra='Vera Rubin passou décadas sendo ignorada por causa dessa medição. Hoje a matéria escura é consenso, e ela nunca ganhou o Nobel — morreu em 2016, antes de o comitê reconhecer o trabalho.'),
'v40-mais-perto-do-espaco': dict(
  fonte='Linha de Kármán, definida pela Federação Aeronáutica Internacional',
  extra='A NASA usa outro número: 80 km. Por isso alguns pilotos americanos receberam asas de astronauta por voos que, pela régua internacional, nem chegaram ao espaço.'),
'nw-arco-gravitacional': dict(
  fonte='Homer Dávila Gutierrez (SKYCR.ORG), com dados públicos do James Webb',
  extra='Einstein previu esse efeito em 1915 e achou que nunca daria pra observar. A primeira confirmação veio em 1919, num eclipse, e foi o que tornou ele famoso no mundo inteiro da noite pro dia.'),
'pl17-escada-cosmica-2': dict(
  fonte='Relação período-luminosidade descoberta por Henrietta Swan Leavitt, 1912',
  extra='Henrietta Leavitt era paga para catalogar estrelas em placas fotográficas, num cargo que a época chamava de "computador". A descoberta dela é a base de toda medida de distância cósmica até hoje.'),
'v41-nunca-tocou-em-nada': dict(
  fonte='Princípio de exclusão de Pauli e repulsão eletrostática',
  extra='A distância que sobra entre a sua mão e a mesa é de cerca de 1 angstrom — 0,0000000001 metro. É pequena demais pra você perceber, e grande demais pra ser zero.'),
'nw-lua-nova-urano': dict(
  fonte='Equipe de Maryame El Moutamid, com o James Webb (NASA/ESA/CSA)',
  extra='Urano tem 28 luas conhecidas e todas levam nomes de personagens de Shakespeare e Alexander Pope. É o único planeta do Sistema Solar que foge da mitologia greco-romana.'),
'vsl18-luz-que-nunca-chega': dict(
  fonte='Horizonte de eventos cosmológico, modelo ΛCDM',
  extra='Cerca de 94% das galáxias que a gente enxerga hoje já estão fora do nosso alcance para sempre: mesmo viajando na velocidade da luz, nunca chegaríamos nelas.'),
'v42-neutrinos-atravessando': dict(
  fonte='Detecções do Super-Kamiokande (Japão) e do SNO (Canadá)',
  extra='Para capturar neutrinos, o Super-Kamiokande usa um tanque com 50 mil toneladas de água ultrapura, a mil metros de profundidade dentro de uma montanha. Mesmo assim, detecta só algumas dezenas por dia.'),
'nw-buraco-negro-errante-2026': dict(
  fonte='The Astrophysical Journal Letters, com dados do Zwicky Transient Facility (Caltech)',
  extra='Eventos assim se chamam ruptura de maré. Duram meses e depois somem — se ninguém estiver olhando pro lugar certo na hora certa, o buraco negro volta a ser invisível por séculos.'),
'pl18-universo-em-expansao': dict(
  fonte='Edwin Hubble, 1929, Observatório do Monte Wilson',
  extra='O padre e físico belga Georges Lemaître publicou a mesma conclusão dois anos antes de Hubble, em 1927, numa revista pouco lida. Levou décadas até o crédito ser dividido.'),
'v43-mais-rapido-que-astronauta': dict(
  fonte='Velocidade orbital média da Terra: 29,78 km/s (NASA)',
  extra='E ainda tem camada: o Sol arrasta o Sistema Solar a 220 km/s em volta do centro da Via Láctea, e a galáxia inteira corre a mais de 600 km/s pelo Universo. Você está em quatro movimentos ao mesmo tempo.'),
'nw-gaia-bh3': dict(
  fonte='Missão Gaia, Agência Espacial Europeia (ESA)',
  extra='O Gaia mediu a posição de quase 2 bilhões de estrelas com precisão de microssegundo de arco — o equivalente a enxergar uma moeda na Lua. Foi essa precisão que denunciou o bamboleio.'),
'vsl19-chiado-do-big-bang': dict(
  fonte='Descoberta por Penzias e Wilson, Bell Labs, 1964 (Nobel de 1978)',
  extra='Eles passaram meses achando que era defeito da antena. Chegaram a limpar fezes de pombo do equipamento tentando fazer o ruído sumir. O ruído era o Universo.'),
'v44-bacterias-vs-estrelas': dict(
  fonte='Estimativa de 38 trilhões de bactérias — Sender, Fuchs e Milo, 2016',
  extra='O mesmo estudo derrubou um número que se repetia há 40 anos: o de que existiriam 10 bactérias para cada célula humana. A proporção real é de aproximadamente 1 para 1.'),
'nw-quinteto-jwst': dict(
  fonte='Weida Hu e Casey Papovich, Texas A&M University, com o James Webb',
  extra='Formar 250 massas solares por ano é um ritmo absurdo: a Via Láctea inteira, hoje, produz o equivalente a uma ou duas estrelas como o Sol por ano.'),
'pl19-idade-do-universo': dict(
  fonte='Missão Planck (ESA) e medições da constante de Hubble',
  extra='Os dois métodos não batem perfeitamente: a expansão medida hoje dá um valor, e a radiação do Big Bang dá outro um pouco diferente. Isso se chama tensão de Hubble e é um dos maiores problemas em aberto da cosmologia.'),
'v45-centro-do-universo': dict(
  fonte='Princípio cosmológico — homogeneidade e isotropia em larga escala',
  extra='O universo observável tem 93 bilhões de anos-luz de diâmetro, mesmo tendo só 13,8 bilhões de anos. Não é contradição: o espaço se expandiu enquanto a luz viajava.'),
'nw-terra-teve-aneis': dict(
  fonte='Andrew Tomkins e equipe, Universidade Monash, em Earth and Planetary Science Letters',
  extra='O período tem nome: pico de impactos do Ordoviciano. Ele já era conhecido há décadas por outra razão — é quando aparece um excesso enorme de poeira de meteorito nas rochas do mundo inteiro.'),
'vsl20-estrelas-mortas-mentira': dict(
  fonte='Catálogo Hipparcos e dados de paralaxe da missão Gaia (ESA)',
  extra='A estrela mais distante visível a olho nu em boas condições é V762 Cassiopeiae, a cerca de 16 mil anos-luz. Essa sim: a luz dela saiu antes do fim da última era glacial.'),
'v46-toneladas-de-ar': dict(
  fonte='Pressão atmosférica ao nível do mar: 101.325 pascal',
  extra='Foi Evangelista Torricelli quem provou isso em 1643, com um tubo de mercúrio. Na época a ideia de que o ar pesava era tão estranha que ele evitou publicar, com medo da reação da Igreja.'),
}

for f in ('lotes/14-16-ago.json', 'lotes/17-20-ago.json'):
    d = json.load(io.open(f, encoding='utf-8'))
    n = 0
    for it in d:
        extra = DADOS.get(it['slug'])
        if extra:
            it.update(extra)
            n += 1
    io.open(f, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    print('%s: %d item(ns) com fonte e extra' % (f, n))
