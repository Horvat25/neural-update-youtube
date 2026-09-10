"""
tts-local-testes.py — bancada de teste da voz clonada local.

Carrega o modelo UMA vez e roda várias combinações, porque cada carga
custa ~50s. Sem isso, testar 4 variações levaria 4 minutos só de load.

    ..\.venv-chatterbox\Scripts\python.exe tts-local-testes.py <ref.wav> <dir_saida> [edge.wav]

Se passar o terceiro argumento, também roda CONVERSÃO DE VOZ (ChatterboxVC):
pega um áudio já narrado (ex.: Edge TTS, que devolve o tempo de cada palavra)
e troca o timbre pelo da referência. É o caminho que dá voz clonada E legenda
karaokê ao mesmo tempo.
"""
import sys, os, time
import torch, torchaudio

TEXTO = "Oi, Marcelinho! Tá funcionando agora, pode relaxar. Aqui é o Guilherme, da Reparum Tech."

# exaggeration = intensidade emocional | cfg_weight = adesão ao texto (baixo = fala mais solta e lenta)
VARIACOES = [
    ("a-padrao",      dict(exaggeration=0.5, cfg_weight=0.5, temperature=0.8)),
    ("b-calmo",       dict(exaggeration=0.3, cfg_weight=0.3, temperature=0.7)),
    ("c-conversa",    dict(exaggeration=0.4, cfg_weight=0.35, temperature=0.75)),
    ("d-firme",       dict(exaggeration=0.6, cfg_weight=0.6, temperature=0.7)),
]

def main():
    if len(sys.argv) < 3:
        print('uso: tts-local-testes.py <ref.wav> <dir_saida> [edge.wav]')
        return 1
    ref, outdir = sys.argv[1], sys.argv[2]
    edge = sys.argv[3] if len(sys.argv) > 3 else None
    os.makedirs(outdir, exist_ok=True)
    torch.set_num_threads(max(1, (os.cpu_count() or 4) - 2))

    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    t0 = time.time()
    print('carregando TTS...', flush=True)
    m = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
    print(f'  ok em {time.time()-t0:.0f}s', flush=True)

    for nome, kw in VARIACOES:
        t = time.time()
        wav = m.generate(TEXTO, language_id='pt', audio_prompt_path=ref, **kw)
        p = os.path.join(outdir, f'var-{nome}.wav')
        torchaudio.save(p, wav, m.sr)
        print(f'  {nome}: {wav.shape[-1]/m.sr:.1f}s audio | {time.time()-t:.0f}s gerando | {kw}', flush=True)

    del m

    if edge and os.path.exists(edge):
        from chatterbox.vc import ChatterboxVC
        t0 = time.time()
        print('carregando VC...', flush=True)
        v = ChatterboxVC.from_pretrained(device='cpu')
        print(f'  ok em {time.time()-t0:.0f}s', flush=True)
        t = time.time()
        wav = v.generate(edge, target_voice_path=ref)
        p = os.path.join(outdir, 'var-e-conversao.wav')
        torchaudio.save(p, wav, v.sr)
        print(f'  conversao: {wav.shape[-1]/v.sr:.1f}s audio | {time.time()-t:.0f}s | fonte={os.path.basename(edge)}', flush=True)

    print('FIM')
    return 0

if __name__ == '__main__':
    sys.exit(main())
