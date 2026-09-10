# -*- coding: utf-8 -*-
"""Terceiro corte, só nos dois que ficaram acima de 44s depois da remontagem."""
import io, json, os

N = {
# 44,33s -> tira "Faltava saber o que elas faziam." (voz feminina, ~1,6 palavra/s)
'pl18-universo-em-expansao': """Com as velas padrão, a gente passou a saber a distância das galáxias. Aí entra a cor. Quando uma fonte de luz se afasta, a luz chega mais esticada, mais pra vermelha. Isso se chama desvio pro vermelho. Edwin Hubble mediu dezenas de galáxias e comparou com o desvio de cada uma. Quanto mais longe, mais rápido se afastando. Não era movimento no espaço. Era o espaço crescendo. Na próxima aula: de onde saiu o treze vírgula oito bilhões de anos. Quarta, dia dezenove, às duas.""",
# 46,79s -> enxuga três frases sem tocar em nenhuma deixa
'v45-centro-do-universo': """Você está exatamente no centro do universo. E isso não é poesia, é geometria. O universo está se expandindo, e a expansão não tem ponto de origem. O espaço inteiro cresce ao mesmo tempo. O resultado é que tudo parece se afastar de você, em todas as direções. Você enxerga até uma certa distância, e essa bolha é o seu universo observável. E uma pessoa numa galáxia distante está no meio da dela. Todo mundo é o centro. Ninguém é.""",
}

for slug, txt in N.items():
    io.open(os.path.join('exports', slug, 'roteiro.txt'), 'w', encoding='utf-8').write(txt.strip() + '\n')
    mp4 = os.path.join('exports', slug, slug + '.mp4')
    if os.path.exists(mp4):
        os.remove(mp4)
    print('cortado:', slug)

# mantém o JSON como fonte da verdade
for f in ('lotes/14-16-ago.json', 'lotes/17-20-ago.json'):
    d = json.load(io.open(f, encoding='utf-8'))
    for it in d:
        if it['slug'] in N:
            it['roteiro'] = N[it['slug']].strip()
    io.open(f, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('json sincronizado')
