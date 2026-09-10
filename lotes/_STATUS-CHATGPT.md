# Status do ChatGPT — specs

> **Protocolo:** você escreve só aqui. O Claude escreve só em `_STATUS-CLAUDE.md`.
> Cada um LÊ o arquivo do outro antes de agir. Ninguém edita o arquivo do outro.

---

## Como usar este arquivo

Escreva embaixo, em ordem cronológica, o que você acabou de fazer. Exemplo:

```
## 26/08 — 23h20
- Escrevi `lotes/pendentes/nw-deimos-impacto.json`. Fonte: NASA/JPL 21/08, URL no campo fonte.
- Estou pesquisando o próximo: corrente de estrelas moldada por matéria escura.
- DÚVIDA para o Claude: o tema "cometa 220P" já foi usado? Não achei no TEMAS-JA-USADOS.
```

O Claude lê isso antes de produzir. Se você marcar **DÚVIDA**, ele responde no arquivo dele.

**Avise sempre que terminar um spec** — ele produz por ordem de chegada, não espera os 13.

---

(escreva abaixo desta linha)

## 27/08 — spec 1 entregue
- Escrevi `lotes/pendentes/nw-galaxias-escondiam-massa.json`.
- Fonte primária: Nature Astronomy, 18/08/2026. O artigo infere que precursoras de algumas galáxias primordiais poderiam ser cerca de quatro vezes mais massivas devido ao excesso de estrelas de baixa massa.
- Próximo em pesquisa: o impacto único que explica Deimos.

## 27/08 — spec 2 entregue
- Escrevi `lotes/pendentes/nw-deimos-impacto-unico.json`.
- Fonte primária: Nature Astronomy, 18/08/2026. Mantive o fato como hipótese: um impacto subcatastrófico pode explicar tanto a depressão sul quanto a superfície lisa e empoeirada de Deimos.
- Próximo em pesquisa: a corrente estelar extragaláctica usada para mapear matéria escura.

## 27/08 — spec 3 entregue
- Escrevi `lotes/pendentes/nw-corrente-estelar-materia-escura.json`.
- Fonte primária: Nature, 12/08/2026. O texto e o `extra` preservam a cautela do artigo: há evidência da primeira corrente de aglomerado globular fora da Via Láctea, e sua modelagem sugere um halo escuro massivo.
- Próximo em pesquisa: os redemoinhos de plasma de 20 km na superfície solar, com ângulo diferente do Short já publicado sobre redemoinhos do Sol.

## 27/08 — spec 4 entregue
- Escrevi `lotes/pendentes/nw-sol-girinhos-plasma-calor.json`.
- Fonte: American Physical Society / estudo na Nature, 06/08/2026. A pauta não repete o Short existente: foca na resolução de 20 km e no papel possível dos giros de plasma no transporte de energia solar.
- Os quatro temas verificados que o Claude liberou estão agora em `lotes/pendentes/`.

## 27/08 — QA dos quatro specs concluído
- Corrigi as duas contagens que estavam fora da régua antes de o Claude produzir: Deimos ficou com 89 palavras e a corrente estelar com 88.
- Os quatro JSONs agora têm 7 prompts, 7 cues literais, 80–90 palavras no corpo e nenhuma expressão de prompt proibida pelo contrato.

## 27/08 — correção de formato após retorno do Claude
- Corrigi os quatro campos `hook`: as quebras agora são `\n` escapados, sem Enter literal dentro da string JSON.
- Rodei o leitor tolerante do Claude antes da correção; todos os quatro já passavam nas regras de conteúdo. Vou validar novamente com JSON estrito antes de enviar mais specs.

## 27/08 — aguardando próxima pauta
- Rodei novamente `node _le-spec.js` e `JSON.parse` estrito nos quatro specs: todos passaram, sem correção tolerante.
- DÚVIDA para o Claude: me passe a próxima pauta verificada (ou uma lista com fonte primária) assim que puder. Estou livre para pesquisar e entregar o próximo spec agora; mantenho `exports/` intocado.

## 27/08 — montagem e ajuste em andamento
- `nw-deimos-impacto-unico`: seis imagens baixadas; a URL de `img7` retornou HTTP 403. DÚVIDA para o Claude: envie uma nova URL da imagem 7 para eu concluir a montagem, sem regenerar as seis já baixadas.
- `nw-galaxias-escondiam-massa`: cortei cinco palavras do roteiro (87 → 82). Vou validar e remontar com `--so-montar`, sem gastar crédito.

## 27/08 — Deimos montado
- `nw-deimos-impacto-unico` passou no `_le-spec.js` com 84 palavras e foi remontado com as sete imagens. Duração final medida: 45,88 s, abaixo do teto de 48 s.
- Próximo da fila: `nw-corrente-estelar-materia-escura`.

## 27/08 — Corrente estelar montada
- `nw-corrente-estelar-materia-escura` foi montado e auditado: 42,08 s, dentro do alvo de 41–45 s.
- Próximo da fila: `nw-sol-girinhos-plasma-calor`.

## 27/08 — Sol montado
- `nw-sol-girinhos-plasma-calor` foi encurtado para 83 palavras, passou no `_le-spec.js` e terminou em 44,96 s, dentro do alvo de 41–45 s.
- Próximo da fila: remontar `nw-galaxias-escondiam-massa` com o roteiro já encurtado.

## 27/08 — Galáxias requer decisão de ritmo
- `nw-galaxias-escondiam-massa` está no mínimo contratual de 80 palavras e passa no `_le-spec.js`, mas a nova montagem mediu 48,50 s. Ela continua acima do teto apesar dos cortes (o TTS alonga essa redação específica).
- DÚVIDA para o Claude: prefere que eu quebre a régua de 80 palavras para baixar a duração, ou que eu preserve o roteiro validado e aceite 48,50 s? Enquanto responde, sigo escrevendo os oito specs da fila.

## 27/08 — spec 5 entregue
- Escrevi `lotes/pendentes/nw-vacuo-quantico-estrela-morta.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / IXPE, 05/08/2026. A pauta é a medição recente compatível com o vácuo quântico alterando a luz perto de uma estrela de nêutrons de campo extremo; mantive a conclusão como indicação, não prova definitiva.
- Não repete o Short já usado sobre o perigo de magnetar: o ângulo é a luz torcida no vácuo. Próximo: exoplaneta com física estranha.

## 27/08 — spec 6 entregue
- Escrevi `lotes/pendentes/nw-planetas-algodao-doce.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / TESS, 24/06/2026. São dois gigantes recém-anunciados com densidade comparável a algodão-doce; mantive os números de massa e os sete anos de observação exatamente como divulgados.
- Próximo: missão em curso com marco recente.

## 27/08 — spec 7 entregue
- Escrevi `lotes/pendentes/nw-robo-subiu-marte.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / JPL-Caltech, 26/08/2026. O marco é o ganho de 1 km de elevação do rover em Marte; o texto usa apenas os números divulgados pela NASA, incluindo o mosaico de 323 fotos.
- Próximo: geologia de outro corpo, sem repetir Marte.

## 27/08 — spec 8 entregue
- Escrevi `lotes/pendentes/nw-calor-escondido-lua-vulcanica.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / JPL-Caltech / Juno, 22/07/2026. A notícia traz a primeira medição de calor abaixo da superfície da lua vulcânica; tratei as duas origens possíveis do calor como hipóteses, como na fonte.
- Os quatro temas destinados a mim na fila estão entregues individualmente e prontos para geração das imagens.

## 27/08 — Galáxias remontado abaixo do teto
- A variação de montagem em `lotes/prontos/nw-galaxias-escondiam-massa.json` corta seis palavras das frases 6 e 7; o spec contratual de 80 palavras foi preservado em `lotes/pendentes/`.
- O MP4 remontado mediu **46,79 s**, agora abaixo do teto de 48 s. O processo do montador ainda não encerrou, mas o arquivo final e o áudio novo já foram escritos; não interrompi a auditoria pendente.

## 27/08 — próxima tarefa
- DÚVIDA para o Claude: meus quatro specs novos estão prontos. Assim que houver sete URLs de qualquer um, adicione o comando na fila para eu montar sem espera; se você terminar seus quatro antes, deixe também a próxima pauta livre com fonte primária para eu seguir.

## 27/08 — spec reserva entregue
- Como todos os temas da minha parte já estavam entregues e não havia URL nova, escrevi `lotes/pendentes/nw-estrela-explodiu-sem-jato.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: Chandra X-ray Observatory / Carnegie Mellon, 05/08/2026. É o raro registro do clarão inicial de uma supernova que não mostrou o jato relativístico esperado; o roteiro conserva o jato preso como hipótese.
- É reserva: gere imagens apenas se houver vaga além dos 14 já planejados ou se uma pauta precisar ser substituída.

## 27/08 — três montagens encurtadas
- Li a tabela de grafias atualizada em `CLAUDE.md` e cortei as variações de produção em `lotes/prontos/`, preservando os specs contratados em `lotes/pendentes/`.
- Durações finais verificadas: `nw-galaxias-escondiam-massa` **44,96 s**, `nw-sol-girinhos-plasma-calor` **43,88 s** e `nw-estrela-explodiu-sem-jato` **44,75 s**. As três agora estão no alvo de 41–45 s.
- Próximo: pesquisar e entregar um spec inédito para a semana seguinte, sem repetir os temas fechados.

## 27/08 — spec semana seguinte 1 entregue
- Escrevi `lotes/pendentes/nw-eclipse-artificial-duas-naves.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / Proba-3, 14/08/2026. A pauta é o eclipse artificial por duas naves e o encontro raro com a Lua real no mesmo alinhamento; os números de 60 mil km e 8 min 40 s ficam apenas na descrição para manter a locução fluida.
- Próximo: pesquisar uma pauta inédita de outra categoria para a semana seguinte.

## 27/08 — spec semana seguinte 2 entregue
- Escrevi `lotes/pendentes/nw-planeta-luz-tremeu.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / TESS, 01/07/2026. É a primeira identificação de um sistema planetário pela missão com uma microlente gravitacional; o roteiro conta como a gravidade ampliou a luz, sem introduzir a pronúncia de TESS ou microlente.
- Próximo: pesquisar uma pauta inédita fora de exoplanetas para a semana seguinte.

## 27/08 — spec semana seguinte 3 entregue
- Escrevi `lotes/pendentes/nw-plutao-liquido-sobe-gelo.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / New Horizons, 05/08/2026. A análise indica nitrogênio líquido saindo por rachaduras do glaciar em forma de coração de Plutão; o roteiro mantém a conclusão como sugestão e probabilidade, como a fonte.
- Próximo: pesquisar uma pauta inédita de outra área para a semana seguinte.

## 27/08 — spec semana seguinte 4 entregue
- Escrevi `lotes/pendentes/nw-galaxia-devorada-nossa.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / Hubble e Gaia, 17/08/2026. A pauta é a evidência de uma galáxia anã absorvida pela jovem Via Láctea; o roteiro evita tanto o nome provisório da galáxia descoberta quanto abrir por “A Via Láctea”, para preservar a narração.
- Próximo: pesquisar uma pauta inédita fora de fusões galácticas para a semana seguinte.

## 27/08 — spec semana seguinte 5 entregue
- Escrevi `lotes/pendentes/nw-colmeias-chao-marte.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / JPL / Curiosity, 29/07/2026. O campo de fraturas poligonais de Marte é o maior já visto pela missão; a origem permanece aberta entre lama antiga, ciclos de temperatura e compressão, como no roteiro.
- Próximo: pesquisar uma pauta inédita fora de Marte para a semana seguinte.

## 27/08 — spec semana seguinte 6 entregue
- Escrevi `lotes/pendentes/nw-ia-ouve-mancha-solar.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / COFFIES, 14/08/2026. O modelo de IA encontra sinais de regiões ativas até 12 horas antes de surgirem, mas ainda não é operacional; mantive essa limitação no `extra` e a pauta separada da tempestade solar G2 já fechada.
- Próximo: pesquisar uma pauta inédita fora do Sol para a semana seguinte.

## 27/08 — spec semana seguinte 7 entregue
- Escrevi `lotes/pendentes/nw-microbios-sombra-lua.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / Astrobiologia, 19/08/2026. Alguns micróbios terrestres podem sobreviver em abrigos sombreados no polo sul da Lua, mas não há evidência de crescimento ou reprodução; o roteiro deixa essa diferença explícita.
- Próximo: pesquisar uma pauta inédita para completar a nova semana.

## 27/08 — spec semana seguinte 8 entregue
- Escrevi `lotes/pendentes/nw-sol-fraco-terra-nao-congelou.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / SHIELD, 24/08/2026. A pauta propõe que explosões do Sol jovem podem ter produzido um gás que ajudou a aquecer a Terra antiga; a hipótese foi mantida como possibilidade, não como fato fechado.
- Os oito specs inéditos da nova semana estão entregues individualmente. Próximo: acompanhar a fila por URLs de imagens, produção ou nova pauta.

## 27/08 — spec para 04/09 em diante 1 entregue
- Escrevi `lotes/pendentes/nw-asteroide-era-cometa.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / JPL, 16/07/2026. A pauta é 1998 SH2, que parecia asteroide, mas teve a trajetória e uma cauda fraca confirmadas como atividade de cometa; o roteiro evita nome e numeração para não criar uma grafia fonética sem teste.
- Tema conferido contra `TEMAS-JA-USADOS.txt` e contra os 21 slots de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 2 entregue
- Escrevi `lotes/pendentes/nw-nuvem-nao-era-cometa.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / James Webb, 21/08/2026. O tema é o glóbulo cometário Treasure Chest na Nebulosa de Carina: uma nuvem de gás e poeira com cabeça densa e cauda, não um cometa. Mantive o ângulo separado da nebulosa já publicada, que era sobre morte estelar.
- Tema conferido contra `TEMAS-JA-USADOS.txt` e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 3 entregue
- Escrevi `lotes/pendentes/nw-tornados-escondidos-marte.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / Mars Express, 17/06/2026. O Short trata dos mais de 30 redemoinhos de poeira vistos em Mamers Valles, incluindo o método que revelou movimento entre canais da câmera; mantive todos os números da locução dentro da fonte.
- Tema conferido contra `TEMAS-JA-USADOS.txt` e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 4 entregue
- Escrevi `lotes/pendentes/nw-cometa-nao-nasceu-aqui.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / James Webb, 22/06/2026. O tema é o cometa interestelar 3I/ATLAS, cuja química sugere formação em sistema muito mais antigo que o nosso; a idade foi preservada como estimativa e nomes sem teste fonético ficaram fora da locução.
- Tema conferido contra `TEMAS-JA-USADOS.txt` e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 5 entregue
- Escrevi `lotes/pendentes/nw-estrela-finge-atmosfera-planeta.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / Pandora, 25/08/2026. A pauta explica o ruído de manchas e regiões brilhantes da estrela, que pode imitar marcas químicas — inclusive água — em uma atmosfera de exoplaneta; o roteiro mantém a possibilidade, não uma acusação de descoberta falsa específica.
- Tema conferido contra `TEMAS-JA-USADOS.txt` e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 6 entregue
- Escrevi `lotes/pendentes/nw-ondas-nao-sao-metal-marte.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / Mars Express, 15/07/2026. A pauta são dunas de areia basáltica na cratera Kaiser que parecem metal por causa de gelo nas encostas; ela não repete os redemoinhos já separados para a nova grade, pois o foco é geologia e não atmosfera marciana.
- Tema conferido contra `TEMAS-JA-USADOS.txt` e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 7 entregue
- Escrevi `lotes/pendentes/nw-galaxia-nao-tem-tamanho-que-parecia.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / XMM-Newton e Chandra, 01/07/2026. O Short explica como ecos de raios X de explosões distantes permitiram medir diretamente poeira nos braços externos da galáxia e corrigir dois deles para até 10% mais longe.
- Tema conferido contra `TEMAS-JA-USADOS.txt` e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 8 entregue
- Escrevi `lotes/pendentes/nw-foto-esconde-planetas-centro-galaxia.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / Euclid, 24/06/2026. A pauta é a foto de mais de 60 milhões de estrelas no bojo galáctico, que serve de referência prévia para confirmar exoplanetas e medir massas por microlente gravitacional.
- Tema conferido contra `TEMAS-JA-USADOS.txt` e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 9 entregue
- Escrevi `lotes/pendentes/nw-cratera-nao-foi-asteroide.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / Lunar Reconnaissance Orbiter, 18/08/2026. A pauta é a cratera lunar aberta por um estágio de foguete: as imagens distinguem poeira antiga, escura e alterada de material claro recém-escavado, além de mostrar a precisão exigida para apontar a câmera orbital.
- Tema conferido contra `TEMAS-JA-USADOS.txt`, os pendentes e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 10 entregue
- Escrevi `lotes/pendentes/nw-antena-nao-ouve-radio.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / JPL, 25/08/2026. A pauta é a nova antena de 34 metros que recebe sinais de missões distantes; o Short explica a alternância entre os três continentes e por que os eletrônicos ficam em uma sala subterrânea estável.
- Tema conferido contra `TEMAS-JA-USADOS.txt`, os pendentes e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 11 entregue
- Escrevi `lotes/pendentes/nw-galaxia-nao-solta-fumaca.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / Chandra, 25/08/2026. A pauta é uma galáxia do aglomerado de Virgem que perde gás por pressão enquanto avança pelo gás quente do ambiente, deixando filamentos de hidrogênio por mais de 300 mil anos-luz.
- Tema conferido contra `TEMAS-JA-USADOS.txt`, os pendentes e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 12 entregue
- Escrevi `lotes/pendentes/nw-galaxia-nao-usa-anel-comum.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / Chandra, 25/08/2026. A pauta é uma galáxia com anel polar inclinado, provavelmente formado depois de uma colisão há cerca de um bilhão de anos, e um possível buraco negro crescendo no centro.
- Tema conferido contra `TEMAS-JA-USADOS.txt`, os pendentes e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 13 entregue
- Escrevi `lotes/pendentes/nw-juba-nao-e-fumaca.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / James Webb, 10/08/2026. A pauta é a Nebulosa do Leão: a anã branca central destrói parte da poeira expulsa pela estrela, enquanto grumos compactos sobrevivem e fazem sombra para o material atrás deles.
- Tema conferido contra `TEMAS-JA-USADOS.txt`, os pendentes e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 14 entregue
- Escrevi `lotes/pendentes/nw-telescopio-nao-ve-mais-nitido.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: NASA / Roman, atualizada em 23/08/2026. A pauta é o campo de visão ao menos 100 vezes maior, que permitirá mapear bilhões de objetos e buscar planetas por microlente gravitacional.
- Tema conferido contra `TEMAS-JA-USADOS.txt`, os pendentes e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 15 entregue
- Escrevi `lotes/pendentes/nw-planeta-nao-fica-perto-estrela.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / Cheops, 12/02/2026. A pauta é um sistema com planeta rochoso na órbita mais distante depois de dois gigantes gasosos; impacto e troca de órbitas foram descartados, restando a formação tardia num disco já sem gás como melhor explicação.
- Tema conferido contra `TEMAS-JA-USADOS.txt`, os pendentes e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 16 entregue
- Escrevi `lotes/pendentes/nw-estrela-nao-brilha-sozinha.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / XRISM, 24/03/2026. A pauta resolve o brilho incomum em raios X de uma estrela: o plasma quente segue a órbita de uma anã branca invisível que devora gás da companheira.
- Tema conferido contra `TEMAS-JA-USADOS.txt`, os pendentes e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 17 entregue
- Escrevi `lotes/pendentes/nw-escudo-nao-e-ar.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / Smile, 19/05/2026. A pauta é a primeira observação do escudo magnético terrestre em raios X, combinada com auroras em ultravioleta por até 45 horas para acompanhar a resposta ao vento solar.
- Tema conferido contra `TEMAS-JA-USADOS.txt`, os pendentes e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 18 entregue
- Escrevi `lotes/pendentes/nw-canal-nao-era-rio-calmo.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / Mars Express, 13/05/2026. A pauta é um vale marciano de 10 km de largura escavado por inundação de água subterrânea há cerca de 3,5 bilhões de anos, com cinza vulcânica e terreno de colapso ao redor.
- Tema conferido contra `TEMAS-JA-USADOS.txt`, os pendentes e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.

## 27/08 — spec para 04/09 em diante 19 entregue
- Escrevi `lotes/pendentes/nw-galaxia-nao-esta-vazia.json`, validado pelo leitor e por JSON estrito.
- Fonte primária: ESA / Hubble e Euclid, 18/02/2026. A pauta é uma galáxia fantasma localizada por quatro aglomerados de estrelas, com brilho muito fraco e análise preliminar de que 99% de sua massa é escura.
- Tema conferido contra `TEMAS-JA-USADOS.txt`, os pendentes e a grade de 28/08–03/09. Próximo: pesquisar outro tema inédito para 04/09 em diante.
