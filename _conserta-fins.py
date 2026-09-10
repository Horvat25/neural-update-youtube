# -*- coding: utf-8 -*-
"""Conserta os finais que eu estraguei cortando por número de segundos.

O QUE ACONTECEU (Marcelo, 13/08): "esse de 40 segundos o final dele sem sentido".
Ele estava certo. Eu cortei os 21 roteiros mirando a duração e NÃO reli o texto.
Saiu "Só atmosfera." — que nem é frase — e o remate do fecho foi decepado. Em três
AULAS eu cortei o bordão do canal, que é assinatura de série.

E, pior: em dois vídeos o corte quebrou uma DEIXA. Deixa quebrada não dá erro — o
make-short avisa numa linha e cai pras fatias iguais, ou seja, perde a sincronia
imagem×fala do vídeo inteiro. (Daí nasceu o `confere-cues.js`, que pega isso de
graça e tem que rodar depois de QUALQUER edição de roteiro.)

Regra que passa a valer: cortar duração é reescrever, não podar. Depois de cortar,
ler o texto em voz alta e rodar o confere-cues.
"""
import io, json, os

N = {
# fim virou fragmento ("Só atmosfera.") e repetia "63 anos-luz" à toa
'nw-beta-pictoris-d': """Acharam um planeta novo sem nunca ter visto ele. Ele se chama Beta Pictoris d, fica a sessenta e três anos-luz daqui, e tem o dobro da massa de Júpiter. Só que ninguém fotografou esse planeta. Os astrônomos separaram a luz e procuraram impressões químicas. E encontraram três: monóxido de carbono, vapor de água e metano. Nenhuma estrela produz essa mistura sozinha. Só uma atmosfera produz. Eles sentiram o cheiro dele, e provaram que ele existe.""",

# bordão do canal tinha sido decepado
'pl17-escada-cosmica-2': """Na aula passada a gente mediu estrelas perto, com paralaxe. Agora vem o degrau seguinte. Existem estrelas chamadas cefeidas que piscam num ritmo constante. E aqui está a mágica: a piscada revela o brilho real dela. Sabendo o brilho real e vendo o aparente, sai a distância. Mais longe ainda, entram as supernovas do tipo um a: explodem sempre com a mesma potência. Na próxima aula: como descobrimos que o universo se expande. Segunda, dia dezessete, às duas. Neural Update. O universo está te esperando.""",

# bordão decepado + DEIXA QUEBRADA ("Edwin Hubble mediu a" não existia mais no texto)
'pl18-universo-em-expansao': """Com as velas padrão, a gente passou a saber a distância das galáxias. Aí entra a cor. Quando uma fonte de luz se afasta, ela chega mais esticada, mais vermelha. Isso se chama desvio pro vermelho. Edwin Hubble mediu a distância de dezenas de galáxias e comparou com o desvio delas. Quanto mais longe, mais rápido se afastando. Não era movimento no espaço. Era o espaço crescendo. Na próxima aula: de onde saiu o treze vírgula oito bilhões de anos. Quarta, dia dezenove, às duas. Neural Update. O universo está te esperando.""",

# bordão decepado
'pl19-idade-do-universo': """Todo mundo repete que o universo tem treze vírgula oito bilhões de anos. De onde sai esse número? Da aula passada a gente já sabe a velocidade com que as galáxias se afastam. Então é só rodar o filme de trás pra frente. Se tudo está se separando, tudo já esteve junto. Só que ninguém aceitaria um número desses vindo de um caminho só. Mediram de novo pela radiação que sobrou do Big Bang. E as duas contas bateram. Na próxima aula: o que existia antes disso. Sexta, dia vinte e um, às duas. Neural Update. O universo está te esperando.""",

# terminava numa frase seca de física; o remate tinha sido cortado
'v43-mais-rapido-que-astronauta': """Você é mais rápido que qualquer astronauta que já existiu. Sentado aí. A Estação Espacial Internacional corre a vinte e oito mil quilômetros por hora. Só que a Terra dá a volta no Sol a cento e sete mil quilômetros por hora. E você está grudado nela. Ou seja, você está quase quatro vezes mais rápido que o astronauta. A diferença é que você não sente nada, porque tudo em volta vai junto na mesma velocidade. Velocidade sem referência não existe. É por isso que você jura que está parado.""",

# faltava o remate: por que a gente só descobre esses caras
'nw-buraco-negro-errante-2026': """Buraco negro supermassivo mora no centro da galáxia. Esse aqui não. Astrônomos acharam um a trinta mil anos-luz do centro da galáxia dele. E ele estava invisível, adormecido. Só apareceu porque uma estrela passou perto demais e foi despedaçada. Quem viu foi um telescópio que varre o céu toda noite, com uma inteligência artificial treinada pra reconhecer esse brilho. Ou seja: existem monstros desse tamanho vagando por aí, e a gente só descobre quando eles comem alguma coisa.""",

# DEIXA QUEBRADA ("Aquela luz saiu está") + fecho sem remate
'vsl18-luz-que-nunca-chega': """Existe luz viajando no universo agora que nunca vai chegar até você. Não é questão de esperar. O universo está se expandindo, e quanto mais longe a galáxia, mais rápido ela foge. Passando de um certo limite, o espaço entre nós cresce mais rápido do que a luz. Aquela luz saiu, está perdendo a corrida. Existem galáxias reais, com estrelas reais, que nenhum humano jamais vai ver. O universo é maior que o universo observável. E sempre vai ser.""",
}

for slug, txt in N.items():
    io.open(os.path.join('exports', slug, 'roteiro.txt'), 'w', encoding='utf-8').write(txt.strip() + '\n')
    mp4 = os.path.join('exports', slug, slug + '.mp4')
    if os.path.exists(mp4):
        os.remove(mp4)
    print('consertado:', slug)

# JSON continua sendo a fonte da verdade
for f in ('lotes/14-16-ago.json', 'lotes/17-20-ago.json'):
    d = json.load(io.open(f, encoding='utf-8'))
    for it in d:
        if it['slug'] in N:
            it['roteiro'] = N[it['slug']].strip()
    io.open(f, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('json sincronizado')
