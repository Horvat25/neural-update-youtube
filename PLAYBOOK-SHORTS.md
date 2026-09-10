# PLAYBOOK — Como criar um lote de Shorts (modelo vigente, jul/2026)

Modelo de produção validado no lote w1-w14 (05-11/07). TODO lote novo segue este template.
Base: dados reais do canal (28 dias) + inteligência viral diária (memória `inteligencia-viral-shorts`).

## 🔴 REVISÃO 06/08/2026 — LEIA ANTES DAS LEIS ABAIXO (duas delas foram derrubadas por dado novo)

Análise de 50 vídeos no Studio (Modo avançado, 4 métricas separadas) + confronto com o NotebookLM
de viralização. Detalhes e números em `~/.claude/projects/D--Neural-Update/memory/inteligencia-viral-shorts.md`
(entrada de 06/08) e `metricas-retencao-shorts.md`. O que MUDA:

1. **A Lei Zero ("abrir com VOCÊ") agora depende do FORMATO.** Os 3 melhores em *Continuaram assistindo*
   (68,7% / 68,5% / 67,3%) são todos **notícia de descoberta** e abrem com **substantivo concreto
   nomeando o objeto novo** — sem "você", sem número, sem verbo ("O BURACO NEGRO MAIS ANTIGO JÁ ACHADO",
   "ACHARAM UM SINAL DE VIDA?", "UM VISITANTE DE OUTRA ESTRELA"). Os que abriram com "Você..." ficaram no
   MEIO da tabela. → **Notícia/descoberta: substantivo concreto no frame 0.** O "VOCÊ" continua valendo
   pro formato **viral existencial** (é lá que ele converte inscrito).
2. **"45-52s = morto no algoritmo" está ERRADO.** A Lei dos 25s confundiu *porcentagem visualizada* com
   *distribuição*. Os 3 melhores em anti-skip têm **47s, 54s e 63s** — os mais LONGOS do estudo. Mistério
   de descoberta precisa de espaço pra montar tensão. **Sweet spot geral: 40-45s** (confirmado pela
   literatura de 2026 e pelo nosso ranking composto: os 3 melhores nas 4 métricas somadas têm 44s, 37s e 41s).
   Descoberta pode ir até ~54s; existencial curto (34-44s) é o que mais converte inscrito.
3. **NUNCA abrir com número/estatística.** Os piores em skip foram exatamente esses:
   "2 MILHÕES de km/h" (48%), "6.400 km" (40%), "18 HORAS" (42%). Número exige processamento cognitivo e
   a audiência fria pula antes de processar. Exceção: o número de EPISÓDIO da saga (série numerada).
4. **Logo do canal sai do frame 0** (entra só depois de 0,5s). Logo no primeiro frame grita
   "institucional" pra audiência fria e aciona swipe reflexo; conteúdo com cara de UGC performa melhor.
5. **NOVO — os 3 primeiros segundos têm estrutura fixa** (método "Stop, Hook, Payoff"):
   - **0,0-0,5s — STOP:** sem logo, **sem narração**. Imagem de altíssimo contraste com punch-in (zoom
     de impacto) + som de impacto (sub-drop/glitch). Texto estático curto e gigante. Paralisa o polegar
     antes de o cérebro decidir pular.
   - **0,5-1,5s — HOOK:** hard cut pra img2 (movimento lento). Entra a narração **nomeando o objeto concreto**.
   - **1,5-3,0s — TENSÃO:** img3 + frase contrariante **contra a CIÊNCIA**, nunca contra o espectador
     ("num lugar onde a física diz que deveria haver apenas silêncio").
6-A. **NOVO (06/08, padrão fixado pelo Marcelo) — VOZ POR STREAM e FECHO DA AULA.**
   - **Aula (🔭/🎓) = voz FEMININA (Thalita). Todo o resto = MASCULINA (Antonio).** O padrão tinha
     derivado (pl12 e pl13 saíram com voz masculina por esquecimento). Agora o `make-short-img-flex.js`
     decide sozinho pelo `meta.json`: usa `_prod.voice`, ou cai pra feminina quando `_prod.stream === 'aula'`.
     A env `SHORTS_VOICE` continua vencendo se precisar forçar.
   - ⚠️ **A voz feminina é MAIS LENTA que a masculina.** O mesmo roteiro rende ~15% a mais de duração e
     TODOS os tempos de deixa mudam. Sempre rodar `node cue-check.js <slug>` **com a voz certa**
     (`SHORTS_VOICE=female`) antes de gerar imagem de aula.
   - **Toda aula fecha anunciando a PRÓXIMA**, com tema + dia da semana + data + horário
     ("Na próxima aula: … Quinta, dia treze, às duas da tarde."), e só depois o bordão. Dar deixa
     separada pra "Na próxima aula" e outra pro "Neural Update" — senão o bloco final passa de 13s.
   - **Uma aula = UMA ideia.** A `pl15` primeiro tentou ensinar paralaxe + estrelas pulsantes +
     supernovas em 48s e o Marcelo não entendeu ("não entendi esse"). Reescrita só com paralaxe, e com
     o elo causal que faltava (*quanto mais longe, menor o pulo*), ficou clara. O que sobra vira a
     aula seguinte — o corte alimenta a série em vez de virar entulho.

6-B. **NOVO (06/08, pedido do Marcelo) — SINCRONIA IMAGEM×FALA via `cues.txt`. Obrigatório em todo vídeo.**
   Antes, as cenas eram fatias IGUAIS da narração (ex: 10,3s cada): a imagem trocava no relógio, não no
   assunto — a voz já falava da noite e a tela ainda mostrava o dia. Agora cada imagem tem uma DEIXA.
   - Criar `exports/<slug>/cues.txt` com **1 linha por imagem** = o trecho do roteiro onde ela deve ENTRAR.
     A linha não precisa de acento nem pontuação (o casamento é normalizado), mas as deixas têm que estar
     **na mesma ordem do roteiro** e separadas por mais de 0,8s de fala.
   - O `make-short-img-flex.js` acha a deixa nos timings do TTS e dá a cada cena exatamente a duração
     daquele trecho falado. Se faltar deixa, sobrar, ou alguma não casar, ele AVISA e volta pras fatias iguais.
   - **Mais imagens, cenas mais curtas.** O teto subiu de 7 pra 16 imagens. Referência do vídeo
     `nw-dois-crepusculos` (52s): **11 cenas**, de 2,2s a 7,2s cada, uma por batida da fala.
   - Regra de ouro: **substantivo concreto na narração = imagem daquele substantivo na tela.** Se a voz
     diz "noite permanente", a tela mostra a noite naquele segundo — não 4 segundos depois.

6. **NOVO — reset de atenção aos ~25s:** parar a trilha por 1 segundo e fazer uma pergunta de reancoragem
   ("Mas o que os astrônomos não esperavam era isso..."). Impede o despencar da retenção antes do final.
7. **Contexto que evita pânico:** retenção CAI quando o alcance sobe (medimos r = −0,64 entre views e
   "continuaram assistindo" dentro da mesma remessa). É diluição por audiência fria no modo "Exploit" do
   algoritmo, não piora de conteúdo. Alvo de qualidade citado nas fontes: **>74% de porcentagem visualizada**.

---

## ⭐ LEI ZERO — "A DANÇA" (img1 × 1ª legenda). Descoberta 15/07/2026. ⚠️ Ver revisão de 06/08 acima: vale pro formato VIRAL EXISTENCIAL; em notícia de descoberta, o frame 0 é substantivo concreto.

O `ass-captions.js` usa `group: 2` e fatia a partir da palavra 1 → **a 1ª legenda na tela são as 2 PRIMEIRAS
PALAVRAS do roteiro**. É determinístico: dá pra projetar. Esse é o único texto que a pessoa lê no exato
segundo em que decide pular (48% pulam — nosso gargalo nº1).

**Coreografar:**
- **img1** = o impossível VISTO (clímax visual).
- **palavras 1-2 do roteiro** = afirmação INCOMPLETA apontada pro espectador (de preferência com "VOCÊ").
- A tensão entre ver o impossível e ler uma frase inacabada dirigida a você = a coceira que obriga a ficar.

✅ `VOCÊ CONSEGUIRIA voar batendo os braços...` (+ img de astronauta alado)
✅ `VOCÊ NASCEU na única época em que...` · `NINGUÉM SABE onde ele está...` · `ISSO NÃO deveria existir...`
❌ NUNCA abrir com preparação: "Existe uma...", "Em Vênus...", "O que é...", "Imagina que..."

## ⭐⭐ LEI ZERO-B — O LOOP ABERTO (MAS/PORTANTO). Validada nos dados 23/07. Vem junto com A Dança.

Provado nos últimos 7 dias: **"O FAROL mais brilhante do universo é um buraco negro"** = 948 views,
111% de retenção (re-assistido) — o MAIOR da semana. Já **"Existe um planeta feito de DIAMANTE"** teve
gancho igual de bom (283 views) mas só **43% de retenção**: a pessoa saiu no meio. A diferença NÃO é o
gancho — é o LOOP. O FAROL abre um paradoxo (um buraco negro, que não emite luz, ser o "farol mais
brilhante") que o cérebro é OBRIGADO a fechar (Zeigarnik); o DIAMANTE entregou a resposta cedo e liberou
a pessoa. **Gancho enche a sala; loop aberto segura a sala.**

**Estrutura obrigatória do roteiro (Mark Rober — "Padrão de Caça do Velociraptor"):**
- **GANCHO** = a promessa impossível / o paradoxo (frase 1, com a keyword).
- **MAS** (o conflito) = a contradição que impede o final feliz — mantém o loop ABERTO no meio do vídeo,
  exatamente onde o DIAMANTE morreu. Ex.: "vale trilhões, MAS você morreria em milissegundos aqui".
- **PORTANTO** (a resolução) = o payoff que reenquadra tudo — só entrega no fim, e conecta no loop de comentário.

**Foreshadowing Visual (Jenny Hoyos — como bater 70% de gancho):** no segundo ~0,5, piscar o frame do
CLÍMAX (a img mais impactante) por ~0,2s antes de continuar. "Engana" o cérebro a esperar o payoff prometido.
No pipeline: img1 do prompts.txt já é o clímax — garantir que ele apareça um flash no início E no fim.

**Regra dos 3 Elementos (Paddy Galloway) pro 1º frame:** 1 imagem forte + 1 título curto + 1 narração —
nunca os três competindo/poluindo. Se o frame tem texto demais, corta.

## As 7 leis do lote (por quê de cada uma)

1. **Lei da duração — REESCRITA em 06/08/2026** (a versão antiga dizia "nunca passar de 35s / 45-52s é
   morto"; os dados derrubaram isso — ver revisão no topo). A duração média de visualização segue ~25s,
   mas *porcentagem visualizada* não é o mesmo que *distribuição*: os 3 melhores em "Continuaram
   assistindo" têm 47s, 54s e 63s. Alvos por formato:
   - **Notícia / descoberta: 40-54s** (~90-115 palavras). Precisa de espaço pra montar o mistério.
   - **Viral existencial: 34-44s** (~75-95 palavras). É o que mais converte inscrito.
   - **Padrão quando em dúvida: 40-45s.** Sweet spot confirmado pela literatura e pelo nosso ranking
     composto das 4 métricas (top 3 = 44s, 37s, 41s).
   - Continua valendo: nada de encher linguiça. Se a frase não abre tensão nem entrega payoff, corta.

2. **Anti-repetição (filtro de março/2026).** O YouTube SUPRIME canais que repetem a mesma
   estrutura/estilo. Cada lote deve VARIAR:
   - **Estrutura do roteiro** (rotacionar): Detetive (enigma→suposição errada→revelação) ·
     Cenário "e se acontecesse agora" · Antes/Depois ("a ciência achava X, descobriu Y") ·
     Vertigem de escala · How-to cósmico · Gênio+fato bizarro.
   - **Estilo visual** (variar nos prompts): macro fotográfico · documental anos 70 com grão ·
     pintura a óleo/candlelight (históricos) · minimalismo (vazios) · horror escuro · céu noturno humano.

3. **Triângulo de keyword (Gemini update jan/2026).** A keyword do vídeo aparece literalmente em
   4 lugares: título + hook na tela + 1ª frase da narração + 1ª linha da descrição.

4. **1º frame = imagem do clímax.** A img1 do prompts.txt é a imagem MAIS chocante do vídeo
   (o pagamento visual), nunca cena de estabelecimento. 85% assistem sem som: hook text + img1
   carregam o vídeo sozinhos no primeiro 0,5s.

5. **Final satisfaz, depois provoca.** O YouTube prioriza "satisfação" sobre watch time.
   Todo roteiro ENTREGA a melhor resposta real da ciência (nunca só cliffhanger) e SÓ DEPOIS
   solta a isca de comentário: um superlativo defensável/corrigível ou pergunta de debate
   (efeito TON 618 → 5 comentários → 1 vídeo novo da correção).

6. **Loop fechado.** Última frase conecta gramaticalmente com a abertura (re-assistida conta view).
   No pipeline, a última cena já faz zoom de recuo automaticamente.

7. **Som 100% original.** Canal <50k inscritos ganha bônus de som original (março/2026):
   TTS + trilha própria SEMPRE, nunca trend audio.

## Receita por vídeo (arquivos em exports/<slug>/)

- `roteiro.txt` — 58-68 palavras. ⚠️ **SEMPRE com ACENTOS corretos (UTF-8).** O `make-short-img-flex`
  lê em utf8 e manda pro TTS; sem acento o TTS pronuncia ERRADO ("está"→"esta", "é"→"e", "torça"→"torca")
  e fica robótico. Nunca escrever sem acento pra "fugir de escape de terminal" — usar heredoc `<<'EOF'`
  ou o Write tool (erro real cometido 23/jul: 3 vídeos saíram com narração sem acento e tiveram que ser refeitos).
  Ordem: gancho keyword (frase 1) → 2º soco factual (seg. 3-8,
  a "zona de morte" pós-hook) → suposição errada ou desenvolvimento → revelação/resposta real →
  **PIVÔ POÉTICO** (penúltima frase) → **FECHO PADRÃO** (share OU COSMOS + bordão — ver seção própria).
  - **Linguagem Ativa (Johnny Harris) — regra de escrita, vale pra CADA frase:** sujeito + verbo de
    AÇÃO + objeto. "Eles fugiram" nunca "houve uma migração"; "a estrela te dissolve" nunca "ocorre
    dissolução". Voz passiva e substantivo abstrato = a pessoa pula. Teste de 5ª série: se uma criança
    de 10 anos não entende a frase de primeira, reescreve.
  - **PIVÔ POÉTICO (Carl Sagan / Tyson) — agora OBRIGATÓRIO, não opcional.** Antes do fecho, uma frase
    que transita do dado frio pra PERSPECTIVA CÓSMICA + pertencimento ("e você nasceu bem a tempo de
    ver isso", "esse pontinho é tudo que você já amou"). PROVA nos nossos dados: os 2 maiores retentores
    do canal (FAROL 111%, Pale Blue Dot 84%) têm esse pivô; os que só entregam fato e cortam, não.
  - ⚠️ **ARMADILHAS DE PRONÚNCIA DO TTS** (o Marcelo pega isso de ouvido — 13/08/2026).
    O Edge TTS erra a vogal aberta/fechada em alguns pares. **Confirmado: `entorta` /
    `entortado`** — ele fecha o "o" e sai "entôrta" quando o certo é "entórta".
    Não dá pra consertar com acento no texto: a legenda é gerada das palavras do TTS e sairia
    escrita errado na tela. **A solução é TROCAR A PALAVRA:** entorta → **curva, deforma, torce,
    dobra**. Mesma regra pra qualquer par verbo/substantivo com tonicidade diferente.
    Antes de fechar o lote, varrer os roteiros atrás dessas palavras.
- `hook.txt` — ≤ 3 linhas de 18 chars, UMA palavra em CAPS, carrega o choque sozinho.
- `prompts.txt` — **5 imagens** (com seg mínimo de 6s do make-short-img-flex, 5 cenas fecham ~30s
  certinho). img1 = clímax. Estilo visual coeso dentro do vídeo, DIFERENTE dos vídeos vizinhos.

  ⭐ **A img1 É A QUE VIRALIZA — fórmula "scroll-stopper" (notebook, 23/07). Ela para o dedo no 1º 0,5s.**
  No Soul V2 (0,12cr/2k), ganha-se no PROMPT: descreva LUZ e LENTE — é o que separa amador de banger.
  Os 7 elementos que a img1 tem que ter: (1) **escala impossível** (astronauta ao lado de átomo gigante =
  espanto visceral); (2) **só 2 pontos de foco** (Regra dos 3 Elementos — nunca poluir); (3) **contraste
  MrBeast** (cores/luz de alto contraste que "armam" o frame contra o fundo escuro do feed); (4) **foco no
  centro/terço superior** (a UI de curtidas/descrição não pode esconder o segredo); (5) **emoção de awe**
  (choque ou curiosidade intelectual imediata); (6) **textura fotorrealista com defeito de câmera real**
  (grão, aberração cromática — foge do "AI slop limpo demais"); (7) **foreshadowing** (mostra uma fração
  do clímax pra abrir o loop já no frame 1).
  **Erros que MATAM a img1:** poluição visual (clutter) · "visual Wikipedia" (entregar a resposta antes da
  pergunta → pessoa pula) · imagem limpa demais (cara de IA).
  **TEMPLATE preenchível pra img1 (colar, trocar só o [ASSUNTO]):**
  `Cinematic 9:16 vertical shot, [MAIN SUBJECT IN IMPOSSIBLE SCALE], rule of thirds with only 2 focal points, extreme low angle looking up to emphasize power, shot on ARRI Alexa with 35mm anamorphic lens, subtle chromatic aberration, high contrast chiaroscuro lighting, deep cosmic shadows, photorealistic texture with visible grit and floating dust particles, vivid glowing accents against void black background, no text, no words, no letters, no watermark`
  ⚠️ **Minha correção sobre o template do notebook:** ele terminava com "8k resolution, insane detail" —
  são JUNK TOKENS que os modelos de 2026 ignoram (pesquisa Rory Flynn, ver memória [[prompt-imagem-ia]]).
  Troquei por detalhe físico concreto + o negative de texto obrigatório (imagem de IA NUNCA leva texto).
- `meta.json` — title ≤60 chars com keyword no início + superlativo; descrição com keyword na
  1ª linha; CTA do blog só na descrição (nunca na voz); privacyStatus private (agendamento).

## Montagem e agendamento

```powershell
# imagens (pula existentes, ~0,12cr cada via Soul V2)
.\gen-imgs.ps1 -dir "exports\<slug>"
# vídeo (OUT SEMPRE caminho absoluto; trilha por mood — ver abaixo)
node make-short-img-flex.js "exports\<slug>" "<ABS>\<slug>.mp4" "<topico>" "<trilha>.mp3"
# agendar (BRT→UTC: 09h=12:00Z, 18h=21:00Z)
node post-video.js "exports/<slug>/<slug>.mp4" "exports/<slug>/meta.json" 2026-MM-DDTHH:00:00.000Z
```

### 🎵 TRILHA — prioridade por DESEMPENHO MEDIDO (atualizado 25/07/2026)

🚨 **A lista antiga desta seção recomendava 3 trilhas BANIDAS** (`cosmic-the-descent`,
`cosmic-infinite-perspective`, `dark-bump-in-the-night` — Content ID silencia, estão em
`assets/music-quarantine/`). Corrigido. `tech-pixelland` também está fora (o Marcelo odiou).

**Só existem 7 trilhas vivas em `assets/music-real/`.** Ordem de preferência, medida por
**RETENÇÃO** (é o que a música afeta — trilha não faz clicar, faz FICAR), comparando
sempre DENTRO do mesmo formato:

| Trilha | Retenção medida | Peso | Usar em |
|---|---|---|---|
| **dark-some-amount-of-evil** | 147% 144% 80% 66% 57% | **4** | sombrio, morte, vazio, silêncio, aula densa |
| corp-upbeat-forever | 85% | 2 | esperança, descoberta, humano |
| quantum-investigations | 103% 50% 43% 36% | 2 | paradoxo, mistério, sinal |
| dark-tension-pixabay | *sem dado* | 2 | sombrio (2º na fila) |
| cosmic-ambient-espacial | *sem dado* | 2 | imensidão, escala |
| cosmic-ice-flow | 67% 62% 57% 45% | **1** | evitar — 4 dos 10 vídeos menos vistos |
| news-rising-tide | 58% | **1** | evitar — usada 2x, as 2 no fundo |

**Como isso é aplicado (não depende de eu lembrar):** o `music-manager.js` sorteia a trilha
**PONDERADO** por esse peso (`TRACK_WEIGHT`). A melhor sai ~2/3 das vezes; a fraca continua
saindo ~1/3 — de propósito, **pra não matar o teste**. Nenhum peso é 0.

⚠️ **A amostra ainda é pequena (n=17 com retenção) e confundida com formato.** Isso é SINAL,
não lei. **Não zerar peso nenhum** e **não refazer vídeo pronto por causa disso.**
**Reavaliar com `node trilha-report.js`** — todo `meta.json` grava `track` desde jul/2026,
então a amostra dobra a cada ~2 semanas. Quando passar de n=30, apertar os pesos.

🐛 **Conserto junto (25/07):** o mood do bed `dark` ainda era do nicho VELHO (hacker, deepfake,
fraude) — nenhuma palavra de astronomia. Resultado: a trilha de melhor retenção do canal era
**inalcançável** pelo roteador; só entrava quando eu passava na mão. Adicionadas as palavras
de astronomia sombria (morte, vazio, silêncio, devora, canibal, colapso…).

Slots: 09h e 18h BRT, 2/dia. NUNCA madrugada (todo flop histórico do canal foi horário).
Slot 14h é reservado pros vídeos de marketing/afiliado.

## Clusters de tema que performam (dados do canal)

Aliens/mistério (teto mais alto: 643-1241 views) · Horror cósmico (consistência 570-790) ·
Vertigem de escala · Gênio + fato bizarro (Einstein lidera) · Conceito pessoal chocante (maior % like).
⚠️ Quântica SÓ com framing pessoal ("isso quebra sua cabeça"), NUNCA framing tech ("computador quântico" flopou 2x).
Antes de escolher temas: conferir TODOS os já usados (data/posts.json + uploads do canal) — zero repetição.

## 🎓 A ESCOLA (série didática das playlists — formato próprio, jul/2026)

Produto separado dos Shorts virais: aulas de astronomia pra ADULTO (nunca infantilizar — o público é adulto),
tom de mentor brilhante (Feynman/Sagan: clareza profunda, respeito pela inteligência). Temas: `MAPA-ESTUDOS.md`.

- **Estrutura AULA (75-90 palavras, ~35-40s):** pergunta que todo adulto já se fez → a resposta errada que
  a pessoa carrega da escola → o modelo mental certo com UMA analogia precisa → a prova no mundo real
  (GPS, luz entortando, satélites) → fechamento-compromisso: **"Na próxima aula: X. [Dia da semana], dia [N],
  às 2 da tarde. [Te espero / Não chega atrasado / Marca aí]"** — o anúncio COM data e hora cria encontro
  marcado (estilo série de TV) e OBRIGA a próxima aula a existir naquele slot. Conferir sempre que a aula
  anunciada bate com a produzida.
- **Identidade da série:** voz FEMININA (`$env:SHORTS_VOICE='female'` → Thalita) + trilha fixa
  `cosmic-infinite-perspective.mp3` + 🎓 no título + "AULA da escola Universo do Zero" na 1ª linha da descrição
  + link da playlist na descrição.
- **Playlists (EXCLUSIVAS das aulas — viral não entra):** básico `PLQlXGsP6ERAs` (Universo do Zero) ·
  avançado `PLBLw9ndJiuyc` (Universo Avançado). Ao publicar: `node add-to-playlist.js <videoId> [pos] [playlistId]`.
- **Cadência:** slot 14h BRT (17:00Z), dias ALTERNADOS com os vídeos de marketing do usuário
  (ex.: marketing nos ímpares, aula nos pares). Os slots 09h/18h continuam dos Shorts virais normais.

## 🎬 FECHO PADRÃO — só o BORDÃO é obrigatório (novo, 23/07; refinado pelo Marcelo)

O único padrão fixo de fecho é a MARCA. Share e "dica" NÃO são padrão — o agente decide vídeo a vídeo
(senão fica repetitivo e robótico). Ordem do fecho:

1. **PIVÔ POÉTICO** — última frase de conteúdo (perspectiva cósmica + pertencimento).
2. **AÇÃO OPCIONAL (no máximo UMA, e só quando o vídeo pede — julgamento do agente, analisando o ecossistema):**
   - **GATILHO DE COMPARTILHAMENTO** — usar SÓ quando o conteúdo é do tipo que a pessoa passa adiante
     (conhecimento USÁVEL / moeda social, não só espanto). *"Manda isso pra um amigo que [gancho ligado
     ao tema]."* Base: **Jonah Berger (Contagious / STEPPS)** + nosso Reel de 171 envios
     ([[lei-do-compartilhamento]]). Sempre específico. **NÃO é pra estar em todo vídeo.**
   - **CTA COSMOS** (comenta COSMOS → DM) — no vídeo-isca (1 a cada 3). Nunca junto com o share.
3. **BORDÃO FIXO — O ÚNICO OBRIGATÓRIO, em 100% dos vídeos. SEMPRE a última coisa (voz + card):**
   *"Neural Update. O universo está te esperando."* Nunca na abertura, só no fim. Ver [[assinatura-marca-oficial]].

⚠️ **LIÇÃO DE PRODUÇÃO (23/jul): o bordão CONTA pra retenção.** O bordão falado custa ~2s (~7 palavras).
Como retenção = 25s ÷ duração, o roteiro INTEIRO (corpo + bordão + share se houver) tem que caber em
**~64-66 palavras** pra segurar 70%. Na prática: num viral de 30s o bordão já ocupa o espaço do share →
**o "manda pro amigo" quase nunca cabe junto do bordão.** Escreva o corpo em ~57 palavras JÁ contando que
o bordão vem depois. (Erro real do dia: roteiro de 96 palavras = 45s = 56% retenção; cortei pra 64 = 70%.)

## 💰 CTA da isca grátis (funil — 1 a cada 3 vídeos)

🎯 **FOCO ÚNICO (decisão do Marcelo, 23/07): o EBOOK. Zero produtos novos até 1000 vendas dele.**
Nada de Order Bump, mini-curso ou upsell por enquanto — essas ideias ficam PARADAS. Todo CTA, toda DM,
todo funil aponta pra UMA coisa: vender o ebook. 1000 vendas é o marco antes de pensar em qualquer
outro produto.

⭐ **VIRADA 23/07 (Thiago Finch — matar a fricção do "link na bio").** "Link na bio" é link MORTO
(comprovado: nossa retenção de CTA de legenda ~0; o funil tem só 3 leads). O CTA de ouro NÃO manda pra
bio — pede a palavra **COSMOS** no comentário e puxa a pessoa pra DM: *"Comenta **COSMOS** aqui embaixo
que eu te mando o PDF grátis dos 5 fenômenos no direct."* Isso: (a) gera comentário = sinal de algoritmo,
(b) abre a DM = onde a venda vira RELACIONAMENTO (modelo ACA), (c) zero fricção (não sai do app).
Na DM: entrega o PDF grátis primeiro, conversa humana (Acknowledge/Compliment/Ask), e só depois de
criar relação apresenta o ebook. NUNCA link seco. Ver [[venda-e-relacionamento]] e [[funil-vendas-isca-gratis]].

A cada 2 vídeos, o **3º** leva CTA da **isca GRÁTIS** ("PDF grátis: 5 fenômenos do universo"). Formato
preferido = palavra-chave no comentário (acima). Fallback antigo (bio): https://neural-update.com.br/ebook#isca-gratis.
Falar que é **de graça** — nunca ler URL na voz.
- Mecânica: `append-isca-cta.js <base.mp4> <bg.jpg> <out.mp4> [track]` cola cena-fim (~5s) estática.
  Texto sem contador = evergreen (seguro pra agendado; ≠ CTA de inscritos que envelhece).
- Nesses vídeos, a DESCRIÇÃO leva a linha da isca + link. Ver CLAUDE.md e memória `funil-vendas-isca-gratis`.

## Depois do YouTube

Copiar mp4+sidecar pra `neural-update-tiktok/videos/` (rascunhos do painel TikTok) e
adicionar entradas no `gram-text-wizard/public/tiktok-import-manifest.json` (botão "Importar Reels"
do navegador preenche legenda sozinho — NÃO usar o script com service key, ela não existe nos .env).
