# CONTRATO DE SPEC — leia inteiro antes de escrever qualquer arquivo

> Este arquivo é o combinado entre **duas IAs trabalhando no mesmo canal**: o ChatGPT escreve
> os specs, o Claude produz os vídeos. O objetivo é que ninguém consiga dizer qual vídeo saiu
> de qual — mesmo estilo, mesmo padrão, mesma régua.
>
> Criado em 26/08/2026, depois do vídeo `nw-tres-buracos-negros` ser aprovado pelo Marcelo.
> Esse vídeo é o **modelo vigente**: quando houver dúvida, abrir
> `exports/nw-tres-buracos-negros/` e copiar o que está lá.

## Divisão de trabalho — quem faz o quê

| tarefa | quem | onde escreve |
|---|---|---|
| pesquisar a notícia e conferir a fonte | **ChatGPT** | — |
| escrever o spec (roteiro, cues, prompts, título, descrição, tags) | **ChatGPT** | `lotes/pendentes/<slug>.json` |
| gerar as imagens no Higgsfield | **Claude** | `exports/<slug>/img1..7.png` |
| montar, auditar e entregar o .mp4 | **Claude** | `exports/<slug>/<slug>.mp4` |
| agendar no canal | **Claude** | — |

🚫 **O ChatGPT NUNCA escreve dentro de `exports/`.** Aquela pasta é do Claude.
🚫 **O Claude NUNCA edita `lotes/pendentes/`.** Ele só lê e move para `lotes/prontos/`.
Foi a mistura de dois processos escrevendo no mesmo lugar que duplicou um Reels em 20/08.

## O arquivo que você deve entregar

Um JSON por vídeo, em `lotes/pendentes/<slug>.json`, com **exatamente** estes campos:

```json
{
  "slug": "nw-nome-curto-em-kebab-case",
  "stream": "news",
  "track": "dark-some-amount-of-evil.mp3",
  "topic": "palavras-chave do tema, sem acento, para busca interna",
  "isca": false,
  "title": "📰 Título com NEGAÇÃO e (parênteses) 🕳️ #Shorts",
  "desc1": "Parágrafo único com os fatos e a fonte com data. Vai virar a descrição.",
  "tags": ["7 tags", "a primeira é a keyword principal"],
  "hashtags": ["#tema", "#astronomia", "#neuralupdate"],
  "hook": "TRÊS BURACOS\nNEGROS NA\nMESMA GALÁXIA",
  "roteiro": "frase 1\n\nfrase 2\n\n...\n\nNeural Update. O universo está te esperando.",
  "cues": ["Uma galáxia com três", "É a primeira vez", "..."],
  "prompts": ["prompt da img1 em inglês", "..."],
  "fonte": "Instituição / veículo, DD/MM/AAAA + URL",
  "extra": "uma linha de contexto que não coube no roteiro"
}
```

`publishAt` **não** vai no arquivo — quem define o horário é o Claude, ao agendar.

## As regras do roteiro (medidas, não opinião)

**Duração-alvo: 43 segundos. Isso significa ~86 palavras no corpo**, mais o bordão.
Medido em 26/08 sobre 32 vídeos, régua de views nas primeiras 72h:

| duração | views medianas |
|---|---|
| 36-42s | **690** |
| 43-48s | 590 |
| 49-60s | 414 |

Passar de 48s custa caro. O vídeo modelo tem 86 palavras e deu 43,7s — use isso como referência
de conversão (~0,48s por palavra).

**Estrutura obrigatória:**

1. **Frase 1 = substantivo concreto nomeando o objeto novo.** Notícia/descoberta abre nomeando,
   não com "você". Ex.: `Uma galáxia com três buracos negros gigantes no centro.`
   🚫 **NUNCA abrir com número ou estatística** — os piores vídeos do canal em taxa de skip
   foram exatamente esses ("2 MILHÕES de km/h", "18 HORAS", "6.400 km"). Número exige
   processamento e a audiência fria pula antes de processar.
2. **A revelação mais forte tem que cair entre o segundo 5 e o 7.** Em 27 de 55 Shorts a maior
   queda de retenção está exatamente nesse trecho — o gancho segura, e o que mata é a segunda
   frase virar explicação. A frase 2 tem que ser **o segundo fato**, não o contexto do primeiro.
   Na prática: a palavra-soco precisa estar por volta da palavra 12-16 do roteiro.
3. **Um "MAS" no meio.** O loop aberto é o que segura: dá o fato, e então a contradição que
   impede o final feliz. No modelo: *"Mas essa luz saiu quando o universo tinha um bilhão e
   duzentos milhões de anos"* — o buraco negro não teve tempo de crescer.
4. **Fecha com pergunta aberta**, nunca com cartaz nem pedido.
5. **Última linha é sempre** `Neural Update. O universo está te esperando.` (precedida de linha
   em branco). Não mudar uma vírgula disso.
6. 🚫 **Nenhum CTA dentro do vídeo.** Decisão de 19/08: o CTA queimado cai no trecho de 0,11 de
   retenção e derruba o vídeo. A oferta vive no comentário fixado.
7. **Nunca inventar número fora da fonte.** A fonte da notícia vai só na descrição, nunca na
   narração. A voz nunca lê URL.

## Palavra estrangeira: escreva a grafia fonética

O TTS (Edge, pt-BR) lê `Hubble` como **"rabo"**. A grafia que funciona é **`Rá-bol`, com hífen**.
Quando o roteiro tiver nome estrangeiro (Webb, Voyager, Falcon, Roman, Kepler…), escreva no
campo `roteiro` a grafia fonética e avise no `extra` qual palavra é, para o Claude substituir na
legenda. Sem isso o vídeo sai com a voz falando bobagem.

## Os prompts de imagem — o que funciona (medido em 26/08)

7 prompts, em **inglês**, um por cena, na ordem das `cues`.

✅ **O que dá certo:**
- O objeto **grande e dominante no quadro**: `subject large and dominant in frame`,
  `filling most of the tall vertical frame`, `edge to edge`
- Contraste alto: `bright and high contrast against black space`
- Registro: `cinematic scientific documentary photography`, `astronomical survey image`
- Emoção: `immediate awe`, `sense of scale that feels physically impossible`

🚫 **O que NÃO usar** (o padrão antigo do canal, que estava encolhendo o objeto):
- `composed in the upper two thirds ... clear empty space along the bottom edge` — isso deixa o
  objeto minúsculo e o quadro quase preto. Foi o que estragou 4 das 7 cenas do vídeo modelo e
  obrigou a refazer.
- `only two focal points and nothing else in frame` — em cena de campo profundo, empobrece.

## As `cues` — a regra de ouro

`cues[i]` são as **primeiras 3-4 palavras da frase onde a imagem i entra**. Elas têm que existir
**literalmente** no roteiro, com a mesma grafia. É isso que faz a imagem trocar no assunto e não
no relógio.

Número de cues = número de prompts = número de cenas. **7 é o padrão.**

## Antes de entregar, confira

- [ ] O tema **não está** em `lotes/TEMAS-JA-USADOS.txt` (274 títulos já publicados). Em 13/08
      um roteiro saiu igual palavra por palavra a um que já existia.
- [ ] Corpo do roteiro entre **80 e 90 palavras**
- [ ] Frase 1 começa com substantivo concreto, sem número
- [ ] A palavra-soco está entre a palavra 12 e 16
- [ ] Tem um "mas" estrutural no meio
- [ ] Termina com pergunta + bordão exato
- [ ] Cada `cue` aparece literalmente no roteiro
- [ ] `fonte` tem instituição, data e URL
- [ ] Nenhum prompt usa as expressões proibidas acima

## Como avisar que terminou

Escreva o arquivo em `lotes/pendentes/` e avise o Marcelo. O Claude verifica a fonte antes de
gastar crédito — se o fato não bater com a fonte, o spec volta.
