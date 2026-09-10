# -*- coding: utf-8 -*-
"""Faz a troca de imagem cair EXATAMENTE no anúncio do capítulo.

DEFEITO (Marcelo, 13/08, aos 3:54): "a imagem do cara em Marte fica uns 3 segundos
a mais" — a narração já dizia "Número oito. A Lua." e a tela continuava em Marte.

CAUSA: as deixas foram geradas automaticamente pela PAUSA na fala, e a pausa não
cai no anúncio do capítulo — cai onde a frase termina. Resultado: em 9 dos 10
capítulos o anúncio acontecia dentro da cena anterior.

CONSERTO SEM GASTAR CRÉDITO: a imagem de abertura de cada capítulo já existe e já
está no lugar certo da lista — ela só entrava tarde. Aqui a gente move a DEIXA
dela pro anúncio. Nenhuma imagem nova, nenhuma renumeração.

Efeito colateral esperado e desejado: a cena anterior encolhe. Se ficar abaixo do
piso de 5s, o make-longo absorve ela na anterior — que é o comportamento certo.
"""
import io, os

DIR = os.path.join('exports', 'longo-sobrevivencia')

# deixa atual  ->  deixa nova (o anúncio do capítulo)
TROCAS = [
    ('e é o lugar',            'Número dez Titã'),
    ('A pressão em Marte',     'Número nove Marte'),
    ('o ar sai dos',           'Número oito A Lua'),
    ('Plutão Plutão fica tão', 'Número sete Plutão'),
    # 'Número seis Mercúrio Mercúrio' já estava certo
    ('Você não chega Você',    'Número cinco Urano'),
    ('Netuno Netuno é o',      'Número quatro Netuno'),
    ('Saturno é o planeta',    'Número três Saturno'),
    ('Cabem mil e trezentas',  'Número dois Júpiter'),
    ('E não é nem',            'Número um Vênus'),
]

p = os.path.join(DIR, 'cues.txt')
linhas = [l.rstrip('\n') for l in io.open(p, encoding='utf-8')]
trocadas = 0
for de, para in TROCAS:
    for i, l in enumerate(linhas):
        if l.strip() == de:
            linhas[i] = para
            trocadas += 1
            print('%2d: "%s"  ->  "%s"' % (i + 1, de, para))
            break
    else:
        print('!! não achei a deixa "%s"' % de)

io.open(p, 'w', encoding='utf-8').write('\n'.join(l for l in linhas if l.strip()) + '\n')
print('\n%d de %d deixas movidas para o anúncio do capítulo' % (trocadas, len(TROCAS)))
