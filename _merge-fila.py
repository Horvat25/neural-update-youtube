# -*- coding: utf-8 -*-
"""Funde os 21 Shorts novos na fila REMOTA do Instagram.

POR QUE ASSIM (13/08/2026, quase deu ruim): o workflow do GitHub Actions escreve o
estado da fila DE VOLTA no repositório a cada rodada. A cópia local aqui do PC
estava 28 commits atrás e ainda marcava como "agendado" três posts que já tinham
sido publicados. Commitar aquele arquivo teria feito o publicador postar os três
de novo no perfil.

REGRA: a fila remota é a AUTORIDADE. Nunca commitar fila.json sem buscar antes.
Aqui a base é sempre o `origin/main`, e só os slugs INÉDITOS são acrescentados.
"""
import io, json, sys

remota_path, meus_path = sys.argv[1], sys.argv[2]

remota = json.load(io.open(remota_path, encoding='utf-8'))
meus = json.load(io.open(meus_path, encoding='utf-8'))

ja = {i.get('slug') for i in remota if i.get('slug')}
novos = [i for i in meus if i.get('slug') and i['slug'] not in ja]

publicados = [i for i in remota if i.get('status') == 'publicado']
print('fila remota: %d itens (%d já publicados — preservados)' % (len(remota), len(publicados)))
print('acrescentando: %d slug(s) inéditos' % len(novos))

final = remota + novos
final.sort(key=lambda i: i['quando'])

# trava de segurança: nenhum item publicado pode voltar pra "agendado"
for i in final:
    if i.get('slug') in {p.get('slug') for p in publicados} and i.get('status') != 'publicado':
        raise SystemExit('ABORTADO: %s ia perder o status publicado' % i.get('slug'))

io.open(remota_path, 'w', encoding='utf-8').write(json.dumps(final, ensure_ascii=False, indent=2) + '\n')
print('fila final: %d itens, até %s' % (len(final), final[-1]['quando'][:10]))
