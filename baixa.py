# -*- coding: utf-8 -*-
"""
baixa.py — baixa uma imagem gerada e só devolve OK se ela veio INTEIRA.

  python baixa.py <url> <arquivo-de-saida>
  saída: "OK <bytes>"  ou  "FALHOU <motivo>"  (código de saída 0 / 1)

POR QUE ISSO EXISTE (medido 12/08/2026, 22h): rodando `gen-imgs.ps1` num lote de
70 imagens, TODAS voltaram truncadas — o `curl.exe` chamado de dentro do
PowerShell cortava o PNG no meio. As mesmas URLs, baixadas por aqui, vieram
inteiras (3,5 MB, IEND no lugar). Ou seja: a Higgsfield gerou e cobrou certo, e a
gente jogava fora. Num lote grande isso queima crédito em silêncio.

A regra que este script preserva: **repetir o DOWNLOAD, nunca a GERAÇÃO.** Baixar
de novo é grátis; gerar de novo cobra. Por isso são 4 tentativas de download aqui
dentro, e o chamador só é avisado depois que todas falharam.
"""
import sys, os, time, urllib.request

url, out = sys.argv[1], sys.argv[2]
TENTATIVAS = 4


def inteiro(caminho):
    """PNG válido termina em [tamanho:4][IEND:4][CRC:4]. JPEG termina em FFD9."""
    if os.path.getsize(caminho) < 1024:
        return False
    with open(caminho, 'rb') as f:
        f.seek(-12, 2)
        cauda = f.read(12)
    return cauda[4:8] == b'IEND' or cauda[-2:] == b'\xff\xd9'


erro = ''
for t in range(1, TENTATIVAS + 1):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'neural-update/1.0'})
        with urllib.request.urlopen(req, timeout=180) as r, open(out, 'wb') as f:
            while True:
                pedaco = r.read(1 << 16)
                if not pedaco:
                    break
                f.write(pedaco)
        if inteiro(out):
            print('OK %d' % os.path.getsize(out))
            sys.exit(0)
        erro = 'arquivo truncado'
    except Exception as e:
        erro = str(e)[:120]
    if t < TENTATIVAS:
        time.sleep(t * 3)

if os.path.exists(out):
    os.remove(out)
print('FALHOU %s' % erro)
sys.exit(1)
