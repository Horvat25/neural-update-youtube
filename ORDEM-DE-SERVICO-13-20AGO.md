# ORDEM DE SERVIÇO — 13 a 20/ago/2026

> Escrita em 12/ago no fim de uma sessão longa. **Tudo aqui já foi decidido e validado com
> dados** — não re-discutir, só executar. O contexto completo está nas memórias
> `inteligencia-viral-shorts`, `meta-4000-horas-longos` e `conversar-com-outra-ia`.

## AS REGRAS NOVAS (valem pra tudo que for produzido)

1. **Short = 35 a 43 segundos.** Não 45+. Diferença medida: 62,1% de "Continuaram assistindo"
   abaixo de 44s contra 45,9% acima. É o ajuste de maior impacto e custa zero.
2. **"Você" só com objeto astronômico.** "Você + corpo humano" sai do micro-nicho do canal e
   despenca (20,2%). "Você está viajando a 2 milhões de km/h" fez 76,9% — o pronome não é o
   problema, o assunto é. Técnica: **o espectador como régua de escala cósmica**.
3. **CTA da isca DENTRO da conclusão**, nunca como cena colada depois do fecho. Os vídeos de
   70%+ terminam com frase de impacto que fecha o conceito; os que caem têm CTA desconectado.
4. **Traduzir número astronômico para escala doméstica** — o "papel dobrado 42 vezes" é o modelo.
5. **No longo: 50% do esforço em capa + título.** Não é exagero: 2.161 impressões × 1,3% de CTR
   é o que matou o último longo. Não é distribuição, é conversão.

## 1. NOTEBOOKLM — 3 perguntas finais

⚠️ **Ler as respostas com `read_page` no ref do painel (`filter: all`, 30-40k), NUNCA por print.**
Antes, adicionar as 5 fontes novas (o diálogo "Adicionar fonte" precisa de screenshot pra achar
o caminho do link):
- vidiq.com/blog/post/how-to-generate-4000-hours-watch-time-youtube/
- nexlev.io/get-watch-hours
- kingfinitycreator.com/blog/how-to-get-4000-watch-hours-youtube
- ytmoneycalculator.com/blog/how-to-get-4000-watch-hours-fast-on-youtube/
- influenceflow.io/resources/youtube-channel-monetization-requirements-the-complete-2026-guide/

**Pergunta 1 — contestar o "1 longo por semana".** O Studio recomendou 1/semana assumindo
produção cara e humana. No nosso caso produzir é barato (agente + 0,12cr/imagem) e o gargalo é
CTR, não capacidade. Com produção quase gratuita, qual a frequência ótima? Existe risco real de
o algoritmo "punir" volume quando o CTR médio é baixo, ou o risco é só desperdício de esforço?

**Pergunta 2 — a curva de aprendizado do canal.** Nosso canal é lido como canal de Shorts.
Quantos vídeos longos consecutivos com CTR 6%+ são necessários pra o YouTube reclassificar o
canal e começar a distribuir longo em Navegação? Existe número conhecido?

**Pergunta 3 — live.** Live conta pras 4.000 horas. Qual o desenho de live que NÃO cai em
"conteúdo reutilizado" e trava o YPP? Duração, frequência e quanto de conteúdo precisa ser
original por transmissão?

## 2. CONSERTAR O CATÁLOGO — fazer ANTES de produzir (custo zero, ganho imediato)

O YouTube reavalia o vídeo toda vez que a capa ou o título muda. Ordem:

| Vídeo | Hoje | Novo título | Nova capa |
|---|---|---|---|
| 10 lugares onde você não sobrevive | 2.161 impr · **CTR 1,3%** | "O lugar que derrete ossos em segundos" | 1 elemento aterrorizante, 60% do quadro |
| Por que a Lua é cheia de crateras | **CTR 10%**, sem impressão | "A Terra foi atingida e ninguém te contou" | a Lua ocupando 60%, sem texto longo |
| Por que a Lua não cai na Terra | CTR 4% · 75 impr | "A Lua está caindo (e por que isso é bom)" | idem |

Mais, sem editar vídeo:
- **Playlist "O Universo Quer te Matar"** com os vídeos de lugares/perigos, em sequência automática
- **Seção "Assista a seguir"** na home, primeira = "Mistérios do Sistema Solar"
- **Comentário fixado em todo Short de astronomia:** "Fiz um documentário de 10 min explicando o
  que acontece se [tema] der errado — assiste aqui"
- **"Vídeo relacionado" de cada Short → longo do MESMO tema** (ponte de tópico; o sistema precisa
  ver que quem viu o Short da Lua também clicou no longo da Lua)

## 3. OS 2 VÍDEOS LONGOS

**Formato:** 10-12 min · "Astronomia Comparada" · lista com escalada crescente · cold open com o
momento mais chocante + "e essa é só a número nove" · cartelas de capítulo com contador
(`capitulos.txt`) · `numeros.txt` pra dígito na legenda · `cues.txt` com piso de 5s.

**Longo #1 — "O que aconteceria se a Terra tivesse os anéis de Saturno?"**
Tema cravado pelo Studio com potencial de **3x mais tempo de exibição**. Cai no cluster
Lua/Planetas que o público já validou.

**Longo #2 — escolher no cluster "pavor espacial"** (o de maior % assistida, 43%), sem repetir
o tema do #1. Sugestão: "O Universo Quer te Matar" como episódio 1 de série, alimentando a playlist.

**Custo:** ~5cr cada (cenas Soul V2 0,12 + thumbnail premium, teto 5cr). Saldo: 66 créditos.

## 4. SHORTS ATÉ QUINTA 20/ago — 3/dia, grade intacta

08h notícia · 14h aula (ímpar) / VSL (par) · 18h viral "régua cósmica"
**Todos com 35-43s.** A pl17 é dívida: a pl16 promete aula pro sábado 15 às 14h.

## 5. ESTADO DA OPERAÇÃO (pra não redescobrir)

- **Instagram: automático e funcionando** — GitHub Actions, repo `Horvat25/gram-text-wizard`,
  `publicador/fila.json` + 2 workflows. Secret `IG_TOKEN` cadastrado e validado.
  Fila cheia até 14/08. Vigia diário às 09h avisa por email.
- **Token do Instagram: renovar até 10/nov/2026** (data access, 90 dias).
- **YouTube agendado até 13/08.** Depois disso, vazio.
- **Lovable/Supabase MORTO** — blog e captação de email seguem fora do ar. Não depender.
- **Higgsfield:** 66 créditos, plano starter. Sem ilimitado (a promo do Seedance 2.5 começa no Plus).

## 6. O QUE O MARCELO PEDIU E EU DEVO ENTREGAR

"Me surpreenda." O critério dele não é volume — é o vídeo ficar **digno de viralizar**. E a
regra que ele fixou hoje: **chegar nas 4.000 horas o mais rápido possível, com qualidade.**
Isso decide qualquer empate de prioridade.
