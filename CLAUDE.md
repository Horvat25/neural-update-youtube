# Neural Update — estúdio (fábrica de vídeo + publicação)

Agente Node.js que gera Shorts/longos verticais e publica no YouTube via API oficial.
Marca: **Neural Update** (ciência/espaço, pt-BR). Blog: https://neural-update.com.br

> 🎬 **Antes de qualquer lote novo: ler [PLAYBOOK-SHORTS.md](PLAYBOOK-SHORTS.md)** (Shorts)
> ou [PLAYBOOK-LONGOS.md](PLAYBOOK-LONGOS.md) (longos). Não improvisar outro formato.

**Ficha da plataforma (01/10/2026):** `ESTADO.md` (o que está no ar, ler sempre) ·
`METRICAS.md` (como medir) · `AUTOMACAO.md` (o que roda sozinho e o que é manual) ·
`PRODUCAO-REFERENCIA.md` (antes de produzir). O TikTok é publicado a partir desta pasta,
mas a ficha dele está em `../tiktok-legado/`.

## ⛔ PARE — checklist obrigatório antes de escrever roteiro, montar lote ou agendar

Ordem do Marcelo em 27/08/2026, depois de eu errar isto **duas vezes no mesmo dia**:
*"você tem uma tem que olhar sempre, e você não está olhando"*.

**O SLOT DECIDE O FORMATO. Formato não é emoji no título.**

| slot | formato | voz | bordão | fecho |
|---|---|---|---|---|
| **08h** | notícia 📰 | Antonio (masc.) | sim | pergunta aberta |
| **14h** | **aula** 🔭 | **Thalita (fem.)** | **NÃO** | **`>>` próxima aula: tema + dia + data + "às duas"** |
| **18h** | viral existencial | Antonio | **NÃO** (24/09: bordão só 1x/dia, no 08h) | pergunta aberta |

1. Vou mexer em algum **14h**? → **descobrir o que a aula anterior prometeu**:
   `grep -o ">>.*" exports/pl*/roteiro.txt | tail -3`
   O tema e a data **já foram decididos por um vídeo que está no ar**. Não são escolha minha.
2. **Toda aula nova anuncia a seguinte.** A aula é o ÚNICO formato que marca encontro —
   **um elo quebrado mata a série inteira**, porque nenhum outro vídeo a reconstrói.
3. Tema repetido? → `node confere-repetido.js`
4. Objeto real na tela? → pesquisar a aparência antes do prompt (seção mais abaixo).
5. Terminei? → prova real: agendados listados no canal, fila lida do `origin/main`, tira de frames.

**O erro de 27/08 que isto existe pra impedir:** produzi 18 notícias, troquei o emoji de 7
delas pra 🔭 e chamei de aula. A aula do dia 27 prometia *"o tempo perto da velocidade da luz,
sexta, dia vinte e oito, às duas"* — e eu tinha posto uma notícia sobre energia escura naquele
slot. O canal marcaria um encontro e entregaria outra coisa.

## 🎙️ Os narradores do canal (nomes oficiais, 28/08/2026)

As vozes têm nome e são tratadas como personagens da marca — não como "voz masculina/feminina".
Critério do Marcelo: **nomes de planetas**, ordenados pelo peso que o nome tem para o público.

| nome | voz técnica | onde narra |
|---|---|---|
| **Vênus** | `pt-BR-ThalitaMultilingualNeural` | **aula** (14h) e a live |
| **Marte** | `pt-BR-AntonioNeural` | **notícia** (08h), **viral** (18h) e **vídeo longo** — o amigo curioso/detetive que conta o caso |

**São só dois narradores** (decisão do Marcelo, 18/09/2026): uma voz de homem e uma de mulher. O
Saturno foi descartado.

⭐ **Identidade de Marte e Vênus (personalidade, assinatura, banco de expressões, antes→depois):
[NARRADORES.md](NARRADORES.md).** Ler antes de escrever qualquer roteiro (18/09/2026).

A Vênus já vinha sendo chamada assim na live desde 19/08 (`venus/espelho-2026-08-19.md`);
Marte e Saturno foram batizados em 28/08.

## 🚫 Leis (custaram caro para aprender)

**Trilhas BANIDAS** — Content ID silencia o vídeo: `cosmic-the-descent`,
`cosmic-infinite-perspective`, `dark-bump-in-the-night`, `quantum-investigations`
(vetada pelo Marcelo), `tech-pixelland`. Estão em `assets/music-quarantine/` e
`assets/music-real/_quarentena/` — **nunca devolver**.

**Trilha varia por slot (decisão do Marcelo, 09/09/2026: "não quero trilha sonora igual").**
Só as 5 com histórico no canal e fora da quarentena: 08h `news-rising-tide` · 14h
`cosmic-ice-flow` / `cosmic-ambient-espacial` · 18h `dark-some-amount-of-evil` / `dark-tension-pixabay`.
A trilha vai no campo `track` do lote e `_monta-grade.js` lê de lá (e recusa as banidas).

⚠️ **TikTok tem lista própria (medido 11/09/2026):** lá o `dark-some-amount-of-evil` e o
`news-rising-tide` são SILENCIADOS (3 de 3 vídeos com 0 view e ícone de mudo), enquanto
`quantum-investigations`, `cosmic-ice-flow` e `cosmic-ambient-espacial` passaram (126–274 views).
Versão para TikTok: só `cosmic-ice-flow` / `cosmic-ambient-espacial`, que passaram nas duas redes.
⚠️ Nunca passar trilha na mão sem checar as últimas usadas — foi assim que a quantum
saiu em 5 vídeos seguidos.

**Crédito de música obrigatório** na descrição: `Music: Kevin MacLeod (incompetech.com) — CC BY 4.0`.

**Marca em TODO vídeo:** drawtext/logo "NEURAL UPDATE" no canto, em toda cena.

**Conteúdo:** nunca inventar número fora da fonte. Fonte da notícia só na descrição,
nunca na narração. A voz nunca lê URL — chama "na bio".

## 💰 Custo (vigente desde 16–24/09/2026)

- **Sem Higgsfield nas cenas.** Imagem vem do banco (`banco/`, ~1.600 imagens catalogadas, escolhidas
  pela FRASE falada e olhando a imagem) ou da NASA/ESA; o que faltar, Gemini grátis.
- **14h e 18h em clipes do Google Flow** (crédito renova todo dia; conferir saldo antes; padrão
  ~48cr por vídeo). **08h na edição:** foto real + círculo/número, crédito zero.
- Ordem, corte e ritmo se resolvem no ffmpeg, de graça. **Regerar clipe é a última opção.**
- Longo: thumbnail pode ser premium. **CTR de miniatura é o gargalo medido dos longos (2%).**
- Histórico do Higgsfield (Soul V2, teto diário): memória `higgsfield-migracao-video`.

## 📐 Formato (medido em 19/08/2026, 50 Shorts — ver memória `formato-medido-19ago`)

- **Teto de 42 segundos.** ≤42s dá 74% de retenção contra 61% na faixa 43-49s.
- Título com **negação** e **(parênteses)** — +11 e +8 pontos de retenção.
- Fecha com **pergunta aberta**, nunca com cartaz.
- 🚫 **CTA queimado no fim do vídeo está SUSPENSO.** Ele cai no trecho de 0,11 de retenção
  (quase ninguém vê) e derruba o vídeo de 100% para 48%. A oferta vive no **comentário
  fixado** (YouTube) e no **Story** (Instagram).

## Arquitetura

Tema → roteiro (seguindo `NARRADORES.md`) → imagens (banco/NASA) ou clipes do Flow → montagem
(`_monta-flow.js` para Flow;
`make-short-img-flex.js` / `make-longo.js`: FFmpeg + TTS + legenda karaokê + trilha) →
publicação (`youtube-uploader.js`, OAuth).

Reaproveitado do projeto TikTok: `tts.js` (Edge TTS pt-BR com word-timings),
`ass-captions.js` (legenda), `music-manager.js` (trilha + ducking).

**Sincronia imagem×fala:** `cues.txt` (1 linha por imagem, primeiras palavras da fala onde
ela entra). Sem isso a imagem troca no relógio e não no assunto. Piso de 3,5s/cena.

## Scripts que importam

| script | o quê |
|---|---|
| `monta-lote-spec.js <lote.json>` | monta os .mp4 do lote (`--refazer` remonta) |
| `sobe-lote.js <lote.json>` | sobe agendado pelo publishAt do spec |
| `troca-por-kindle.js` | troca vídeo agendado por versão nova (sobe o novo, manda o velho pra 2099) |
| `confere-repetido.js` | ⚠️ rodar SEMPRE antes de lote novo — tema repetido já aconteceu |
| `reschedule.js <id> <ISO>` | muda publishAt |
| `_ponte-longo.js <id_longo>` | lista os Shorts que devem apontar pro longo |
| `tiktok-plano.js` | ⚠️ rodar A CADA LOTE NOVO (+ push do `tiktok-plano.json`): estende o TikTok (12:17 notícia · 17:07 campeão antigo · 20:23 viral) até a última data do lote. O GitHub (`tiktok-fila`, a cada 6h) repõe o Buffer sozinho |
| `carrossel/render.js <post.json>` | ⚠️ A CADA LOTE NOVO: posts de FEED do Insta (carrossel/post único, 12h BRT, 1 por dia até a última data do lote). Slides 1080x1350 por HTML/CSS no Chrome, zero crédito; conferir a `_tira.jpg` |
| `carrossel/enfileira.js` + `poe-na-fila.js` | `--copiar <worktree do site>` põe os JPG em `neural-update-forge/public/carrossel/` (push = deploy); sem `--copiar` confere as URLs e gera os itens; `poe-na-fila.js` junta na fila do Insta (worktree limpo do origin) |
| `troca-cta-projetor.js` | exemplo de troca de vídeo agendado com metadados copiados do vídeo que está no canal (12/09) |

Removidos na poda de 10-11/09/2026 (histórico no cofre `Horvat25/neural-update-youtube`):
os montadores de lote de julho/agosto (`build-lote*`, `lote-*ago.js`, `gen-*.ps1`), o CTA
colado no fim (`cta.js`, `append-*-cta.js`, `cta-kindle-lote.js`) e os VSL antigos.

⚠️ **`data/sobe-lote.json` guarda IDs que ficam VELHOS** quando um vídeo é re-subido.
Antes de mandar algo pro limbo, listar os agendados no canal. Ver `ids-do-youtube-mentem`.

## Como um vídeo vai ao ar hoje

**Por LOTE, não por tarefa do Windows.** `sobe-lote.js` sobe cada vídeo já com
`publishAt` — quem publica na hora é **o próprio YouTube**, não este PC. Logo, PC
desligado não impede a publicação de um vídeo já agendado.

⚠️ **Verificado em 19/08/2026:** as tarefas antigas `NeuralUpdate-YouTube-3x`,
`NeuralUpdate-YouTube-Catchup` e o `NeuralUpdate-YT-Catchup.vbs` do Startup estão
**DESATIVADAS** — e devem continuar assim. Elas geravam e postavam sozinhas; ligadas
junto com o lote, causam post em dobro. A doc antiga chamava isso de "motor ATIVO",
o que já não era verdade.

→ Consequência: **sem lote novo, a grade simplesmente acaba.** Nada gera conteúdo
sozinho. Conferir sempre até quando a grade está preenchida.

Quota YouTube: **não se autolimitar em 6 por dia.** A regra antiga (10.000 unidades, ~6 uploads)
não vale para este projeto: em 04/09/2026 subiram 14 vídeos e em 10/09/2026 subiram 23 no mesmo
dia, sem erro. Subir tudo de uma vez; se a quota acabar, o `sobe-lote.js` para sozinho, avisa e
continua de onde parou na próxima rodada.

## Ambiente

Windows, Node 24, **sem ffmpeg nem Python no PATH** → usar `ffmpeg-static` (bundled).
Nunca assumir ffmpeg no PATH.

## Como rodar

```
node youtube-login.js          # 1x, salva refresh_token
node daily-post.js --unlisted  # 1 ciclo, para revisar
node youtube-stats.js          # estatísticas reais
```

## 🎬 Na hora de PRODUZIR: `PRODUCAO-REFERENCIA.md`

Pesquisar o objeto real antes do prompt · tabela de pronúncia do TTS (Hubble = `Hâbol`) e auditoria
com Whisper · método Flow (timestamp prompting, Elementos, prompt negativo na forma positiva) ·
`APRENDIZADO.md` por vídeo do Flow · vinheta oficial. **Obrigatório antes de roteiro, prompt ou montagem.**
