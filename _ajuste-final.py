# -*- coding: utf-8 -*-
"""Último ajuste de duração: 7 dos 21 passaram do alvo do formato deles.
Todo corte sai de texto ENTRE as deixas — nenhuma deixa foi tocada."""
import io, os

T = {
'pl17-escada-cosmica-2': [
    ('A escola ensina triangulação. Isso funciona só pras vizinhas.', 'A escola ensina triangulação. Só serve pras vizinhas.'),
    ('cefeidas, que ficam mais brilhantes e mais fracas num ritmo constante', 'cefeidas, que piscam num ritmo constante'),
    ('quanto mais devagar a estrela pisca, mais potente ela é de verdade. O ritmo entrega o brilho real dela.',
     'quanto mais devagar ela pisca, mais potente ela é. O ritmo entrega o brilho real.')],
'nw-buraco-negro-errante-2026': [
    ('e foi despedaçada. O clarão entregou a posição.', 'e foi despedaçada.'),
    ('com uma inteligência artificial treinada pra reconhecer esse brilho', 'com uma inteligência artificial treinada pra esse brilho')],
'pl18-universo-em-expansao': [
    ('a gente aprendeu a medir a distância de uma galáxia', 'a gente aprendeu a medir distância de galáxia'),
    ('É a mesma coisa da sirene que muda de tom quando o carro passa por você.', 'É a sirene que muda de tom quando o carro passa.'),
    ('mediu dezenas de galáxias e comparou. Quanto mais longe', 'mediu dezenas de galáxias. Quanto mais longe'),
    ('de onde saiu o número treze vírgula oito', 'de onde saiu o treze vírgula oito')],
'v43-mais-rapido-que-astronauta': [
    ('vinte e oito mil quilômetros por hora, e isso já parece absurdo.', 'vinte e oito mil quilômetros por hora.'),
    ('quase quatro vezes mais rápido que o astronauta que te impressiona', 'quase quatro vezes mais rápido que ele'),
    ('tudo em volta vai junto, na mesma velocidade', 'tudo em volta vai junto')],
'pl19-idade-do-universo': [
    ('Mediram de novo por outra estrada: a radiação que sobrou do Big Bang.', 'Mediram de novo pela radiação que sobrou do Big Bang.'),
    ('Se tudo está se separando, tudo já esteve junto', 'Se tudo se separa, tudo já esteve junto'),
    ('E as duas contas bateram. É por isso que esse número é confiável.', 'E as duas contas bateram. Por isso o número é confiável.')],
'v45-centro-do-universo': [
    ('a expansão não tem ponto de origem', 'a expansão não tem origem'),
    ('De onde você olhar, tudo parece se afastar de você', 'De onde você olhar, tudo se afasta de você'),
    ('Essa bolha é o seu universo observável, e você está no meio dela.', 'Essa bolha é o seu universo observável.'),
    ('está no meio da dela. Todo mundo é o centro. Ninguém é.', 'está no centro da dela. Todo mundo é. Ninguém é.')],
'v46-toneladas-de-ar': [
    ('O ar está te esmagando neste momento, e você não sente nada.', 'O ar está te esmagando agora, e você não sente.'),
    ('uma coluna de dezenas de quilômetros, indo até onde a atmosfera acaba', 'uma coluna de dezenas de quilômetros de altura'),
    ('Todo esse peso está te empurrando pra baixo agora: quase uma tonelada só nos seus ombros.',
     'Todo esse peso está te empurrando pra baixo: quase uma tonelada nos ombros.'),
    ('empurra de volta com exatamente a mesma força', 'empurra de volta com a mesma força'),
    ('Você vive num empate permanente e não sente nenhum dos dois lados.', 'Você vive num empate permanente.'),
    ('E quando esse empate se quebra, quando a pressão de fora some, o seu corpo ganha.',
     'E quando esse empate se quebra, o seu corpo ganha.')],
}

for slug, pares in T.items():
    p = os.path.join('exports', slug, 'roteiro.txt')
    t = io.open(p, encoding='utf-8').read()
    antes = len(t.split())
    for a, b in pares:
        if a not in t:
            print('  !! não achei em %s: "%s"' % (slug, a[:50]))
        t = t.replace(a, b)
    io.open(p, 'w', encoding='utf-8').write(t)
    mp4 = os.path.join('exports', slug, slug + '.mp4')
    if os.path.exists(mp4):
        os.remove(mp4)
    print('%-30s %d -> %d palavras' % (slug, antes, len(t.split())))
