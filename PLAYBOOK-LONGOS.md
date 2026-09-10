# PLAYBOOK — Vídeos LONGOS (documentário/aula, 5-10 min)

Modelo pros vídeos longos do canal. O algoritmo de LONGO é SEPARADO do de Shorts (jul/2026) —
Short ruim não derruba longo, e vice-versa. Longo é outro jogo, com estas regras próprias.

## As leis do longo (por quê de cada uma — pesquisa jul/2026)

1. **Os primeiros 30-60s decidem TUDO.** O vídeo médio perde 50% dos espectadores nos primeiros 30s.
   Quem sobrevive aos 30s assiste o resto. → Colocar o momento MAIS chocante do vídeo no 1º SEGUNDO
   (não a introdução), cumprir a promessa do título imediatamente, cortar TODO preâmbulo.
   Você tem 15-30s pra provar que vai entregar o que a thumbnail prometeu.

2. **Re-hook aos ~30s.** Bem quando a galera pensa em sair (25-35s), um "soco" de reengajamento:
   virada de música, mudança de ritmo/cena, uma pergunta nova, uma promessa maior. É um 2º gancho.

3. **É % assistido (retenção), não minutos.** Um vídeo de 7min visto a 75% GANHA de um de 20min a 40%.
   → NUNCA esticar pra bater duração. Melhor um 7min tenso que um 10min frouxo. Cada minuto tem que
   se pagar. Benchmark: 30-45% de retenção média = longo forte; 60% até o fim = o algoritmo confia.

4. **"Session contribution" é o sinal nº1 de ranqueamento de longo** — quanto o vídeo ESTENDE a sessão
   do usuário no YouTube. Por isso SÉRIE e PLAYLIST batem upload solto. → Todo longo aponta pro próximo
   (tela final / "assiste esse agora") e, quando fizer sentido, entra numa playlist de longos/documentários.

5. **Satisfação > watch time bruto.** Um vídeo amado por 4min vence um tolerado por 8min. Entregar valor
   real e um fecho que satisfaz (não cliffhanger vazio) — satisfação é o que o algoritmo tenta prever.

6. **Estrutura em CAPÍTULOS com mini-cliffhanger.** Cada capítulo termina puxando o próximo (formato
   jornada/linha-do-tempo é o mais retentivo que existe — vira história, não lista). Ideal p/ ciência.

7. **Gancho de pergunta/promessa** (Kurzgesagt): título+abertura que acendem curiosidade antes do clique
   ("O que existe no fim do universo?"). A 1ª frase da narração repete a promessa do título.

## Receita mecânica (reusa a infra dos Shorts)

- Script: ~150 palavras/min de narração → 7min ≈ 1000-1050 palavras. Escrito em CAPÍTULOS
  (5-8 blocos), cada um fechando com uma ponte pro próximo. 1ª frase = promessa do título.
- Build: `make-longo.js <img_dir> <out.mp4> [track.mp3]` — 16:9 1920x1080, imagem 9:16 centralizada
  sobre fundo desfocado dela mesma, Ken Burns, narração+legenda+trilha duckada. OUT sempre ABSOLUTO.
  - Trilha longa: `LONGO_TRACKS="a.mp3,b.mp3,c.mp3"` (leito variado, stream_loop -1 cobre a narração
    inteira — senão o áudio corta no fim). Volume música 0.42.
  - ARMADILHA: make-longo escaneia *.png/*.jpg da pasta — NÃO deixar a thumbnail .jpg na pasta das
    imagens (vira cena!); guardar thumb em subpasta.
- Imagens: **LONGO GERA IMAGEM PRÓPRIA — não reaproveita banco** (decisão do Marcelo, 07/ago/2026).
  A regra antiga mandava montar longo 100% do banco pra economizar; ela foi REVOGADA. O longo é a
  âncora das 4.000 horas e quem segura a retenção é o visual: reciclar cena de Short entrega um vídeo
  com cara de remendo, e economizar 2 créditos não compensa perder minutos assistidos.
  - **Cenas: Soul V2 a 0,12cr cada** (~20-24 cenas num longo de 9 min = ~2,5-3cr). Barato o bastante.
  - **Thumbnail: pode usar modelo CARO.** Ela é o que decide o clique na busca e nos sugeridos, e
    view é o gargalo do longo (medido em 07/ago: o longo de 281s fez 13,1h com 498 views; o de 658s
    fez só 7,7h com 122 views — o que faltou foi CLIQUE, não duração). Teto de 5 créditos.
  - O banco (`exports/*/img*.png`, 1050 imagens) segue valendo pras 2 cenas de Short — só não pro longo.
- Thumbnail custom (longo TEM thumb, Short não): `post-long.js <mp4> <meta.json> <thumb.jpg> [publishAtISO]`.
  Thumb estilo Interstellar: base 9:16 → 16:9 com boxblur+overlay, drawtext título via textfile= (acento
  quebra em text=). Rosto/objeto grande + 2-4 palavras gigantes.
- Publicar/agendar: `post-long.js` (privacy private + publishAt = agenda). Longo NÃO leva #Shorts no título.

## Cadência & posicionamento
- 1 longo por semana (mín.) como âncora de watch-time/sessão — é o eixo que mais aproxima da monetização
  (Shorts contam ~25s de watch cada; 1 longo de 7min a 40% = 168s = vale ~7 Shorts em tempo assistido).
- Reforça a série/escola: quando o tema casar, o longo entra na playlist do curso e puxa a maratona.
