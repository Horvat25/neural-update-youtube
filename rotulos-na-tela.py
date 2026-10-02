"""rotulos-na-tela.py — 1 a 3 destaques grandes na tela, no segundo exato em que a palavra é falada.

POR QUE (02/10/2026, Marcelo): "colocar poucas coisas na tela… quando falar graus, colocar o número
em graus; no máximo 3, entre 1 e 3, algo que mostre visualmente e deixe a mente mais concentrada".

Uso (depois do _monta-flow.js):
    python rotulos-na-tela.py <slug>

Lê exports/<slug>/rotulos.txt — uma linha por destaque, no máximo 3:
    quatrocentos | 460 °C
    duzentos     | −180 °C
A palavra da esquerda é a palavra FALADA (a 1ª ocorrência no roteiro, sem acento/maiúscula importar).
O tempo vem do captions.ass: cada linha "Dialogue" destaca UMA palavra, na ordem da fala.
Guarda o vídeo sem destaques em exports/<slug>/_sem-rotulo.mp4 (rodar de novo parte dele, não empilha).
"""
import json, re, shutil, subprocess, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).parent
FF = subprocess.run(['node', '-e', "console.log(require('ffmpeg-static'))"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
FONTE = 'C\\:/Windows/Fonts/segoeuib.ttf'
DUR = 2.6          # segundos na tela
CORTE_VOZ = 0.08   # o _monta-flow corta ~80 ms de padding do MP3 quando FALA_ATRASO_MS=0

def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    return re.sub(r'[^a-z0-9]', '', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))

def main(slug):
    d = ROOT / 'exports' / slug
    rot = [l.split('|', 1) for l in (d / 'rotulos.txt').read_text(encoding='utf-8').splitlines() if '|' in l]
    if not 1 <= len(rot) <= 3:
        sys.exit('rotulos.txt precisa ter de 1 a 3 linhas "palavra | texto"')
    tempos = []
    for l in (d / 'captions.ass').read_text(encoding='utf-8').splitlines():
        m = re.match(r'^Dialogue: \d+,(\d+):(\d+):([\d.]+),', l)
        if m: tempos.append(int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]))
    palavras = [norm(w) for w in (d / 'roteiro.txt').read_text(encoding='utf-8').replace('>>', ' ').split()]
    palavras = [w for w in palavras if w]
    base = d / '_sem-rotulo.mp4'
    final = d / f'{slug}.mp4'
    if not base.exists():
        shutil.copy2(final, base)
    filtros, log = [], []
    for i, (gatilho, texto) in enumerate(rot, 1):
        alvo = norm(gatilho)
        idx = next((k for k, w in enumerate(palavras) if w == alvo), None)
        if idx is None or idx >= len(tempos):
            sys.exit(f'palavra "{gatilho.strip()}" não encontrada no roteiro/legenda')
        a = max(0.0, tempos[idx] - CORTE_VOZ)
        b = a + DUR
        arq = d / f'_rotulo{i}.txt'
        arq.write_text(texto.strip(), encoding='utf-8')
        alpha = f"if(lt(t,{a:.2f}+0.2),(t-{a:.2f})/0.2,if(gt(t,{b:.2f}-0.25),({b:.2f}-t)/0.25,1))"
        filtros.append(f"drawtext=fontfile='{FONTE}':textfile='_rotulo{i}.txt':fontsize=150:fontcolor=white:"
                       f"borderw=8:bordercolor=black@0.9:shadowcolor=black@0.6:shadowx=4:shadowy=4:"
                       f"x=(w-text_w)/2:y=h*0.34:enable='between(t,{a:.2f},{b:.2f})':alpha='{alpha}'")
        log.append(f'{texto.strip()} em {a:.2f}s')
    tmp = d / '_com-rotulo.mp4'
    r = subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y', '-i', base.name, '-vf', ','.join(filtros),
                        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy', tmp.name], cwd=d)
    if r.returncode:
        sys.exit('ffmpeg falhou')
    tmp.replace(final)
    print('✓ destaques:', ' · '.join(log))

if __name__ == '__main__':
    main(sys.argv[1])
