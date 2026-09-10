"""
tts-local-lote.py — narração longa com voz clonada, frase por frase.

    ..\.venv-chatterbox\Scripts\python.exe tts-local-lote.py <ref.wav> <frases.json> <saida.wav> [exag] [cfg]

Por que frase por frase e não o texto inteiro de uma vez:
  1. o modelo degrada e às vezes trunca em texto longo;
  2. carregar o modelo custa ~40s, então vale amortizar num loop só;
  3. e o principal — sabendo a duração de CADA frase, sai um JSON de tempos
     que vira LEGENDA sincronizada de graça.

──────────────────────────────────────────────────────────────────────────────
DUAS CORREÇÕES APRENDIDAS NA MARRA (30/07/2026)

1) PAUSA FIXA ENTRE FRASES SOA ROBÔ.
   A v1 punha 0,28s entre TODAS as frases. Pausa sempre igual vira metrônomo —
   o ouvido percebe como "travado". Agora a pausa sai da pontuação: vírgula no
   fim pede respiro curto, ponto pede médio, "?" e "!" pedem mais, porque quem
   fala deixa a pergunta assentar.

2) FRASE LONGA E LISTA COMPRIDA QUEBRAM O MODELO.
   Medido: a frase "…formatação, desbloqueio, xerox, impressão e impressão em
   três D" saiu a 0,47s por palavra contra 0,39 de média — 20% mais lenta, e
   audivelmente enrolada. Três causas: lista de 7 itens sem verbo, repetição
   imediata ("impressão e impressão"), e termo técnico escrito fora da fala.
   Agora o script MEDE cada frase e REGERA a que sair fora da curva.
──────────────────────────────────────────────────────────────────────────────
"""
import sys, os, json, time, re, statistics

# console do Windows e cp1252 e engasga em seta/acento nos prints
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
import torch, torchaudio

# pausa por pontuação final — fala real não tem intervalo constante
PAUSAS = {'?': 0.52, '!': 0.46, '.': 0.34, ':': 0.26, ',': 0.18}
PAUSA_PADRAO = 0.30
TOLERANCIA = 0.25   # desvio aceito no ritmo antes de regerar
MAX_TENTATIVAS = 3
MIN_PALAVRAS_CHECAGEM = 8
# So checa ritmo em frase LONGA. Frase curta tem s/palavra naturalmente alto: a
# respirada inicial e a entonacao de fecho custam quase o mesmo em 4 ou em 14
# palavras, mas dividem por menos. Sem esse piso, "Computador e notebook tambem."
# (4 palavras) era marcada como 64% fora e regerada 3x a toa. O defeito real que
# essa checagem existe pra pegar aconteceu numa frase de 17 palavras.

def normaliza(itens):
    """Aceita string OU {"fala": ..., "tela": ...}.

    POR QUE DUAS FORMAS: o modelo precisa de "oitocentos e dezesseis" e "tres de"
    pra pronunciar certo, mas a LEGENDA tem que mostrar "816" e "3D" — numero por
    extenso na tela fica amador. Sem essa separacao, a legenda herda a forma
    fonetica e o video mostra "OITOCENTOS E DEZESSEIS".
    """
    out = []
    for it in itens:
        if isinstance(it, dict):
            fala = it.get('fala') or it.get('texto') or ''
            out.append((fala, it.get('tela') or fala))
        else:
            out.append((it, it))
    return out

def pausa_de(frase):
    fim = frase.strip()[-1:] if frase.strip() else '.'
    return PAUSAS.get(fim, PAUSA_PADRAO)

def avisa_roteiro(frases):
    """Não corrige nada — só aponta o que costuma quebrar, pra quem escreveu ver."""
    for i, f in enumerate(frases, 1):
        n = len(f.split())
        if n > 16:
            print(f'  ! frase {i}: {n} palavras. Acima de ~16 o modelo enrola.', flush=True)
        itens = f.count(',')
        if itens >= 4:
            print(f'  ! frase {i}: lista de {itens+1} itens. Quebre em duas.', flush=True)
        pals = [w.lower().strip('.,;:!?') for w in f.split()]
        for a, b in zip(pals, pals[1:]):
            if a == b and len(a) > 3:
                print(f'  ! frase {i}: "{a}" repetido colado — trava o modelo.', flush=True)
        if re.search(r'\b\d+\s*[A-Za-z]\b', f):
            print(f'  ! frase {i}: tem sigla com número (ex "3D"). Escreva por extenso.', flush=True)

def main():
    if len(sys.argv) < 4:
        print('uso: tts-local-lote.py <ref.wav> <frases.json> <saida.wav> [exag] [cfg]')
        return 1
    ref, frases_json, out = sys.argv[1], sys.argv[2], sys.argv[3]
    exag = float(sys.argv[4]) if len(sys.argv) > 4 else 0.7
    cfg  = float(sys.argv[5]) if len(sys.argv) > 5 else 0.35

    pares = normaliza(json.load(open(frases_json, encoding='utf-8')))
    frases = [f for f, _ in pares]
    print(f'roteiro: {len(frases)} frases, {sum(len(f.split()) for f in frases)} palavras')
    avisa_roteiro(frases)

    torch.set_num_threads(max(1, (os.cpu_count() or 4) - 2))
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    t0 = time.time()
    print(f'carregando modelo... (exaggeration={exag} cfg_weight={cfg})', flush=True)
    m = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
    sr = m.sr
    print(f'  ok em {time.time()-t0:.0f}s | sr={sr}', flush=True)

    def gera(txt):
        w = m.generate(txt, language_id='pt', audio_prompt_path=ref,
                       exaggeration=exag, cfg_weight=cfg, temperature=0.8)
        return w.unsqueeze(0) if w.dim() == 1 else w

    ritmos, brutos = [], []
    for i, fr in enumerate(frases, 1):
        n = max(1, len(fr.split()))
        melhor, melhor_desvio = None, None
        for tentativa in range(1, MAX_TENTATIVAS + 1):
            t = time.time()
            wav = gera(fr)
            ritmo = (wav.shape[-1] / sr) / n
            # a referência é a mediana do que já saiu; nas primeiras frases não há base
            base = statistics.median(ritmos) if len(ritmos) >= 2 else ritmo
            desvio = abs(ritmo - base) / base
            if melhor is None or desvio < melhor_desvio:
                melhor, melhor_desvio, melhor_ritmo = wav, desvio, ritmo
            curta = n < MIN_PALAVRAS_CHECAGEM
            marca = '' if (desvio <= TOLERANCIA or curta) else f'  <- {desvio*100:.0f}% fora, regerando'
            print(f'  {i}/{len(frases)} t{tentativa}: {wav.shape[-1]/sr:.1f}s '
                  f'({ritmo:.2f}s/pal) em {time.time()-t:.0f}s{marca}', flush=True)
            if desvio <= TOLERANCIA or n < MIN_PALAVRAS_CHECAGEM:
                break
        ritmos.append(melhor_ritmo)
        brutos.append((fr, pares[i-1][1], melhor))

    pedacos, tempos, t_acc = [], [], 0.0
    for i, (fr, tela, wav) in enumerate(brutos, 1):
        dur = wav.shape[-1] / sr
        p = pausa_de(fr) if i < len(brutos) else 0.0
        tempos.append({'i': i, 'texto': tela, 'fala': fr, 'inicio': round(t_acc, 3), 'fim': round(t_acc + dur, 3)})
        t_acc += dur + p
        pedacos.append(wav)
        if p:
            pedacos.append(torch.zeros(1, int(p * sr)))

    final = torch.cat(pedacos, dim=-1)
    torchaudio.save(out, final, sr)
    json.dump(tempos, open(os.path.splitext(out)[0] + '-tempos.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    print(f'PRONTO: {out} ({final.shape[-1]/sr:.1f}s) | ritmo mediano '
          f'{statistics.median(ritmos):.2f}s/palavra')
    return 0

if __name__ == '__main__':
    sys.exit(main())
