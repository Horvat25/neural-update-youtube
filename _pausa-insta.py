# -*- coding: utf-8 -*-
"""Pausa na fila do Instagram os 21 Shorts do lote 14-20/ago.

Eles foram produzidos sem o PLAYBOOK-SHORTS e vão ser refeitos. No YouTube já
foram estacionados em 2099; aqui o equivalente é tirar do estado 'agendado' —
o `publicar.mjs` só publica o que está 'agendado', então 'pausado' segura sem
apagar o registro.

⚠️ Roda SEMPRE sobre a fila vinda do origin/main. A fila remota é a autoridade:
o workflow escreve o estado de volta a cada rodada.
"""
import io, json, sys

caminho = sys.argv[1]
fila = json.load(io.open(caminho, encoding='utf-8'))

SLUGS = set()
for f in ('lotes/14-16-ago.json', 'lotes/17-20-ago.json'):
    SLUGS |= {i['slug'] for i in json.load(io.open(f, encoding='utf-8'))}

n = 0
for i in fila:
    if i.get('slug') in SLUGS and i.get('status') == 'agendado':
        i['status'] = 'pausado'
        i['motivo'] = 'refazendo pelo PLAYBOOK-SHORTS (bordão, pivô poético, duração por formato)'
        n += 1

# trava: nada que já foi publicado pode ser tocado
publicados = sum(1 for i in fila if i.get('status') == 'publicado')
io.open(caminho, 'w', encoding='utf-8').write(json.dumps(fila, ensure_ascii=False, indent=2) + '\n')
print('%d item(ns) pausado(s) · %d publicado(s) preservado(s) · fila com %d' % (n, publicados, len(fila)))
