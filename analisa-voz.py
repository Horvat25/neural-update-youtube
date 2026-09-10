"""
analisa-voz.py — mede se uma narracao soa ANIMADA ou MORTA, por numero.

    ..\.venv-chatterbox\Scripts\python.exe analisa-voz.py <ref.wav> <a.wav> <b.wav> ...

O agente nao consegue ouvir. "Ficou desanimado" precisa virar medida, senao a
correcao vira tentativa e erro caro. O que o ouvido le como animacao:

  - VARIACAO DE TOM (desvio do F0 em semitons) -> o principal. Fala monotona tem
    desvio baixo; fala expressiva sobe e desce. Abaixo de ~2 st soa robo.
  - EXCURSAO (p90-p10 do F0, em semitons) -> o "tamanho" da melodia da frase.
  - RITMO (silabas/segundo aproximado por picos de energia) -> lento demais cansa.
  - DINAMICA (desvio do RMS em dB) -> fala real varia de volume; comprimida demais
    soa lida.

O ALVO nao e o maximo: e a gravacao ORIGINAL da pessoa. Passar disso soa teatral,
que num dono de loja de bairro fica pior que monotono. Por isso o 1o arquivo e a
referencia e os outros sao comparados contra ela.
"""
import sys
import numpy as np
import librosa


def perfil(path, sr=22050):
    y, _ = librosa.load(path, sr=sr, mono=True)
    y, _ = librosa.effects.trim(y, top_db=32)

    f0, voiced, _ = librosa.pyin(y, sr=sr, fmin=60, fmax=350,
                                 frame_length=1024, hop_length=256)
    f = f0[~np.isnan(f0)]
    if len(f) < 20:
        return None
    st = 12 * np.log2(f / np.median(f))           # semitons em volta da mediana
    excursao = float(np.percentile(st, 90) - np.percentile(st, 10))

    rms = librosa.feature.rms(y=y, hop_length=256)[0]
    rms_db = 20 * np.log10(np.maximum(rms, 1e-6))
    rms_db = rms_db[rms_db > rms_db.max() - 40]   # ignora silencio

    onsets = librosa.onset.onset_detect(y=y, sr=sr, hop_length=256, units='time')
    dur = len(y) / sr

    return {
        'dur': dur,
        'f0_mediano': float(np.median(f)),
        'variacao_st': float(np.std(st)),
        'excursao_st': excursao,
        'ritmo': len(onsets) / dur,
        'dinamica_db': float(np.std(rms_db)),
        'voz_pct': 100.0 * len(f) / len(f0),
    }


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return
    ref = perfil(sys.argv[1])
    print(f"\nREFERENCIA (a pessoa de verdade): {sys.argv[1].split(chr(92))[-1]}")
    print(f"  F0 {ref['f0_mediano']:.0f} Hz | variacao {ref['variacao_st']:.2f} st | "
          f"excursao {ref['excursao_st']:.2f} st | ritmo {ref['ritmo']:.2f}/s | "
          f"dinamica {ref['dinamica_db']:.1f} dB")

    print(f"\n{'arquivo':<38} {'variacao':>9} {'excursao':>9} {'ritmo':>7} {'dinam':>7}   veredito")
    print('-' * 96)
    for p in sys.argv[2:]:
        d = perfil(p)
        if not d:
            print(f"{p.split(chr(92))[-1]:<38}  (curto demais pra medir)")
            continue
        rel = d['variacao_st'] / ref['variacao_st']
        if rel < 0.75:
            v = f"MORTO ({rel*100:.0f}% da expressao dele)"
        elif rel > 1.30:
            v = f"TEATRAL ({rel*100:.0f}%)"
        else:
            v = f"ok ({rel*100:.0f}% dele)"
        print(f"{p.split(chr(92))[-1]:<38} {d['variacao_st']:>8.2f}st {d['excursao_st']:>8.2f}st "
              f"{d['ritmo']:>6.2f}/s {d['dinamica_db']:>6.1f}dB   {v}")


main()
