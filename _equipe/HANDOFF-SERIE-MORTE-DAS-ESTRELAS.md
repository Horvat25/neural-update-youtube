# Handoff para o Claude — série “Como cada estrela morre”

## Pedido direto do usuário

Assuma a criação e a produção desta série. O objetivo é explicar, do caminho estelar menos
massivo ao mais extremo, quando uma estrela termina como anã branca, quando ocorre uma
supernova, quando sobra uma estrela de nêutrons, o que são pulsares e magnetares, quando o
termo hipernova é usado e quando se forma um buraco negro. Cada episódio precisa explicar
o processo e seus efeitos, não apenas citar o nome.

Primeiro serão produzidos Shorts. Depois, os módulos serão reunidos e adaptados num vídeo
longo profissional. O vídeo longo não pode parecer uma sequência de Shorts colados.

## O que já está pronto e aprovado

- Short 1: `nw-sol-vira-ana-branca`.
- Final aprovado pelo usuário:
  `exports/nw-sol-vira-ana-branca/nw-sol-vira-ana-branca.mp4`.
- Duração: 40,79 s. Resolução: 1080x1920. Taxa: 24 fps.
- Seis clipes únicos do Flow, com 6 s cada, estão em `cena1.mp4` a `cena6.mp4`.
- Oito downloads redundantes foram enviados à Lixeira; os seis canônicos continuam em
  `C:\Users\Mateus Horvat\Downloads` e dentro do diretório do Short.
- Registro completo: `exports/nw-sol-vira-ana-branca/APRENDIZADO.md`.
- O usuário disse `curti`; portanto, não remontar, não reescrever e não substituir este
  arquivo sem novo pedido explícito.

## Material longo já existente

Existe uma primeira versão em:

- `exports/longo-flow-morte-estrela/longo-flow-morte-estrela.mp4`
- `exports/longo-flow-morte-estrela/roteiro.txt`
- `exports/longo-flow-morte-estrela/meta.json`

Use como banco de material e referência narrativa, não como verdade final. O roteiro atual
explica anã branca, supernova e buraco negro, mas ainda não desenvolve adequadamente estrela
de nêutrons, pulsar/magnetar e hipernova. Também é preciso impedir a leitura equivocada de
que uma anã branca nasce depois de uma supernova comum.

## Arquitetura aprovada da série — 6 Shorts

1. **Anã branca — o destino do Sol** — PRONTO E APROVADO.
2. **Supernova — quando uma estrela realmente explode**.
3. **Estrela de nêutrons — o núcleo que sobrevive à supernova**.
4. **Pulsar e magnetar — duas versões extremas de uma estrela de nêutrons**.
5. **Hipernova — a explosão extrema e sua relação possível com jatos/GRBs**.
6. **Buraco negro — quando nem o núcleo consegue parar o colapso**.

Essa é uma progressão didática, não uma escada universal de massa com fronteiras rígidas.
Supernova e hipernova são eventos; anã branca, estrela de nêutrons e buraco negro são
remanescentes. Diga isso claramente quando necessário.

## Formato de cada Short

- Google Flow, Veo 3.1 Lite.
- Vertical 9:16.
- Exatamente 6 cenas de 6 s por episódio.
- O usuário está usando a geração 360 em promoção e depois upscale/download em 720.
- Montagem final em 1080x1920, 24 fps.
- Voz Marte (`pt-BR-AntonioNeural`), pois são Shorts virais, não aulas das 14h.
- Alvo: 38–42 s. Conteúdo valioso tem prioridade, mas cortar redundância antes de exceder.
- Hook profissional já na primeira frase: dizer qual pergunta o episódio vai responder.
- Legendas sincronizadas por `cues.txt`, logo e hook dentro da área segura.
- Única trilha permitida: `dark-some-amount-of-evil.mp3`.
- Clipes-base sem texto, legenda, logo ou marca d'água; a identidade entra na edição.
- Bloquear fala humana, narração, diálogo, sussurro, canto e palavras faladas nos prompts.
- Auditar cada download antes de seguir: hash/duplicata, resolução, duração, tira de quadros e
  fala indesejada.
- Criar `exports/<slug>/APRENDIZADO.md` para cada episódio.
- Não publicar nem agendar antes da aprovação do usuário.

## Estrutura obrigatória do roteiro curto

1. **Hook/pergunta**: “Quando uma estrela vira X?” ou uma formulação mais forte que explique
   imediatamente a promessa do vídeo.
2. **Condição física**: massa inicial ajuda a decidir, mas perda de massa, composição,
   rotação e companheira binária também alteram o destino.
3. **Mecanismo**: o que acontece com combustível, pressão, núcleo e gravidade.
4. **Resultado**: o que é o evento ou remanescente.
5. **Efeito observável**: brilho, elementos ejetados, neutrinos, rotação, campo magnético,
   jatos, curvatura ou acreção — conforme o episódio.
6. **Conexão com o próximo episódio** e convite leve para o vídeo completo relacionado.

Para os Shorts, pode haver o fechamento da marca. Para o vídeo longo, usar uma única abertura
e um único fechamento; não repetir seis hooks, seis CTAs nem seis bordões.

## Cuidado científico obrigatório

- Não ensinar um “cálculo” falso do tipo `X massas solares = destino garantido`.
- A referência aproximada de cerca de 8 massas solares para separar estrelas que evitam o
  colapso do núcleo das estrelas massivas pode ser usada apenas como regra de bolso, com a
  ressalva de que evolução, metalicidade, rotação, perda de massa e binaridade mudam o fim.
- Para estrela de nêutrons versus buraco negro, não converter diretamente massa inicial em
  destino sem explicar que importa a massa final do núcleo/remanescente e que os limites
  teóricos/observacionais têm incerteza.
- “Hipernova” não tem uma fronteira de massa simples e universal. Explicar o uso do termo para
  explosões de colapso de núcleo excepcionalmente energéticas, frequentemente associado a
  supernovas broad-lined tipo Ic e, em alguns casos, a rajadas gama longas/collapsars.
- Supernova não “cria todos os elementos” de forma simples; separar nucleossíntese durante a
  vida estelar, durante a explosão e contribuições de outros eventos cósmicos.
- Usar fontes primárias/confiáveis: NASA, ESA, observatórios, artigos revisados por pares e
  revisões acadêmicas. Registrar URLs e o que cada fonte sustenta.
- Fazer revisão de duplo sentido em PT-BR. Evitar frases como “a estrela morre no ferro”;
  preferir formulações literais como “quando o núcleo de ferro perde sustentação, ocorre o
  colapso”.
- Testar a locução no contexto real. Para singular com Marte, a forma já testada é
  `tem nome. Anã branca.`; não confiar apenas na grafia isolada.

## Produção modular para o vídeo longo

Para cada episódio novo, guardar dois conceitos de montagem:

- **módulo limpo**: explicação sem CTA, sem anúncio do próximo e sem bordão;
- **versão Short**: hook, legenda, identidade, conexão com o próximo e convite para o vídeo
  relacionado.

Depois dos seis Shorts aprovados:

1. reescrever as transições entre os módulos;
2. produzir uma introdução única que apresenta a pergunta central;
3. ordenar do caminho de menor massa ao colapso mais extremo;
4. explicar que eventos e remanescentes são categorias diferentes;
5. remover repetições e corrigir qualquer simplificação do longo atual;
6. usar um único CTA final e o bordão apenas uma vez;
7. atualizar capítulos, descrição, fontes e thumbnail;
8. entregar o longo para aprovação antes de publicar.

Após o vídeo longo estar publicado ou pronto para ser relacionado:

- organizar os seis Shorts em playlist;
- configurar o vídeo longo como vídeo relacionado em cada Short, se a conta/recurso permitir;
- usar convite curto do tipo “quer ver o caminho completo? abre o vídeo relacionado”, sem
  transformar a explicação em anúncio;
- não prometer que o botão aparecerá sem conferir o estado real no YouTube Studio.

## Próxima tarefa concreta

Começar pelo Short 2: **“Quando uma estrela vira supernova?”**

Antes de gerar qualquer cena:

1. confirmar fontes e limites científicos;
2. escrever roteiro de aproximadamente 65–72 palavras;
3. escrever seis prompts Flow, um por cena de 6 s;
4. entregar roteiro + prompts ao usuário para aprovação;
5. só depois gerar/baixar/montar;
6. auditar o MP4 final e registrar `APRENDIZADO.md`.

Não mexer no Short 1 aprovado e não publicar nada automaticamente.
