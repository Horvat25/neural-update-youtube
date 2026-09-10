"""
analisa-trilha.py — escolhe trilha por MEDIDA, não por gosto.

    ..\.venv-chatterbox\Scripts\python.exe analisa-trilha.py <voz.wav> <trilha1> <trilha2> ...

O critério que importa numa trilha que vai POR BAIXO de narração não é se ela é
bonita: é quanto ela ocupa a mesma faixa do espectro que a voz. Se ocupa, os dois
brigam — e abaixar o volume não resolve, só deixa tudo abafado.

Mede por faixa:
  • energia na banda da fala (300–3400 Hz) em relação ao total — QUANTO MENOR, MELHOR
  • centroide espectral: onde mora o "brilho" do som
  • variação dinâmica: trilha que oscila muito rouba atenção no meio da frase
  • andamento estimado
"""
import sys, os
import numpy as np
import librosa

FALA_LO, FALA_HI = 300, 3400

def perfil(path, sr=22050, dur=45):
    y, _ = librosa.load(path, sr=sr, mono=True, duration=dur)
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    banda = (freqs >= FALA_LO) & (freqs <= FALA_HI)
    e_total = float(np.sum(S ** 2)) + 1e-9
    e_fala = float(np.sum(S[banda, :] ** 2))
    rms = librosa.feature.rms(y=y, hop_length=512)[0]
    cent = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    try:
        bpm = float(np.atleast_1d(librosa.beat.beat_track(y=y, sr=sr)[0])[0])
    except Exception:
        bpm = float('nan')
    return {
        'fala_pct': 100 * e_fala / e_total,
        'centroide': cent,
        'variacao': float(np.std(rms) / (np.mean(rms) + 1e-9)),
        'bpm': bpm,
    }

def main():
    if len(sys.argv) < 3:
        print('uso: analisa-trilha.py <voz.wav> <trilha1> [trilha2 ...]')
        return 1
    voz, trilhas = sys.argv[1], sys.argv[2:]

    pv = perfil(voz)
    print(f'VOZ ({os.path.basename(voz)})')
    print(f'  energia na banda da fala: {pv["fala_pct"]:.1f}%  | centroide {pv["centroide"]:.0f} Hz')
    print()
    print(f'{"trilha":34} {"banda-fala":>11} {"centroide":>10} {"variacao":>9} {"bpm":>6}')
    print('-' * 76)

    linhas = []
    for t in trilhas:
        p = perfil(t)
        linhas.append((p['fala_pct'], os.path.basename(t), p))
        print(f'{os.path.basename(t):34} {p["fala_pct"]:>10.1f}% {p["centroide"]:>9.0f}Hz '
              f'{p["variacao"]:>9.2f} {p["bpm"]:>6.0f}')

    linhas.sort()
    print()
    print(f'MENOS BRIGA COM A VOZ: {linhas[0][1]} ({linhas[0][0]:.1f}% na banda da fala)')
    return 0

if __name__ == '__main__':
    sys.exit(main())
