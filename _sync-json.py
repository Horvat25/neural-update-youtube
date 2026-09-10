# -*- coding: utf-8 -*-
"""Sobe pro JSON do lote o roteiro que está em disco.

O JSON tem que ser a FONTE DA VERDADE: se alguém rodar `lote-spec.js` de novo
(pra recuperar um meta.json, por exemplo), ele reescreve o roteiro.txt a partir
do JSON. Com o JSON desatualizado, isso desfaz os cortes de duração em silêncio.
"""
import io, json, os

for f in ('lotes/14-16-ago.json', 'lotes/17-20-ago.json'):
    d = json.load(io.open(f, encoding='utf-8'))
    mudou = 0
    for it in d:
        p = os.path.join('exports', it['slug'], 'roteiro.txt')
        if not os.path.exists(p):
            continue
        disco = io.open(p, encoding='utf-8').read().strip()
        if disco and disco != 'undefined' and disco != it['roteiro'].strip():
            it['roteiro'] = disco
            mudou += 1
    io.open(f, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    print('%s: %d roteiro(s) atualizado(s)' % (f, mudou))
