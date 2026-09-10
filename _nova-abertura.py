# -*- coding: utf-8 -*-
"""Reescreve a ABERTURA do documentário dos anéis e insere 2 cenas na frente.

POR QUE (crítica do Marcelo, 13/08): "o começo não chamou atenção, eu não senti".
Ele está certo e o PLAYBOOK-LONGOS já dizia: o momento MAIS chocante vai no
primeiro segundo, não na introdução. A abertura antiga era uma condicional lenta
("se você estivesse em Quito...") que levava 15 segundos pra entregar a imagem.

A nova abre com o fato mais forte do vídeo — as 21 cicatrizes no chão — e usa o
resto como promessa. O final continua entregando a PROVA, então o clímax não se
perde: o que muda é que agora existe um motivo pra ficar.
"""
import io, os, re

DIR = os.path.join('exports', 'longo-aneis-terra')
NOVAS = os.path.join('exports', '_abertura-aneis')

ABERTURA = (
    "Existem vinte e uma cicatrizes no chão da Terra, todas caídas na mesma faixa do planeta. "
    "E a explicação mais provável pra elas é que a Terra teve anéis. Como os de Saturno. "
    "A prova está no fim deste vídeo. Mas antes dela, você precisa ver o que um anel faria "
    "com o seu céu. Porque metade do planeta nunca veria."
)
CUES_NOVOS = ["Existem vinte e uma", "E a explicação mais"]
PROMPTS_NOVOS = [l.strip() for l in io.open(os.path.join(NOVAS, 'prompts.txt'), encoding='utf-8') if l.strip()]

# 1) renumera as 70 cenas atuais para 3..72 — de trás pra frente, senão colide
atuais = sorted([f for f in os.listdir(DIR) if re.match(r'^img\d+\.png$', f)],
                key=lambda x: int(re.findall(r'\d+', x)[0]), reverse=True)
for f in atuais:
    n = int(re.findall(r'\d+', f)[0])
    os.rename(os.path.join(DIR, f), os.path.join(DIR, 'img%d.png' % (n + 2)))
print('renumeradas %d cenas -> 3..%d' % (len(atuais), len(atuais) + 2))

# 2) as duas novas viram img1 e img2
for i in (1, 2):
    os.replace(os.path.join(NOVAS, 'img%d.png' % i), os.path.join(DIR, 'img%d.png' % i))
print('img1 e img2 = abertura nova')

# 3) roteiro: a abertura entra ANTES do parágrafo do Quito
rot = io.open(os.path.join(DIR, 'roteiro.txt'), encoding='utf-8').read().lstrip()
if rot.startswith('Existem vinte e uma'):
    raise SystemExit('abertura já aplicada — nada a fazer')
io.open(os.path.join(DIR, 'roteiro.txt'), 'w', encoding='utf-8').write(ABERTURA + '\n\n' + rot)

# 4) cues e prompts ganham as duas linhas na frente
for arq, novos in (('cues.txt', CUES_NOVOS), ('prompts.txt', PROMPTS_NOVOS)):
    p = os.path.join(DIR, arq)
    atual = io.open(p, encoding='utf-8').read().strip()
    io.open(p, 'w', encoding='utf-8').write('\n'.join(novos) + '\n' + atual + '\n')

n_cues = len([l for l in io.open(os.path.join(DIR, 'cues.txt'), encoding='utf-8') if l.strip()])
n_prompts = len([l for l in io.open(os.path.join(DIR, 'prompts.txt'), encoding='utf-8') if l.strip()])
n_imgs = len([f for f in os.listdir(DIR) if re.match(r'^img\d+\.png$', f)])
print('cues=%d  prompts=%d  imagens=%d' % (n_cues, n_prompts, n_imgs))
assert n_cues == n_prompts == n_imgs, 'DESALINHADO — não montar assim'
print('alinhado, pode montar')
