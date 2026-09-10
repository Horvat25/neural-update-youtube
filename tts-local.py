"""
tts-local.py — narração com voz CLONADA, rodando 100% nesta máquina.

    ..\estudio\.venv-chatterbox\Scripts\python.exe tts-local.py <ref.wav> <saida.wav> "texto" [lang]

Motor: Chatterbox Multilingual (Resemble AI), licença MIT — pode uso comercial.
É por isso que ele e não XTTS-v2 / F5-TTS / Fish Speech: nesses três o CÓDIGO é
aberto mas os PESOS são não-comerciais, o que não cobre trabalho de cliente pago.

Roda no venv isolado `estudio/.venv-chatterbox`. NÃO instalar no Python do
sistema: o chatterbox exige torch 2.6 / numpy 1.26 e rebaixaria o ambiente da
holding (que está em torch 2.12 / numpy 2.5).

Sem GPU aqui — é CPU. Gera devagar, então serve pra LOTE, não pra tempo real.
"""
import sys, time, os
import torch, torchaudio

def main():
    if len(sys.argv) < 4:
        print('uso: tts-local.py <ref.wav> <saida.wav> "texto" [lang]')
        return 1
    ref, out, texto = sys.argv[1], sys.argv[2], sys.argv[3]
    lang = sys.argv[4] if len(sys.argv) > 4 else 'pt'

    if not os.path.exists(ref):
        print(f'referencia nao encontrada: {ref}')
        return 1

    torch.set_num_threads(max(1, (os.cpu_count() or 4) - 2))

    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    t0 = time.time()
    print('carregando modelo (1a vez baixa os pesos)...', flush=True)
    model = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
    print(f'  modelo pronto em {time.time()-t0:.1f}s | sr={model.sr}', flush=True)

    t1 = time.time()
    print(f'gerando {len(texto.split())} palavras em "{lang}"...', flush=True)
    wav = model.generate(texto, language_id=lang, audio_prompt_path=ref)
    gerou = time.time() - t1

    torchaudio.save(out, wav, model.sr)
    dur = wav.shape[-1] / model.sr
    print(f'PRONTO: {out}')
    print(f'  audio {dur:.1f}s | gerado em {gerou:.1f}s | {gerou/max(dur,0.01):.1f}x tempo real')
    return 0

if __name__ == '__main__':
    sys.exit(main())
