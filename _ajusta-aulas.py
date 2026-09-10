# -*- coding: utf-8 -*-
"""Devolver o bordão empurrou as duas aulas pra 45s e 46,5s. O corte sai do
CORPO da explicação, nunca da assinatura da série — o bordão e o anúncio da
próxima aula são o que amarram o curso, e o Marcelo aprovou esse formato."""
import io, json, os

N = {
# 45,21s -> tira "Agora vem o degrau seguinte" (não é deixa, é só ponte)
'pl17-escada-cosmica-2': """Na aula passada a gente mediu estrelas perto, com paralaxe. Existem estrelas chamadas cefeidas que piscam num ritmo constante. E aqui está a mágica: a piscada revela o brilho real dela. Sabendo o brilho real e vendo o aparente, sai a distância. Mais longe ainda, entram as supernovas do tipo um a: explodem sempre com a mesma potência. Na próxima aula: como descobrimos que o universo se expande. Segunda, dia dezessete, às duas. Neural Update. O universo está te esperando.""",

# 46,50s -> enxuga duas frases explicativas, mantém as seis deixas intactas
'pl18-universo-em-expansao': """Com as velas padrão, a gente passou a saber a distância das galáxias. Aí entra a cor. Quando uma fonte se afasta, a luz dela chega mais vermelha. Isso se chama desvio pro vermelho. Edwin Hubble mediu a distância de dezenas de galáxias e comparou com o desvio. Quanto mais longe, mais rápido. Não era movimento no espaço. Era o espaço crescendo. Na próxima aula: de onde saiu o treze vírgula oito bilhões de anos. Quarta, dia dezenove, às duas. Neural Update. O universo está te esperando.""",
}

for slug, txt in N.items():
    io.open(os.path.join('exports', slug, 'roteiro.txt'), 'w', encoding='utf-8').write(txt.strip() + '\n')
    mp4 = os.path.join('exports', slug, slug + '.mp4')
    if os.path.exists(mp4):
        os.remove(mp4)
    print('ajustado:', slug)

for f in ('lotes/14-16-ago.json', 'lotes/17-20-ago.json'):
    d = json.load(io.open(f, encoding='utf-8'))
    for it in d:
        if it['slug'] in N:
            it['roteiro'] = N[it['slug']].strip()
    io.open(f, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('json sincronizado')
