"""
tts-local-remenda.py — conserta ALGUMAS frases de uma narração já gerada.

    ..\\.venv-chatterbox\\Scripts\\python.exe tts-local-remenda.py \\
        <ref.wav> <wav-existente> <tempos.json> <i_ini> <i_fim> "frase1" "frase2" ...

i_ini/i_fim são 1-based e INCLUSIVOS, casando com o campo "i" do tempos.json.
Sobrescreve o wav e o tempos.json no lugar — copie antes se quiser poder voltar.

POR QUE ISSO EXISTE (31/07/2026)
O tts-local-lote.py refaz a narração inteira. Numa correção de UMA frase num
roteiro de 13, isso é ~3 minutos de CPU pra trocar 3 segundos de áudio — e ainda
re-sorteia as outras 12, que já estavam boas. O Marcelo cortou na hora:
"você vai regenerar tudo por 1 frase?".

Aqui o modelo carrega uma vez (~15s), gera só o trecho pedido, corta o wav em
[0, inicio_i_ini) + trecho novo + [fim_i_fim, fim) e remonta o tempos.json
deslocando o que vem depois. As pausas de fronteira ficam intactas porque moram
nas bordas dos pedaços preservados.

⚠️ EXAG/CFG/temperature têm que ser os MESMOS do lote original, senão o timbre
muda no meio da narração e o remendo fica audível.
"""
import sys, os, json, time
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
import torch, torchaudio

PAUSAS = {'?': 0.52, '!': 0.46, '.': 0.34, ':': 0.26, ',': 0.18}
PAUSA_PADRAO = 0.30
EXAG, CFG = 0.72, 0.35

def pausa_de(txt):
    return PAUSAS.get(txt.strip()[-1:], PAUSA_PADRAO)

def main():
    ref, wav_path, tempos_path = sys.argv[1], sys.argv[2], sys.argv[3]
    i_ini, i_fim = int(sys.argv[4]), int(sys.argv[5])
    novas = sys.argv[6:]
    assert len(novas) == i_fim - i_ini + 1, 'quantidade de frases nao bate com o intervalo'

    tempos = json.load(open(tempos_path, encoding='utf-8'))
    por_i = {f['i']: f for f in tempos}
    t_ini = por_i[i_ini]['inicio']
    t_fim = por_i[i_fim]['fim']

    audio, sr = torchaudio.load(wav_path)
    print(f'wav {audio.shape[-1]/sr:.2f}s @ {sr} Hz | trecho {t_ini:.2f}-{t_fim:.2f}s', flush=True)

    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    t0 = time.time()
    print(f'carregando modelo... (exaggeration={EXAG} cfg_weight={CFG})', flush=True)
    m = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
    assert m.sr == sr, f'sample rate divergente: modelo {m.sr} vs wav {sr}'
    print(f'  ok em {time.time()-t0:.0f}s', flush=True)

    pedacos, dur_novas = [], []
    for k, txt in enumerate(novas):
        w = m.generate(txt, language_id='pt', audio_prompt_path=ref,
                       exaggeration=EXAG, cfg_weight=CFG, temperature=0.8)
        d = w.shape[-1] / sr
        n = len(txt.split())
        print(f'  {i_ini+k}: {d:.2f}s  {d/n:.2f}s/pal  {txt}', flush=True)
        pedacos.append(w)
        dur_novas.append(d)
        if k < len(novas) - 1:                      # pausa interna do trecho
            p = pausa_de(txt)
            pedacos.append(torch.zeros(1, int(p * sr)))
            dur_novas.append(p)

    miolo = torch.cat(pedacos, dim=-1)
    a = audio[:, :int(t_ini * sr)]                  # tudo antes, com a pausa anterior
    b = audio[:, int(t_fim * sr):]                  # tudo depois, com a pausa seguinte
    final = torch.cat([a, miolo, b], dim=-1)
    torchaudio.save(wav_path, final, sr)

    # remonta os tempos: antes fica igual, o trecho recebe as novas duracoes,
    # e o que vem depois desloca pelo delta.
    novo_fim = t_ini + miolo.shape[-1] / sr
    delta = novo_fim - t_fim
    saida, t = [], t_ini
    for f in tempos:
        if f['i'] < i_ini:
            saida.append(f)
        elif f['i'] <= i_fim:
            d = dur_novas[(f['i'] - i_ini) * 2]
            txt = novas[f['i'] - i_ini]
            saida.append({'i': f['i'], 'texto': txt, 'fala': txt,
                          'inicio': round(t, 3), 'fim': round(t + d, 3)})
            t += d + (pausa_de(txt) if f['i'] < i_fim else 0)
        else:
            saida.append({**f, 'inicio': round(f['inicio'] + delta, 3),
                          'fim': round(f['fim'] + delta, 3)})
    json.dump(saida, open(tempos_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'PRONTO: {final.shape[-1]/sr:.2f}s (delta {delta:+.2f}s)', flush=True)

main()
