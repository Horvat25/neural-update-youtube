# -*- coding: utf-8 -*-
"""Refaz o primeiro Short pelo PLAYBOOK-SHORTS — modelo pro Marcelo julgar.

O que muda em relação ao que eu tinha escrito (e que ele reprovou):
  · BORDÃO no fim — obrigatório em 100% dos vídeos, era o que faltava.
  · PIVÔ POÉTICO na penúltima frase (perspectiva cósmica + pertencimento).
  · Duração de NOTÍCIA: 40-54s. Antes eu tinha espremido pra 42 e mutilado o fecho.
  · Abertura: substantivo concreto nomeando o objeto novo — sem "Existe", sem número.
  · LOOP: abre em "um planeta que ninguém viu" e fecha em "não olhando pra eles".
  · MAS/PORTANTO: o conflito ("ele se esconde no brilho") segura o meio do vídeo.

As 6 imagens já existem — só mudou a ORDEM, pra cada uma cair no substantivo que a
narração diz naquele segundo. Zero crédito gasto.
"""
import io, os, re

DIR = os.path.join('exports', 'nw-beta-pictoris-d')

ROTEIRO = """Um planeta que ninguém nunca viu. E mesmo assim a gente sabe que ele está lá, a sessenta e três anos-luz daqui, com o dobro da massa de Júpiter.

O problema é que ele se esconde no brilho da própria estrela. Nenhum telescópio consegue tirar uma foto dele.

Então os astrônomos fizeram outra coisa. Pegaram a luz que vem daquele sistema e abriram ela como um leque. Cada substância deixa uma marca própria ali dentro.

E apareceram três marcas que não deviam estar num sistema vazio: monóxido de carbono, vapor de água e metano. Estrela nenhuma produz essa mistura sozinha. Só atmosfera produz.

Eles não viram o planeta. Sentiram o cheiro dele.

É assim que a gente vai conhecendo os vizinhos: não olhando pra eles, mas aprendendo a ler o que eles deixam no ar.

Neural Update. O universo está te esperando."""

CUES = [
    "Um planeta que ninguém",     # o planeta escondido no brilho (clímax visual)
    "O problema é que",           # o quadro vazio do telescópio
    "Então os astrônomos fizeram",# a luz aberta em espectro
    "E apareceram três marcas",   # as três assinaturas químicas
    "Eles não viram o",           # o planeta revelado pela química
    "É assim que a",              # o sistema inteiro, perspectiva cósmica
]

# ordem nova das imagens (índice antigo, 1-based) -> nova posição
ORDEM = [1, 3, 4, 5, 6, 2]

PROMPTS_ANTIGOS = [l.strip() for l in io.open(os.path.join(DIR, 'prompts.txt'), encoding='utf-8') if l.strip()]

# renomeia em duas etapas pra não colidir
for i, velho in enumerate(ORDEM, start=1):
    os.rename(os.path.join(DIR, 'img%d.png' % velho), os.path.join(DIR, 'tmp%d.png' % i))
for i in range(1, len(ORDEM) + 1):
    os.rename(os.path.join(DIR, 'tmp%d.png' % i), os.path.join(DIR, 'img%d.png' % i))

io.open(os.path.join(DIR, 'roteiro.txt'), 'w', encoding='utf-8').write(ROTEIRO.strip() + '\n')
io.open(os.path.join(DIR, 'cues.txt'), 'w', encoding='utf-8').write('\n'.join(CUES) + '\n')
io.open(os.path.join(DIR, 'prompts.txt'), 'w', encoding='utf-8').write(
    '\n'.join(PROMPTS_ANTIGOS[v - 1] for v in ORDEM) + '\n')

mp4 = os.path.join(DIR, 'nw-beta-pictoris-d.mp4')
if os.path.exists(mp4):
    os.remove(mp4)

print('roteiro: %d palavras' % len(ROTEIRO.split()))
print('imagens reordenadas, mp4 antigo removido')
