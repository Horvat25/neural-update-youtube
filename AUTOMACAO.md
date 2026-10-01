# YouTube — o que roda sozinho e o que ainda é manual

> Camada 2. Regra: **automação só no GitHub** ou no próprio YouTube; nunca dependendo de agente
> ligado. Toda automação precisa de um alarme.

## Roda sozinho

| o quê | onde | observação |
|---|---|---|
| **publicar na hora** | o próprio YouTube (`publishAt`) | `sobe-lote.js` sobe cada vídeo já agendado; PC desligado não impede |
| **TikTok** | `.github/workflows/tiktok-fila.yml` deste repo, a cada 6h | mantém 10 posts no Buffer a partir de `tiktok-plano.json`. Ficha em `../tiktok-legado/` |
| comentário no YouTube | `../Instagram/.github/workflows/instagram.yml` (`comenta-youtube.mjs`) | roda no motor do Instagram |
| vigia de grade | `saude.js` (**local**, só quando alguém roda) | ⚠️ não roda no GitHub; o alarme de verdade é o `saude.yml` do Instagram |

⚠️ **Tarefas antigas do Windows estão desligadas e devem continuar assim**
(`NeuralUpdate-YouTube-3x`, `-Catchup`, `NeuralUpdate-YT-Catchup.vbs.disabled`): ligadas junto com o
lote, postam em dobro. A `NeuralUpdate-LinkBooster` aponta pra uma pasta que não existe mais e falha
toda noite (decisão pendente do Marcelo).

## Manual: o que um agente faz à mão (candidatos a automatizar, em ordem de ganho)

| tarefa | como se faz hoje | automatizar? |
|---|---|---|
| **coleta de métricas** (`coleta-yt.js`, curvas, extras) | agente roda quando lembra; morreu 4 dias em setembro quando o crédito acabou | **sim, primeiro da lista:** workflow diário no GitHub com o refresh token do YouTube como secret, gravando em `analytics/` |
| **agendar o lote** | `node sobe-lote.js lotes/<lote>.json` + listar agendados no canal | parcial: o upload é script; a aprovação do Marcelo é humana e deve continuar |
| **pós-agendamento** (legenda Insta, Stories, `tiktok-plano.js`, Reels na fila) | 4 passos à mão, em 3 lugares | **sim:** um só comando "distribuir lote" que faz os 4 e mostra a prova |
| produção (roteiro, Flow, montagem) | agente + aprovação do Marcelo | não: é onde mora a qualidade |
| ponte Short → longo ("vídeo relacionado") | só no YouTube Studio, a API não expõe | não |
| declaração "Uso de IA = Sim" em vídeo antigo | Studio, lotes de ~100/dia | não pela API |
