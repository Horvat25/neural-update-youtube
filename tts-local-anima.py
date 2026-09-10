"""
tts-local-anima.py — tira o "desanimado" de uma narracao JA GERADA, sem regerar.

    python tts-local-anima.py <narracao.wav> <tempos.json> [fator_pausa] [expansao]

Escreve <narracao>-animada.wav e <narracao>-animada-tempos.json.

POR QUE ISSO E NAO MAIS "exaggeration" (01/08/2026)
Medido com analisa-voz.py, o clone do Guilherme contra a gravacao real dele:

              variacao de tom   dinamica   F0
  ele            1.68 st         11.6 dB   149 Hz
  o clone        2.82 st          9.2 dB   146 Hz

Ou seja: o clone entoa MAIS que ele e no mesmo tom. Subir `exaggeration` ia levar
pra teatral, nao pra animado. Os dois defeitos reais sao:

  1. DINAMICA ACHATADA - 2,4 dB a menos de variacao de volume. Fala empolgada tem
     silaba forte e silaba fraca; o modelo entrega tudo no mesmo nivel.
  2. AR MORTO - 8,7% do arquivo era silencio entre frases. Pausa de leitura, nao
     de conversa. Vendedor animado emenda as frases.

Entao: encurta as pausas e EXPANDE a dinamica (o contrario de comprimir). Nada
disso precisa do modelo -- corta o wav nos limites que o tempos.json ja conhece.
"""
import sys, os, json, subprocess

EST = os.path.dirname(os.path.abspath(__file__))
FFMPEG = os.path.join(EST, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
PAUSA_MIN = 0.12          # abaixo disso as frases colam e fica ofegante


def dur(path):
    out = subprocess.run([FFMPEG, '-i', path, '-hide_banner'], capture_output=True, text=True).stderr
    for linha in out.splitlines():
        if 'Duration' in linha:
            h, m, s = linha.split('Duration:')[1].split(',')[0].strip().split(':')
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise RuntimeError('sem duracao: ' + path)


def main():
    wav, tempos_path = sys.argv[1], sys.argv[2]
    fator = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
    exp = sys.argv[4] if len(sys.argv) > 4 else 'padrao'

    tempos = json.load(open(tempos_path, encoding='utf-8'))
    total = dur(wav)
    tmp = os.path.join(os.path.dirname(os.path.abspath(wav)), '_anima_tmp')
    os.makedirs(tmp, exist_ok=True)

    # 1) corta cada frase no limite que o tempos.json ja conhece
    pedacos, novos, t = [], [], 0.0
    for i, f in enumerate(tempos):
        p = os.path.join(tmp, f'f{i:03d}.wav')
        subprocess.run([FFMPEG, '-y', '-i', wav, '-ss', str(f['inicio']),
                        '-to', str(f['fim']), '-c', 'copy', p, '-loglevel', 'error'], check=True)
        d = f['fim'] - f['inicio']
        novos.append({**f, 'inicio': round(t, 3), 'fim': round(t + d, 3)})
        pedacos.append(p)
        prox = tempos[i + 1]['inicio'] if i + 1 < len(tempos) else total
        pausa = max(PAUSA_MIN, (prox - f['fim']) * fator)
        t += d + (pausa if i + 1 < len(tempos) else 0)
        if i + 1 < len(tempos):
            s = os.path.join(tmp, f's{i:03d}.wav')
            subprocess.run([FFMPEG, '-y', '-f', 'lavfi', '-i',
                            f'anullsrc=r=24000:cl=mono:d={pausa:.3f}',
                            '-c:a', 'pcm_f32le', s, '-loglevel', 'error'], check=True)
            pedacos.append(s)

    lista = os.path.join(tmp, 'lista.txt')
    with open(lista, 'w', encoding='utf-8') as fh:
        for p in pedacos:
            fh.write(f"file '{os.path.basename(p)}'\n")

    saida = wav.replace('.wav', '-animada.wav')
    # 2) LEVANTA O FIM DA FRASE.
    #    O Marcelo ouviu "ele fica com medo de falar, a frase sai meio comida".
    #    Medido: nao e truncamento -- as 13 frases decaem ate o silencio, cauda/media
    #    entre 0.00 e 0.20. E DECLINACAO: o modelo perde energia no fim da frase.
    #    Compressao suave (nao expansao!) levanta a silaba fraca e devolve o final.
    #    A v1 expandia, o que piorava exatamente o defeito que queriamos corrigir.
    curva = ('compand=attacks=0.005:decays=0.12:'
             'points=-80/-72|-45/-33|-30/-24|-18/-15|-6/-5|0/-1:gain=0')
    if exp == 'forte':
        curva = ('compand=attacks=0.005:decays=0.10:'
                 'points=-80/-64|-45/-28|-30/-20|-18/-13|-6/-4|0/-1:gain=0')
    subprocess.run([FFMPEG, '-y', '-f', 'concat', '-safe', '0', '-i', lista,
                    '-af', curva, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_f32le',
                    saida, '-loglevel', 'error'], check=True)

    json.dump(novos, open(saida.replace('.wav', '-tempos.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    for p in os.listdir(tmp):
        os.remove(os.path.join(tmp, p))
    os.rmdir(tmp)
    print(f'{saida}  {dur(saida):.2f}s  (era {total:.2f}s)')


main()
