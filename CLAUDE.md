# Neural Update — estúdio (fábrica de vídeo + publicação)

Agente Node.js que gera Shorts/longos verticais e publica no YouTube via API oficial.
Marca: **Neural Update** (ciência/espaço, pt-BR). Blog: https://neural-update.com.br

> 🎬 **Antes de qualquer lote novo: ler [PLAYBOOK-SHORTS.md](PLAYBOOK-SHORTS.md)** (Shorts)
> ou [PLAYBOOK-LONGOS.md](PLAYBOOK-LONGOS.md) (longos). Não improvisar outro formato.

## ⛔ PARE — checklist obrigatório antes de escrever roteiro, montar lote ou agendar

Ordem do Marcelo em 27/08/2026, depois de eu errar isto **duas vezes no mesmo dia**:
*"você tem uma tem que olhar sempre, e você não está olhando"*.

**O SLOT DECIDE O FORMATO. Formato não é emoji no título.**

| slot | formato | voz | bordão | fecho |
|---|---|---|---|---|
| **08h** | notícia 📰 | Antonio (masc.) | sim | pergunta aberta |
| **14h** | **aula** 🔭 | **Thalita (fem.)** | **NÃO** | **`>>` próxima aula: tema + dia + data + "às duas"** |
| **18h** | viral existencial | Antonio | sim | pergunta aberta |

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
| **Marte** | `pt-BR-AntonioNeural` | **notícia** (08h) e **viral** (18h) |
| **Saturno** | *(a definir)* | reservado para o **3º narrador** — voz de peso, longo/documentário |

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
⚠️ Nunca passar trilha na mão sem checar as últimas usadas — foi assim que a quantum
saiu em 5 vídeos seguidos.

**Crédito de música obrigatório** na descrição: `Music: Kevin MacLeod (incompetech.com) — CC BY 4.0`.

**Marca em TODO vídeo:** drawtext/logo "NEURAL UPDATE" no canto, em toda cena.

**Conteúdo:** nunca inventar número fora da fonte. Fonte da notícia só na descrição,
nunca na narração. A voz nunca lê URL — chama "na bio".

## 💰 Custo (decisão do Marcelo, vigente)

- **Toda cena = Soul V2, 0,12cr.** Nada de Seedream/Nano Banana em cena.
- **Short:** 2 das cenas saem do banco (`exports/*/img*.png`, ~1.400 imagens) = custo zero.
- **Longo:** gera TODAS as cenas novas (o visual segura a retenção; reciclar entrega
  vídeo com cara de remendo). Thumbnail do longo pode ser premium, teto 5cr — é ela que
  decide o clique, e **CTR de miniatura é o gargalo medido dos longos (2%)**.
- ⚠️ **Plano Higgsfield tem TETO DIÁRIO** (`grace_daily_limit_reached`) — lote grande de
  imagem não cabe num dia só. Ver memória `higgsfield-migracao-video`.

## 📐 Formato (medido em 19/08/2026, 50 Shorts — ver memória `formato-medido-19ago`)

- **Teto de 42 segundos.** ≤42s dá 74% de retenção contra 61% na faixa 43-49s.
- Título com **negação** e **(parênteses)** — +11 e +8 pontos de retenção.
- Fecha com **pergunta aberta**, nunca com cartaz.
- 🚫 **CTA queimado no fim do vídeo está SUSPENSO.** Ele cai no trecho de 0,11 de retenção
  (quase ninguém vê) e derruba o vídeo de 100% para 48%. A oferta vive no **comentário
  fixado** (YouTube) e no **Story** (Instagram).

## Arquitetura

Tema → roteiro (LLM) → imagens (`higgsfield-images.js`, Soul V2) → montagem
(`make-short-img-flex.js` / `make-longo.js`: FFmpeg + TTS + legenda karaokê + trilha) →
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
| `cta-kindle-lote.js` | cola cena de CTA (cena montada 1x e reusada) |

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

## 🔴 Antes de gerar imagem de objeto real: PESQUISAR como ele é

Vídeo sobre sonda, telescópio, foguete, nave ou instrumento específico: **pesquisar a
aparência real antes de escrever o prompt**, e descrever no prompt o que identifica o objeto.
Em 26/08 um Short sobre o telescópio **Roman** foi produzido com um telescópio genérico com
cara de Hubble — o Roman é um **barril** com seis painéis solares planos nas laterais e uma
tampa frontal tipo viseira. Mostrar equipamento errado num canal de ciência é informação falsa
em imagem, com risco de strike.

Ordem obrigatória: **pesquisar → prompt fiel → imagem (0 crédito) → conferir contra a
referência → só então animar (12 créditos)**.

⚠️ E **falar o nome do objeto**: o mesmo vídeo passou 40 s sem dizer "Roman" uma vez. Sem o
nome falado nos primeiros segundos e no título, a busca do YouTube não tem o que indexar.

### Adjetivo não segura o modelo — dizer a forma pelo concreto E pelo negativo

Descoberto em 27/08 revisando o lote. O prompt do **Deimos** já dizia `irregular rocky world`
e o modelo desenhou uma **esfera lisa** assim mesmo. O mesmo aconteceu com a estrela de
nêutrons: veio uma **lua com crateras** e depois um **planeta com anéis de Saturno**.

O modelo tem um desenho padrão de "corpo celeste" (esfera cratered) e volta para ele sempre que
o prompt não fecha a porta. Adjetivo abstrato (`irregular`, `smooth`) não fecha. O que fechou:

| errado | vira | escreva assim |
|---|---|---|
| `irregular rocky world` | esfera lisa | `lumpy potato shaped` + `angular silhouette` + `definitely not a round planet` |
| `a neutron star` | lua com crateras / planeta com anéis | `a small perfectly smooth featureless white blue sphere` + `no craters, no rings, no planet` |

**Regra:** forma incomum pede as três coisas juntas — **comparação concreta** (batata, bola de
gude), **a silhueta** e **a negação explícita do desenho genérico**. Só um dos três não basta.

E conferir a tira de frames **sempre**: o rosto humano que apareceu nos cristais do
`nw-planeta-chove-rubi` e a cena de planeta gasoso no vídeo de buracos negros só foram pegos
olhando a tira, não o log.

## Palavra estrangeira: testar a pronúncia do TTS antes do lote

O Edge TTS pt-BR lê `Hubble` como **"rabo"**. Foram necessárias 14 grafias até achar a que
funciona: **`Rá-bol`, com hífen** (as outras saem "rabo", "rambo", "árbol"). A legenda mostra
`HUBBLE` por substituição no `.ass` — o espectador nunca vê a grafia fonética.
Testar assim: gerar a frase com cada grafia e transcrever com `faster-whisper` modelo `small`;
a grafia certa é a que volta escrita corretamente.

**Tabela do que já foi testado (27/08/2026):**

| escrever assim | o TTS fala | se escrever o "certo", sai |
|---|---|---|
| `Rá-bol` | Hubble | "rabo" |
| `Persevírans` | Perseverance | "perseverante" |
| `Fóbos` | Fobos | "fogos" |
| `píxel` | pixel | "píxico" |
| `neutrons` (sem acento) | nêutrons | "neutros" |
| `tem nome. Anã branca.` | anã branca | "**não** branca" / "nan branca" |

⚠️ **Não é só palavra estrangeira.** `píxel` e `nêutrons` são portuguesas e erram do mesmo
jeito. E há erros que vêm da **frase**, não da palavra:
- `cratera e o rosto` vira **"cratéria"** — vogal final fundindo com o "e" seguinte. Conserto:
  separar com outra palavra (`cratera do sul e o rosto`).
- `A Via Láctea` no início de frase vira **"Havia Láctea"**. Conserto: usar `a nossa galáxia`.
- `escombros soltos` depois de uma pausa vira **"escombros soldos"**.
- `anã branca` vira **"não branca"** / **"nam branca"** — as duas palavras colam. Doze grafias
  testadas. **O que funciona nas duas vozes é o PLURAL:** `as anãs brancas`. No singular, o
  Marte acerta com `…tem nome. Anã branca.` mas a Vênus não.
  ⚠️ **A grafia certa depende da VOZ e do que vem DEPOIS.** A mesma frase que passa isolada
  falha dentro do roteiro, porque o TTS agrupa segmentos por pontuação e o agrupamento muda a
  pronúncia. **Testar sempre a frase no contexto real, nunca a palavra sozinha.**
- `pequena, o núcleo` vira **"pequeno núcleo"**. Conserto: inverter a ordem
  (`O núcleo de uma estrela pequena…`).

**Por isso a auditoria com Whisper depois de montar é obrigatória**, não opcional: os erros de
contexto não aparecem quando se testa a palavra isolada. Rodar `_audita-todos.py` em
`exports/` compara o que o TTS falou com o `roteiro.txt` e lista o que sumiu.

## ⭐ MÉTODO FLOW VALIDADO 26/08 — Elementos + timestamp prompting

Validado com 1 teste de 12 créditos no projeto `exports/roman-telescope-lancamento/`.

**1. Fórmula oficial do prompt (Google):**
`[Cinematografia] + [Sujeito] + [Ação] + [Contexto] + [Estilo e ambiência]` — cinematografia
PRIMEIRO. O modelo foi treinado em cinema: `wide shot`, `push-in`, `orbital arc`,
`shallow depth of field` ativam ritmo, lente e emoção. "câmera desce devagar" não ativa nada.

**2. Timestamp prompting — vários planos no MESMO clipe, pelo mesmo preço:**
```
[00:00-00:03] Wide shot ...
[00:03-00:05] Slow push-in on ...
[00:05-00:08] Slow orbital arc ...
```
8 s por 12 créditos continua igual — o ganho é **3 planos onde antes havia 1**. Resolve a
lentidão que o PLAYBOOK aponta (plano de 8-13 s é lento demais pro feed).
⚠️ **Teto de 3 planos por clipe de 8 s.** Acima disso o modelo começa a inventar e trocar o
objeto entre planos.
⚠️ **Escolher os timestamps casando com as batidas da narração** — se a frase termina em
3,1 s, o corte vai em `[00:03-00:05]` e a imagem troca na palavra certa.

**3. Modo ELEMENTOS = objeto real correto.** No Google se chama *Ingredients to Video*:
sobem-se imagens de referência e o modelo mantém o objeto consistente. **É o único jeito de
mostrar sonda/telescópio/foguete real sem inventar.** Usar as ilustrações oficiais da NASA/ESA
(domínio público) como referência. Abrir o prompt com
`Using the provided reference images of X, keep its exact shape in every shot: <marcadores>`.
Para cena genérica (nebulosa, buraco negro) não é preciso — texto→vídeo basta.

**4. Prompt negativo na forma POSITIVA.** O Google desaconselha `no text, no logo`; o certo é
descrever o que se quer: `a clean empty starfield containing only this single observatory`,
`a plain surface free of lettering`. Áudio no formato deles: `Ambient noise: ...` e
`The scene is completely wordless, silent of any human speech.`

**5. Auditar a tira de frames antes de montar.** Extrair 5 frames do clipe e empilhar com
`hstack` — revela em segundos se o modelo trocou o objeto entre os planos.

## Google Flow — aprendizado acumulativo por vídeo

Quando um vídeo for produzido no Google Flow, criar/atualizar obrigatoriamente
`exports/<slug>/APRENDIZADO.md`. O objetivo é o próximo vídeo partir do resultado real do
anterior, não apenas do prompt planejado.

Registrar no mínimo:

- modelo, duração, formato e custo mostrado na confirmação do próprio Flow;
- prompts enviados e arquivos baixados;
- cenas aprovadas, rejeitadas ou refeitas e o motivo;
- resolução, duração, enquadramento e continuidade visual verificados;
- presença de trilha, voz indesejada, duplicação ou falha de áudio;
- erro ocorrido, créditos possivelmente cobrados e correção aplicada;
- `REPETIR NO PRÓXIMO` e `MUDAR NO PRÓXIMO`, com decisões concretas.

Fluxo validado no projeto `exports/sagitario-a-star/`:

1. Gerar só a Cena 1 e auditá-la antes de gastar nas demais.
2. Nos prompts, preservar música e efeitos nativos do Flow; bloquear apenas voz humana,
   narração, diálogo, sussurros, canto e palavras faladas.
3. Nunca escrever `no music` quando a trilha do Flow for desejada.
4. Sem texto, legenda, logo ou marca d'água no clipe-base; esses elementos entram na edição.
5. Para continuidade, extrair o último quadro aprovado e enviá-lo como primeiro frame da
   cena seguinte. A referência interna do Flow pode falhar enquanto a cena está na fila.
6. Confiar no custo exibido na caixa de aprovação do Flow; tabela externa pode estar defasada.
7. Após cada download: comparar duplicatas, validar vídeo e verificar fala no áudio antes
   de liberar a próxima geração.
8. A vinheta oficial reutilizável está em
   `exports/portal-buraco-de-minhoca/vinheta-neural-update-cosmic-zoom-v1.mp4`. Ela entra
   apenas no bordão final e deve ser usada integralmente, sem reconstruir, recortar, recolorir
   ou reposicionar a marca criada pelo Flow. Depois da frase conclusiva, manter 2 s exatos de
   pausa vocal com a trilha contínua; só então falar `Neural Update. O universo está te
   esperando.` Preservar a cauda natural da última palavra antes da pausa; não aplicar corte de
   silêncio que faça `real` soar truncado. As legendas da conclusão, da marca e do bordão devem
   formar blocos separados, sem antecipar palavras. Iniciar o clipe antes da fala para a
   revelação original coincidir com o bordão.
9. Ao mudar a velocidade de um clipe Flow, preservar a trilha em velocidade normal sempre
   que possível; reposicionar/estender o áudio é preferível a deformar música e efeitos.
