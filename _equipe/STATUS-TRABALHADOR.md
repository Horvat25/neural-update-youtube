# Status do EXECUTOR — só você escreve aqui

> Modelo de recado (um por tarefa, não espere terminar tudo):
>
> ## Tarefa N — feita   (ou: TRAVEI)
> o que fiz:
> prova:            <saída real: ID, URL, contagem>
> o que deu errado:

## Nova divisão — localização para Bilibili
o que fiz: registrei a divisão determinada diretamente pelo usuário. O Claude fica responsável
pela criação, decisões editoriais e por todo o envio/publicação na conta da Bilibili. O ChatGPT
fica disponível apenas para executar a localização dos vídeos: tradução e tratamento/remoção de
legendas conforme as instruções específicas que o Claude deixar.
prova: ordem recebida diretamente do usuário nesta conversa.
o que deu errado: nada. Não vou acessar, enviar, publicar ou agendar conteúdo na Bilibili. Também
não vou presumir idioma, formato de legenda, dublagem ou técnica de remoção antes de ler a tarefa
detalhada do Claude.

## Bilibili — pacotes 1 e 2 prontos para upload pelo Claude
o que fiz: produzi as versões inglesas sem legenda queimada de
`nw-flow-cratera-falcon9` e `nw-vacuo-quantico-estrela-morta`. O primeiro foi remontado com
os quatro clipes originais do Flow recuperados de Downloads; o segundo reutilizou as sete
imagens originais. Cada pasta contém MP4, `capa.jpg`, `legenda-en.srt` e `PARA-SUBIR.md`.
prova: `nw-flow-cratera-falcon9-en.mp4` mede 37,79 s em 1080x1920; o SRT tem 11 blocos e a
capa 1280x720 mede 134.547 bytes. `nw-vacuo-quantico-estrela-morta-en.mp4` mede 37,71 s em
720x1280; o SRT tem 13 blocos e a capa 1280x720 mede 106.730 bytes. Whisper reconheceu as
duas locuções completas; só normalizou números por extenso para algarismos. As duas usam
`dark-some-amount-of-evil.mp3` e permanecem sem publicação.
o que deu errado: `translate-to-en.js` retornou HTTP 401; fiz a adaptação inglesa localmente
e validei a fala no áudio final. A primeira tentativa do segundo vídeo sorteou outra trilha;
foi descartada e remontada com a faixa segura antes desta liberação.

## Bilibili — pacotes 3 e 4 prontos para upload pelo Claude
o que fiz: produzi `nw-flow-sagitario-a-jejum-en` e `nw-nascimento-de-um-magnetar-en`, ambos
em inglês, sem legenda queimada, com SRT externo, capa 1280x720 e `PARA-SUBIR.md`. Sagitário
A* usa quatro clipes únicos do Flow; o magnetar reutiliza as sete imagens originais.
prova: Sagitário A* mede 40,08 s em 1080x1920, 24 fps, com SRT de 13 blocos e capa de
134.052 bytes. Magnetar mede 40,92 s em 720x1280, 24 fps, com SRT de 13 blocos e capa de
106.093 bytes. Ambos usam a trilha segura. Whisper reconheceu `Sagittarius A-star`,
`event horizon` e `SN2024AFAV`.
o que deu errado: a prévia estática de Sagitário falhou por SAR divergente entre os PNGs;
a montagem final com os clipes normalizados para 1080x1920 concluiu corretamente. No magnetar,
a primeira leitura de `SN 2024afav` ficou ambígua; regenerei a locução com letras separadas e
confirmei a designação no áudio final.

(ainda sem recados)

## Tarefa 1 — feita
o que fiz: validei os 11 IDs na grade ao vivo e apliquei os 11 reagendamentos, um por vez.
prova: `node list-schedule.js` agora mostra 28/08–03/09 apenas às 08h/18h; os destinos ficaram: 30/08 18h `dQjH9qAUgjE`; 31/08 18h `Cyr6WuUVffg`; 02/09 18h `pOa_w2hPli8`; 03/09 18h `MpLc7YSWOmA`; 04–06/09 18h `IYnaU8n8eWE`, `-Ff2qxDyYFI`, `eI4N_v_q42w`; 07/09 08h/18h `7Rb615vEmGY`, `JxDOryK8fI4`; 08/09 08h/18h `-VcPgn8KaG4`, `x4oyACzKZnA`. Não há colisões nesses horários.
o que deu errado: nada.

## Tarefa 6/7 — TRAVEI antes do push do Instagram
o que fiz: produzi o substituto aprovado `nw-eclipse-artificial-duas-naves`, validei o spec e o agendei no YouTube para 05/09 08h: ID `jqEWDWboQvQ`, duração final `41,83 s`. Também confirmei os IDs já agendados de Deimos (`YCDYu1Lcu9o`, 04/09 08h) e da supernova (`ZxalavgPLRU`, 06/09 08h).
prova: o uploader do Instagram preparou as três mídias, mas a checagem encontrou `horario duplicado: [["2026-09-04T11:00:00.000Z",["nw-onda-choque-estrela-morta","nw-deimos-impacto-unico"]]]`; slug duplicado: nenhum; sem mídia: 0.
o que deu errado: o chefe havia informado que o único item prévio era a onda de choque em 04/09 08h, mas a Tarefa 7 manda inserir Deimos no mesmo horário. Não fiz commit/push. Também confirmei que os lotes mínimos de `sobe-lote.js` só têm `slug` e `publishAt`, então `insta-fila-add.js` criou legendas vazias; as três inserções locais foram removidas antes de qualquer push. Preciso da decisão de qual vídeo fica em 04/09 08h e de lotes/specs com `desc1` e `hashtags` para espelhar corretamente.

## Auditoria livre — temas repetidos (somente relatório)
o que fiz: rodei `node confere-repetido.js`; não alterei nenhum vídeo, título, horário ou fila.
prova: a ferramenta comparou 306 vídeos já no canal com 114 do lote e apontou 39 sobreposições. As colisões explícitas de 100% foram `vsl16-espaguetificacao`, `v41-nunca-tocou-em-nada`, `vsl18-luz-que-nunca-chega`, `vsl19-chiado-do-big-bang`, `vsl20-estrelas-mortas-mentira`, `nw-tres-buracos-negros` e `nw-terra-sumiu-ceu-de-marte`; também sinalizou `nw-quinteto-jwst` como já relacionado a Webb.
o que deu errado: o script verifica o lote inteiro, não apenas os 24 da grade; por isso o número 39 é triagem ampla, não uma instrução para despublicar ou corrigir automaticamente.

## Tarefa 3 — feita
o que fiz: reconciliei `D:\Neural Update\instagram` com `origin/main`, espelhei os 11 horários da Tarefa 1 em `publicador/fila.json`, validei antes do envio, criei o commit `94d7ef9` e enviei para `origin/main`.
prova: checagem lida diretamente de `origin/main`: `horario duplicado: nenhum`; `slug duplicado: nenhum`; `sem midia: 0`; `reels pendentes: 25`.
o que deu errado: havia uma modificação pré-existente em `.env`; ela não foi incluída no commit nem alterada.

## Tarefa 4 — TRAVEI
o que fiz: criei `lotes/extra-04-06set.json` e executei o lote. Dois inéditos foram enviados e agendados: Deimos — `YCDYu1Lcu9o` — 04/09 08h; supernova sem jato — `ZxalavgPLRU` — 06/09 08h. A lista do canal confirma ambos nesses horários.
prova: `data/sobe-lote.json` já continha `nw-quinteto-jwst` com ID `X4uMXMVVYPQ`, URL `https://youtube.com/shorts/X4uMXMVVYPQ`, publicado em 19/08 às 08h. Por isso `sobe-lote.js` o pulou e informou `2 subiram nesta rodada · 0 restantes`.
o que deu errado: a Tarefa 4 afirma que o Quinteto nunca foi ao ar, mas ele já foi publicado. Não o reagendei nem o reenviei, e não espelhei parcialmente os dois novos no Instagram. Preciso de uma substituição para 05/09 08h ou de orientação explícita para o vídeo já publicado.

## Tarefa 2 — feita
o que fiz: atualizei os sete `meta.json` e os títulos correspondentes no YouTube com `set-titulo.js`, preservando descrição, tags e categoria pelo próprio script.
prova: `node list-schedule.js` confirma os títulos sem `🔭` nos destinos 04–08/09: `IYnaU8n8eWE`, `-Ff2qxDyYFI`, `eI4N_v_q42w`, `JxDOryK8fI4` e `x4oyACzKZnA` estão sem emoji inicial; `7Rb615vEmGY` e `-VcPgn8KaG4` estão com `📰` nos slots de 08h.
o que deu errado: nada.

## Tarefa 8.1 — feita (aula `pl28-lentes-gravitacionais`)
o que fiz: validei o spec, gerei as 7 imagens com `soul_cinematic`, `9:16`, qualidade `2k`, e montei o vídeo. Não agendei nem espelhei: a Tarefa 8 exige aguardar as cinco aulas prontas.
prova: `exports/pl28-lentes-gravitacionais/pl28-lentes-gravitacionais.mp4` mede `00:00:44.79`. O spec determina voz `female`; o roteiro final preserva `>> Na próxima aula: o raio que transforma qualquer coisa num buraco negro. Domingo, dia trinta, às duas.` e não contém o bordão proibido. Rodei `python exports/_audita-todos.py pl28-lentes-gravitacionais`; ele não emite resultado para esta aula porque sua lista interna não inclui `pl28`. Para não substituir prova por silêncio, rodei a transcrição direta com `faster_whisper`: `MISSING=NONE` e `FIXED_FINAL_HEARD=False`.
o que deu errado: nada no áudio ou montagem. O auditor compartilhado precisa ser ampliado pelo chefe se quiser que ele cubra as aulas `pl28`–`pl32`; não o alterei.

## Tarefa 8.2 — feita (aula `pl29-raio-de-schwarzschild`)
o que fiz: validei o spec, gerei as 7 imagens com `soul_cinematic`, `9:16`, qualidade `2k`, e montei a segunda aula. Ela permanece sem agendamento e sem espelhamento até a série inteira estar pronta.
prova: `exports/pl29-raio-de-schwarzschild/pl29-raio-de-schwarzschild.mp4` mede `00:00:46.33`. O spec exige voz `female`; o roteiro preserva `>> Na próxima aula: a estrela que parou bem na beira disso. Segunda, dia trinta e um, às duas.`, que corresponde à aula seguinte `pl30-estrelas-de-neutrons`, e não contém o bordão proibido. Auditoria direta com `faster_whisper`: `MISSING=NONE`; `FIXED_FINAL_HEARD=False`.
o que deu errado: nada.

## Tarefa 8.3 — feita (aula `pl30-estrelas-de-neutrons`)
o que fiz: validei o spec, gerei as 7 imagens com `soul_cinematic`, `9:16`, qualidade `2k`, e montei a terceira aula. Mantive `neutron` sem acento, conforme a nota fonética do spec.
prova: `exports/pl30-estrelas-de-neutrons/pl30-estrelas-de-neutrons.mp4` mede `00:00:38.71`. O spec exige voz `female`; o roteiro preserva `>> Na próxima aula: a que gira e pisca no ritmo de um relógio. Terça, dia primeiro, às duas.`, que corresponde a `pl31-pulsares`, e não contém o bordão proibido. Auditoria direta com `faster_whisper`: `MISSING=NONE`; `FIXED_FINAL_HEARD=False`.
o que deu errado: nada.

## Tarefa 8.4 — feita (aula `pl31-pulsares`)
o que fiz: validei o spec, gerei as 7 imagens com `soul_cinematic`, `9:16`, qualidade `2k`, e montei a quarta aula, mantendo `neutrons` sem acento conforme o spec.
prova: `exports/pl31-pulsares/pl31-pulsares.mp4` mede `00:00:44.63`. O spec exige voz `female`; o roteiro preserva `>> Na próxima aula: a versão com o ímã mais forte do universo. Quarta, dia dois, às duas.`, que corresponde a `pl32-magnetares`, e não contém o bordão proibido. Auditoria direta com `faster_whisper`: `MISSING=NONE`; `FIXED_FINAL_HEARD=False`.
o que deu errado: nada.

## Tarefa 8.5 — feita (aula `pl32-magnetares`)
o que fiz: validei o spec, gerei as 7 imagens com `soul_cinematic`, `9:16`, qualidade `2k`, e montei a quinta aula, mantendo `neutrons` sem acento conforme o spec.
prova: `exports/pl32-magnetares/pl32-magnetares.mp4` mede `00:00:37.96`. O spec exige voz `female`; o roteiro preserva `>> Na próxima aula: de onde vieram os átomos do seu corpo. Quinta, dia três, às duas.` e não contém o bordão proibido. Auditoria direta com `faster_whisper`: `MISSING=NONE`; `FIXED_FINAL_HEARD=False`.
o que deu errado: o `exports/_audita-todos.py` obrigatório foi chamado para cada aula, mas não produz a auditoria dessas cinco porque sua lista interna só contém slugs `nw-*`; por isso conservei a verificação direta de Whisper como prova real e não alterei o auditor.

## Tarefa 8 — YouTube feito; Instagram aguardando autorização
o que fiz: com as cinco aulas montadas e auditadas, subi e agendei a série no YouTube. Não toquei na fila do Instagram: a instrução vigente manda aguardar a decisão sobre a colisão de 04/09 08h antes de qualquer novo push.
prova: `node list-schedule.js` confirma: 29/08 14h `pl28` ID `_Y92Yt7xGpQ`; 30/08 14h `pl29` ID `yBCImipYUoI`; 31/08 14h `pl30` ID `NLywGnX8kWs`; 01/09 14h `pl31` ID `0gkdE-nsAZQ`; 02/09 14h `pl32` ID `nWkh1VrP73g`.
o que deu errado: espelhamento no Instagram continua travado pela ordem do chefe/heartbeat; não farei push parcial.

## Controle de crédito de imagens
o que fiz: registrei o uso de modelo caro solicitado pelo chefe.
prova: antes da correção, o eclipse `nw-eclipse-artificial-duas-naves` consumiu 7 imagens em `seedream_v4_5`; elas não foram refeitas. As 35 imagens das cinco aulas foram geradas exclusivamente em `soul_cinematic`, `9:16`, `2k`.
o que deu errado: nada.

## Pedido do usuário ao Claude — série “Como cada estrela morre”
o que fiz: consolidei o pedido completo, o Short 1 aprovado, a arquitetura dos seis Shorts,
o padrão Flow, os cuidados científicos e a estratégia modular para o vídeo longo em
`_equipe/HANDOFF-SERIE-MORTE-DAS-ESTRELAS.md`.
prova: `exports/nw-sol-vira-ana-branca/nw-sol-vira-ana-branca.mp4` está aprovado pelo usuário;
o handoff manda começar pelo Short 2, “Quando uma estrela vira supernova?”, entregando roteiro
e seis prompts antes de gastar créditos.
o que deu errado: nada. O usuário pediu explicitamente que o Claude assuma a criação e a
produção dos próximos itens.

## Flow — `pl33-nucleossintese-estelar` — TRAVEI antes de substituir a montagem
o que fiz: localizei as 9 cenas já baixadas do Flow (`cena1.mp4` a `cena9.mp4`) e a montagem final recente. Auditei o arquivo e a tira de frames; as cenas, legendas, logo e enquadramento 9:16 estão presentes.
prova: `exports/pl33-nucleossintese-estelar/pl33-nucleossintese-estelar.mp4` existe, mede `00:01:00.83`, está em `1080x1920`, 24 fps, e a tira `exports/pl33-nucleossintese-estelar/_tira.jpg` foi gerada às 20:36. O `CLAUDE.md` fixa teto de 42 s; o `CONTRATO-SPEC.md` diz que passar de 48 s custa caro.
o que deu errado: o roteiro fonte tem conteúdo para cerca de 61 s. Cortar o MP4 agora removeria explicação ou o anúncio obrigatório da próxima aula; reescrever/encurtar o roteiro é decisão do criador, não vou inventar o corte. Preservei todos os 9 clipes e o final, sem reexecutar a montagem.

## Flow — `pl33-nucleossintese-estelar` — versão encurtada feita
o que fiz: por pedido direto do usuário, reescrevi apenas o necessário e remontei com as oito cenas aproveitáveis já baixadas do Flow. Mantive a voz feminina, as legendas, o gancho e o anúncio da próxima aula. A fonte `cena9.mp4`, que é tela verde, foi preservada como `flow-extra-cena9-tela-verde.mp4` e não entra no corte.
prova: `exports/pl33-nucleossintese-estelar/pl33-nucleossintese-estelar.mp4` agora mede `00:00:47.29`, em `1080x1920`, 24 fps — redução de 13,54 s sobre a versão original, guardada em `pl33-nucleossintese-estelar-original-60s.mp4`. Auditoria direta com `faster_whisper`: `MISSING=NONE`. A checagem de silêncio nos últimos 4 s não encontrou trecho silencioso. A tira `exports/pl33-nucleossintese-estelar/_tira.jpg` confirma que a tela verde não está no vídeo final.
o que deu errado: nada na remontagem. O corte atende o teto de 48 s do contrato; não acrescentei bordão porque esta é uma AULA e o usuário pediu encurtar o vídeo.

## Aprovação do usuário — `pl33-nucleossintese-estelar`
o que fiz: registrei que o usuário aprovou a versão de 47,29 s e confirmou que AULAS não levam o bordão `Neural Update. O universo está te esperando.`, para não estender o vídeo.
prova: decisão recebida diretamente nesta conversa após a revisão do corte.
o que deu errado: nada. O arquivo final aprovado permanece em `exports/pl33-nucleossintese-estelar/pl33-nucleossintese-estelar.mp4`.
