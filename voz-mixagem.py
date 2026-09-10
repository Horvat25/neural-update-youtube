"""
voz-mixagem.py — cadeia de LOCUCAO profissional sobre uma narracao ja pronta.

    python voz-mixagem.py <entrada.wav> <saida.wav> [leve|media|forte]

De onde vem a receita (pesquisado em 01/08/2026, nao inventado):
Sage Audio "How to Make Voice Over Sound Better" e Podigy "EQ for Podcasting".
A ordem que os dois concordam e a mesma que estudio de locucao usa:

    high-pass -> EQ subtrativa -> de-esser -> compressor -> saturacao -> limiter -> loudness

Cada etapa, e por que ela esta aqui:

1. HIGH-PASS 80 Hz — tira ronco e rumble. O F0 do Guilherme e 149 Hz, entao 80 Hz
   nao come corpo nenhum da voz dele.
2. EQ SUBTRATIVA — a regra do Podigy e "corte, nao realce", porque realce sobe o
   ruido de fundo junto. Cortes: 209 Hz (peso/boominess), 550 Hz (reflexao de sala),
   800 Hz (nasal). Unico realce, discreto, em 2 kHz: e a banda da inteligibilidade,
   onde a consoante mora. E o que faz a palavra do FIM da frase voltar a aparecer.
3. DE-ESSER — 3 a 4 dB de reducao. TTS costuma exagerar o "s".
4. COMPRESSOR 3:1, ~4 dB de atenuacao, release 100 ms — ESTE e o que corrige o
   "ele fica com medo de falar". A queixa nao era truncamento (medido: as 13 frases
   decaem ate zero), era DECLINACAO: o modelo perde energia no fim da frase. O
   compressor levanta a parte fraca e nivela.
5. SATURACAO (aexciter) — harmonico sutil, o "warmth" de fita. Sage avisa: nunca
   passar de ~1% THD. Aqui entra bem baixo.
6. LIMITER + LOUDNORM -14 LUFS / -2 dBTP — alvo de YouTube e Instagram.

⚠️ A entrada precisa ter headroom (picos em -18 a -12 dBFS). Se ja vier normalizada
a -14 LUFS, o compressor nao tem o que agarrar. Por isso o pre-ganho negativo.
"""
import sys, os, subprocess

EST = os.path.dirname(os.path.abspath(__file__))
FFMPEG = os.path.join(EST, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')

# ⚠️ EXCITER BAIXO DE PROPÓSITO (01/08/2026).
# A v1 usava amount 0.6/1.0/1.6. No perfil forte isso produziu um artefato agudo
# audível — o Marcelo descreveu como "um gemido de gato" aos 18s. Medido na frase:
# energia acima de 6 kHz subiu de 4,4% (cru) para 7,2% (mixado) e os quadros com
# pico de agudo passaram de 10 para 36.
# A causa é o material: saturação de fita foi pensada pra voz gravada em microfone,
# que tem agudo natural pra excitar. TTS já entrega agudo sintético — excitar de
# novo vira chiado. A COMPRESSÃO (que resolve o "medo de falar") fica; o exciter só
# tempera.
PERFIS = {
    # (corte_209, corte_550, corte_800, realce_2k, deesser_i, comp_thr, comp_ratio, exciter)
    'leve':  (-1.5, -2.0, -1.5, 1.5, 0.12, -18, 2.0, 0.20),
    'media': (-2.5, -3.0, -2.5, 2.5, 0.18, -21, 3.0, 0.35),
    'forte': (-3.5, -4.0, -3.5, 3.5, 0.25, -24, 4.0, 0.50),
    # 'limpo' (08/08/2026): EXCITER ZERO + de-esser mais firme, para VSL longa.
    # O Marcelo ouviu chiado "principalmente quando fala do produto" — ou seja,
    # DURANTE a fala, não nas emendas. Medido: a cadeia com exciter 0.35 sobe a
    # energia acima de 6 kHz em ~2,3 dB sobre o cru. Em frase curta ninguém nota;
    # em 86s de narração vira sibilância constante. Aqui o exciter sai de vez e o
    # afftdn (na cadeia, abaixo) tira o ruído de banda larga que o TTS deixa.
    'limpo': (-2.5, -3.0, -2.5, 2.0, 0.30, -20, 2.5, 0.00),
    # 'vivo' (08/08/2026) — o equilíbrio que faltava.
    # O 'limpo' com de-esser em 0.42 e redutor de ruído em 8 dB matou o chiado e
    # matou a voz junto: o Marcelo ouviu "frases mortas". De-esser forte come o
    # ar da consoante, e o redutor tira o ruído fino que o ouvido lê como
    # presença. Aqui os dois recuam (0.32 e 4 dB) e a compressão sobe um pouco
    # (3.0:1) para devolver energia sem o exciter, que é quem sibila.
    'vivo':  (-2.5, -3.0, -2.5, 2.6, 0.32, -21, 3.0, 0.00),
    # 'vsl' (15/08/2026): o 'vivo' com o de-esser um passo acima.
    # Medido na VSL dos seminovos: com 0.32 os picos de sibilância batiam em 56,7%
    # da energia entre 5,5 e 9 kHz, sempre nas mesmas palavras — "quinhentos e
    # cinquenta" (o s de quinhentos colado no c de cinquenta) e "dezesseis".
    # O de-esser sobe só um degrau porque 0.42 já foi testado e matou a voz.
    'vsl':   (-2.5, -3.0, -2.5, 2.6, 0.38, -21, 3.0, 0.00),
    # 'firme' (08/08/2026): a autoridade do 'forte' SEM o chiado do exciter.
    # O Marcelo: "soa sem confiança, como se quisesse acabar rápido". A queixa é
    # a mesma que o compressor resolve (o modelo perde energia no fim da frase),
    # mas o 'forte' comprava isso com exciter 0.50, que sibila. Aqui a compressão
    # sobe para 3.8:1 com joelho suave, o de-esser segura o "s" que a compressão
    # levanta junto, e o exciter continua ZERO.
    'firme': (-3.0, -3.5, -3.0, 3.0, 0.34, -23, 3.8, 0.00),
}


def cadeia(perfil):
    c209, c550, c800, r2k, dee, thr, ratio, exc = PERFIS[perfil]
    # o redutor de ruído vale para os dois perfis sem exciter — no 'firme' ele é
    # ainda mais necessário, porque compressão 3.8:1 levanta chiado junto com voz
    # 'vivo' usa redutor de ruído MAIS LEVE — 8 dB tirava a presença junto
    limpo = perfil in ('limpo', 'firme', 'vivo')
    nr = 4 if perfil == 'vivo' else 8
    return ','.join([
        'volume=-6dB',                                   # headroom pro compressor agir
        'highpass=f=80',
        # Redutor de ruído ANTES do compressor: depois já é tarde, o compressor
        # levanta o chiado junto com a voz. nr=8 dB é leve de propósito — acima de
        # 12 o TTS começa a soar submerso.
        *([f'afftdn=nr={nr}:nf=-42:tn=1'] if limpo else []),
        f'equalizer=f=209:t=q:w=1.2:g={c209}',
        f'equalizer=f=550:t=q:w=1.4:g={c550}',
        f'equalizer=f=800:t=q:w=1.6:g={c800}',
        f'equalizer=f=2000:t=q:w=1.0:g={r2k}',
        f'deesser=i={dee}:m=0.5:f=0.5',
        f'acompressor=threshold={thr}dB:ratio={ratio}:attack=5:release=100:makeup=2:knee=6',
        *([f'aexciter=level_in=1:level_out=1:amount={exc}:drive=3:blend=0:freq=7500'] if exc > 0 else []),
        'alimiter=limit=0.89:attack=5:release=50',        # -1 dBFS
        'loudnorm=I=-14:TP=-2:LRA=9',
        'aresample=48000',                                # loudnorm sai em 192k se deixar
    ])


def main():
    ent, sai = sys.argv[1], sys.argv[2]
    perfil = sys.argv[3] if len(sys.argv) > 3 else 'media'
    subprocess.run([FFMPEG, '-y', '-i', ent, '-af', cadeia(perfil),
                    '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', sai,
                    '-loglevel', 'error'], check=True)
    print(f'{os.path.basename(sai)}  perfil={perfil}')


main()
