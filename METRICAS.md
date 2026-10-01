# YouTube — como medir (do jeito desta rede)

> Camada 2: ler só quando for medir ou concluir algo. Dados começam em **17/06/2026** (virada para
> astronomia). Toda conclusão com o tamanho da amostra (n=…). Shorts e longos são **algoritmos
> diferentes**: nunca misturar na mesma conta.

## Shorts

| métrica | por quê |
|---|---|
| **"Continuaram assistindo"** (views engajadas ÷ exibições no feed) | é a métrica que decide se o Short é distribuído. Views sozinhas enganam |
| retenção média (% assistido) | ≤ 42 s deu 74% contra 61% na faixa 43–49 s (n=50, 19/08) |
| inscritos ganhos por vídeo | o canal cresce por aqui, não por view |
| origem do tráfego (feed, busca, canal) | **busca está quase zerada** e é grátis: palavra-chave nas 3 primeiras palavras do título e falada nos primeiros 5 s |
| views de 7 dias | comparar vídeos com a mesma idade |

## Longos

| métrica | por quê |
|---|---|
| **CTR da miniatura** | gargalo medido: ~2% |
| retenção nos primeiros 30 s | a sangria dos longos está ali |
| horas de exibição | **só longo conta** para a meta das 4.000 h (Shorts não contam) |
| título em pergunta × lista | medido em 28/08: pergunta foi o único formato distribuído |

## De onde vem cada número

| arquivo | o que tem | quem gera | quando |
|---|---|---|---|
| `../analytics/placar/yt.json` | views por dia e por formato, top 7 e 28 dias | `node ../analytics/placar/coleta-yt.js` (cwd `YouTube`) | **manual** |
| `../analytics/jev/youtube-completo.json` | 311 vídeos: métricas + **curvas de retenção** de 100 pontos | Claude | manual |
| `../analytics/jev/youtube-extras.json` | taxa engajada, origem das views, inscrito × não inscrito | Claude | manual |
| `../analytics/jev/comentarios-youtube.json` | comentários por vídeo | Claude | manual |
| `../analytics/jev/modelo/previsoes-video.jsonl` | previsão do Jev **congelada antes** de publicar | `pontua-video.py` | a cada vídeo |

Quota: a **YouTube Analytics API tem quota separada** da Data API. Se a Data API zerar, o
Analytics ainda responde.

## Armadilhas

- Retenção cai quando o alcance sobe (r = −0,64): comparar vídeos de alcance parecido.
- Comparar o mesmo vídeo no Instagram antes de concluir sobre conteúdo (caiu nas duas = conteúdo).
- O Jev é **sensor**, não oráculo: prever views deu AUC ~0,57. Serve para medir propriedades do roteiro.
- Paginação de playlist com vídeo apagado devolve `nextPageToken` infinito e já zerou a quota.
- `data/sobe-lote.json` guarda IDs que ficam velhos. Para medir, buscar o ID no canal.
