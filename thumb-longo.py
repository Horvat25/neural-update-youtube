# -*- coding: utf-8 -*-
"""
thumb-longo.py — monta a thumbnail 16:9 de um vídeo longo a partir de uma
imagem gerada, queimando 2-3 palavras gigantes.

  python thumb-longo.py <img_base.png> <saida.jpg> "TEXTO" [posicao]
  posicao: dir (default) | esq | centro

POR QUE ASSIM (medido 29/07/2026): o longo da Lua tem 5.200 impressões e CTR de
2,6% — abaixo da média do mercado (4-6%). E o YouTube o sugere ao lado de
documentário de curiosidade (Krakatoa, tubarão, velociraptor), não de canal de
astronomia. Capa escura e sóbria desaparece nesse feed. Daí a régua:
  · 2 a 3 palavras no MÁXIMO, altura da letra ~1/6 da altura da capa
  · contorno preto grosso (legível em cima de qualquer coisa)
  · vinheta escura no lado do texto pra cravar o contraste
  · nada de subtítulo, nada de terceira linha
Ver a memória `analises-obrigatorias-marcelo`.
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

src, out, texto = sys.argv[1], sys.argv[2], sys.argv[3]
pos = sys.argv[4] if len(sys.argv) > 4 else 'dir'

W, H = 1280, 720
im = Image.open(src).convert('RGB')

# recorte 16:9. Numa base vertical, ancora embaixo do centro: é onde a
# composição costuma ter o objeto grande em cima e o contraste embaixo.
alvo = W / H
if im.width / im.height < alvo:
    novo_h = int(im.width / alvo)
    topo = int((im.height - novo_h) * 0.55)          # 55% = abaixo do centro
    im = im.crop((0, topo, im.width, topo + novo_h))
else:
    novo_w = int(im.height * alvo)
    esq = (im.width - novo_w) // 2
    im = im.crop((esq, 0, esq + novo_w, im.height))
im = im.resize((W, H), Image.LANCZOS)

# vinheta só do lado do texto — dá contraste sem escurecer a imagem toda
grad = Image.new('L', (W, H), 0)
gd = ImageDraw.Draw(grad)
for x in range(W):
    t = x / W
    v = int(200 * max(0, (t - 0.35) / 0.65)) if pos == 'dir' else \
        int(200 * max(0, (0.65 - t) / 0.65)) if pos == 'esq' else 0
    gd.line([(x, 0), (x, H)], fill=v)
if pos != 'centro':
    im = Image.composite(Image.new('RGB', (W, H), (0, 0, 0)), im, grad.filter(ImageFilter.GaussianBlur(40)))

d = ImageDraw.Draw(im)
palavras = texto.split()
linhas = [' '.join(palavras[:len(palavras) // 2 or 1]), ' '.join(palavras[len(palavras) // 2 or 1:])] \
    if len(palavras) > 1 else [texto]
linhas = [l for l in linhas if l]

FONTE = r'C:\Windows\Fonts\arialbd.ttf'
# acha o maior corpo que caiba: letra de ~1/6 da altura é o que se lê em miniatura
tam = 200
while tam > 40:
    f = ImageFont.truetype(FONTE, tam)
    larg = max(d.textbbox((0, 0), l, font=f)[2] for l in linhas)
    alt = sum(d.textbbox((0, 0), l, font=f)[3] for l in linhas) * 1.12
    if larg <= W * 0.52 and alt <= H * 0.62:
        break
    tam -= 4
f = ImageFont.truetype(FONTE, tam)

alt_l = [d.textbbox((0, 0), l, font=f)[3] for l in linhas]
total = sum(alt_l) * 1.12
y = (H - total) / 2
for i, l in enumerate(linhas):
    b = d.textbbox((0, 0), l, font=f)
    x = W * 0.94 - b[2] if pos == 'dir' else W * 0.06 if pos == 'esq' else (W - b[2]) / 2
    # contorno grosso: 14 passadas em volta = legível sobre qualquer fundo
    for dx in range(-7, 8, 2):
        for dy in range(-7, 8, 2):
            d.text((x + dx, y + dy), l, font=f, fill=(0, 0, 0))
    d.text((x, y), l, font=f, fill=(255, 228, 0))
    y += alt_l[i] * 1.12

im.save(out, 'JPEG', quality=92)
print('thumb:', out, im.size, round(os.path.getsize(out) / 1024), 'KB')
