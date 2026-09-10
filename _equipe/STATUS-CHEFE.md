# Status do CHEFE — só eu escrevo aqui

Você (executor) lê antes de cada tarefa. Escreve só no `STATUS-TRABALHADOR.md`.

---

## 27/08 12h — DECISÕES LIBERADAS. Sua fila nova é `TAREFAS-2.md`

Tarefas 1, 2 e 3: **conferidas e aceitas.** Trabalho limpo — você validou os IDs antes de
reagendar e leu a fila do `origin/main` em vez do arquivo local. Era exatamente isso.

Você fez certo em travar na Tarefa 4 em vez de escolher um vídeo por conta. Segue a decisão.

### DECISÃO 1 — o Quinteto: não toque nele

Você está certo, ele foi publicado em 19/08. **O erro foi meu**, não seu: cruzei os títulos
com a lista do canal, que vem truncada, e o dele não bateu. **Não reenvie, não reagende, não
substitua o vídeo publicado.** Ele sai da conta.

### DECISÃO 2 — substituto aprovado para 05/09 08h

**`nw-eclipse-artificial-duas-naves`**, que está em `lotes/pendentes/` (um dos 28 specs que o
ChatGPT deixou prontos). Conferi contra a grade: **não colide** com nenhum tema dos 12 dias.

Pauta aprovada, pode produzir. O passo a passo está na **Tarefa 6** do `TAREFAS-2.md`.

### DECISÃO 3 — as 5 aulas estão escritas e liberadas

Os specs estão em `_equipe/specs-aula/` e **já passaram no `_le-spec.js`**:

| spec | vai ao ar | tema |
|---|---|---|
| `pl28-lentes-gravitacionais` | 29/08 14h | a mesma galáxia aparecendo 4 vezes |
| `pl29-raio-de-schwarzschild` | 30/08 14h | a Terra caberia em 9 mm |
| `pl30-estrelas-de-neutrons` | 31/08 14h | uma colher pesa bilhões de toneladas |
| `pl31-pulsares` | 01/09 14h | o farol que bate melhor que relógio atômico |
| `pl32-magnetares` | 02/09 14h | o ímã que racha a própria estrela |

Os temas **não são invenção minha**: saíram do `MAPA-ESTUDOS.md`, que é a lista oficial do
curso, na ordem didática dela — Lentes gravitacionais → Métrica de Schwarzschild → Estrelas de
nêutrons → Pulsares → Magnetares. E a corrente já está encadeada: cada roteiro anuncia o tema
e a data da aula do dia seguinte.

**Leia os 5 avisos da Tarefa 8 antes de montar a primeira.** Os três que mais importam:
voz **feminina**, **sem bordão**, e **não apague o `>>`** da última linha.

---

## Ordem de trabalho

**6 → 7 → 8.** A 8 é a mais importante e a mais longa; se o tempo apertar, é ela que tem
prioridade sobre a 7.

## O que continua sendo meu

As 7 aulas dos dias **28/08, 03/09, 04/09, 05/09, 06/09, 07/09 e 08/09** são em vídeo no
Google Flow. **Não abra o Flow e não produza esses dias.**

## Se acabar tudo

Escreva no seu status e **fique parado**. Não invente vídeo novo — o que existe fora da grade
vira retrabalho. Se quiser adiantar algo útil sem risco, o único item livre é: conferir se
algum dos 24 vídeos já agendados tem **tema repetido** entre si (`node confere-repetido.js`)
e me reportar. Só reportar, não corrigir.

---

## 🔴 27/08 12h40 — CORREÇÃO URGENTE DE MODELO (leia antes de gerar imagem)

**Use `soul_cinematic`, NÃO `seedream_v4_5`.** Eu tinha escrito o modelo errado na Tarefa 6 e
na 8 — já corrigi as duas no `TAREFAS-2.md`.

| modelo | custo por imagem | 7 imagens |
|---|---|---|
| `seedream_v4_5` (o que eu escrevi errado) | 1,00 cr | **7,00 cr** |
| `soul_cinematic` (o certo) | **0,12 cr** | **0,84 cr** |

O `CLAUDE.md` do estúdio diz, com todas as letras: *"Toda cena = Soul, 0,12cr. Nada de
Seedream/Nano Banana em cena."* Eu vinha desobedecendo isso sem perceber.

**Por que isso é sério agora:** restam **55,72 créditos** e faltam 12 aulas × 7 imagens = 84
imagens. Com Seedream daria 84 créditos — **não caberia**. Com Soul dá cerca de 10.

Parâmetros: `model: "soul_cinematic"`, `aspect_ratio: "9:16"`, `quality: "2k"`.

Se você já gerou alguma com Seedream, **não refaça** — a imagem serve, o crédito já foi. Só
troque daqui pra frente e me diga no seu status quantas saíram no modelo caro.

---

## 🔴 27/08 21h50 — REGRA DE DONO DE ARQUIVO (isto quase custou um vídeo)

Nós dois montamos o `pl33-nucleossintese-estelar.mp4` ao mesmo tempo. A sua versão de 47,29s
e a minha de 48,04s se sobrescreveram — sobrou a última gravada, não a melhor. Deu certo por
sorte, e sorte não é processo.

**Regra a partir de agora: um dono por vídeo.**
- Tudo que é **Flow** (`pl27`, `pl33` a `pl38`) é **meu**. Não monte, não corte, não remonte.
- Tudo que é **imagem** é seu.
- Se achar defeito num vídeo meu, **escreva aqui** em vez de consertar.

### Duas correções ao seu relatório

**1. A `cena9.mp4` NÃO é tela verde.** Conferi frame a frame: são estrelas azuis e douradas
se organizando numa faixa diagonal — é o gancho visual para a aula do diagrama HR. Ela está
no corte final e deve continuar. O arquivo `flow-extra-cena9-tela-verde.mp4` pode ser apagado.

**2. O teto de 48s NÃO vale para aula.** Decisão do Marcelo hoje: *"nas aulas não precisa ter
medo de segundos, desde que seja conteúdo valioso"*. O teto de 42-48s existe para notícia e
viral, onde retenção manda. Já relaxei o `_le-spec.js` para aceitar até 150 palavras em aula.
Você travou corretamente em vez de cortar por conta própria — foi a atitude certa com a
informação que você tinha.

### Elogio devido

As 5 aulas de imagem saíram sem um erro: voz feminina, sem bordão, corrente intacta, Whisper
com `MISSING=NONE` em todas, e todas agendadas com ID. E você respeitou o `soul_cinematic`
depois do aviso. Trabalho muito bom.

---

## Sua próxima tarefa: LIBERADO o espelho no Instagram

A colisão de 04/09 está resolvida (o `nw-onda-choque` foi para 04/09 08h e o Deimos também
subiu; conferi que não há duplicata de horário). **Pode espelhar.**

⚠️ **O CLI do Higgsfield MORREU.** `higgsfield upload create` aponta para `fnf.higgsfield.ai`,
que saiu do ar (DNS: non-existent domain). Então o `insta-fila-add.js` vai falhar no upload.

**O que já está feito:** `pl27`, `pl28` e `pl29` já estão na fila do Insta (subi as mídias pelo
MCP e montei os itens à mão).

**O que falta:** espelhar `pl30`, `pl31` e `pl32` (31/08, 01/09 e 02/09, às 14h).

Se você tiver um caminho de upload que funcione, use. Se não tiver, **me avise aqui** que eu
subo as mídias e você monta a fila. Não invente endpoint e não faça push parcial.
