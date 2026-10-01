# YouTube — referência de PRODUÇÃO (camada 2)

> Saiu do `CLAUDE.md` em 01/10/2026 pra não carregar em todo chat. **Ler antes de produzir vídeo**
> (o lembrete `.claude/hook-lembrete.js` aponta pra cá quando o agente vai escrever roteiro ou spec).
> Conteúdo movido sem alteração.

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
| `Hâbol` ⭐ | Hubble | "rabo" — *24/09: o Marcelo ouviu `Rá-bol` como "hãblou/râbou"; `Hâbol` foi a única de 7 grafias que o Whisper devolveu como "Hubble". A legenda troca HÂBOL→HUBBLE no `make-short-img-flex.js`* |
| `Rá-bol` (antiga) | Hubble | "rabo" |
| `Persevírans` | Perseverance | "perseverante" |
| `Fóbos` | Fobos | "fogos" |
| `píxel` | pixel | "píxico" |
| `neutrons` (sem acento) | nêutrons | "neutros" |
| `tem nome. Anã branca.` | anã branca | "**não** branca" / "nan branca" |
| `Espóiler` | Spoiler | "só ir ler" *(18/09, Marte)* |
| `Sáiens` (revista) | Science | "saem se" *(18/09, Marte)* |
| `Muito acima do limite` | — | `Bem acima…` depois de "sóis." sai **"denha acima"** *(18/09)* |
| `Era só um pulsar` | — | `Era um pulsar` cola em **"eram pulsar"** *(18/09)* |

⚠️ No longo das estrelas (18/09) o Marte disse **"não branca" 3 vezes** com `a anã branca` e `como
anã branca`, mesmo sendo a voz que "acertava" no Short. Resolvido com o **plural** (`as anãs brancas`,
`virando uma dessas anãs brancas`). **No longo, usar sempre o plural.** A grafia fonética fica só no
`_roteiro-tts.txt`; a legenda mostra a grafia certa (mapa no `_monta-completo.js`).

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
