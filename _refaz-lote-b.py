# -*- coding: utf-8 -*-
"""Refaz os 3 Shorts de 16/ago pelo PLAYBOOK-SHORTS (mesmo molde do v40 aprovado).

Correções em relação ao que eu tinha escrito:
  · v42 abria com NÚMERO ("Cem trilhões de partículas") — o playbook lista isso como
    o padrão de pior desempenho em skip. Agora abre com substantivo + mistério.
  · faltava BORDÃO nos três e PIVÔ POÉTICO nos três.
  · notícia volta pro alvo de 40-54s em vez dos 35-43s que eu tinha inventado.
"""
import io, os

V = {
'nw-lua-nova-urano': dict(cues=[
    "Uma lua inteira escondida", "Uma equipe apontou o", "Pra comparar é do",
    "Ela orbita a cinquenta", "O ano dela dura", "A Voyager passou por"],
 roteiro="""Uma lua inteira escondida, e ela estava ali o tempo todo.

Uma equipe apontou o James Webb pra Urano e achou uma lua de oito a dez quilômetros.

Pra comparar: é do tamanho de uma cidade média.

Ela orbita a cinquenta e sete mil quilômetros do centro de Urano e completa uma volta a cada nove horas e meia.

O ano dela dura menos que o seu dia de trabalho.

A Voyager passou por Urano em mil novecentos e oitenta e seis e não viu. Quarenta anos depois, o mesmo planeta ainda tem coisa nova pra mostrar.

Neural Update. O universo está te esperando."""),

'vsl18-luz-que-nunca-chega': dict(cues=[
    "Tem luz viajando agora", "O universo está se", "Passando de um certo",
    "Aquela luz saiu e", "Existem galáxias reais com", "Você nasceu com um"],
 roteiro="""Tem luz viajando agora que nunca vai chegar até você. E não é questão de esperar mais.

O universo está se expandindo, e quanto mais longe a galáxia, mais rápido ela foge.

Passando de um certo limite, o espaço entre nós cresce mais rápido do que a luz consegue vencer.

Aquela luz saiu e está perdendo a corrida. Vai viajar pra sempre sem chegar.

Existem galáxias reais, com estrelas reais, que nenhum ser humano jamais vai ver.

Você nasceu com um horizonte, e ele está encolhendo.

Eu abro isso no ebook O Lado Sombrio do Universo. Link na bio.

Neural Update. O universo está te esperando."""),

'v42-neutrinos-atravessando': dict(cues=[
    "Alguma coisa do Sol", "Elas se chamam neutrinos", "Passam pelo seu corpo",
    "E aqui está a", "À noite eles continuam", "O seu corpo é"],
 roteiro="""Alguma coisa do Sol está atravessando o seu corpo agora, e não é a luz.

Elas se chamam neutrinos. Nascem no núcleo do Sol e quase não interagem com matéria nenhuma.

Passam pelo seu corpo, pelo chão, pelo planeta inteiro, e saem do outro lado sem tocar em nada.

E aqui está a parte que me pega: isso não para à noite.

À noite eles continuam chegando, só que vindo de baixo, depois de atravessar a Terra inteira pra te encontrar.

O seu corpo é tão vazio, no fundo, que essa chuva nem percebe você.

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
