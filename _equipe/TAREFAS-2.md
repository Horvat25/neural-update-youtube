# FILA 2 — as aulas (comece pela Tarefa 6)

> As tarefas 1, 2 e 3 você fechou. Obrigado — a Tarefa 4 travou por erro **meu**, e a
> Tarefa 6 abaixo resolve. Leia `LEIA-PRIMEIRO.md` se ainda não leu.

---

## Tarefa 6 — fechar o slot de 05/09 08h (destravar a Tarefa 4)

Você estava certo: o `nw-quinteto-jwst` já tinha ido ao ar em 19/08. Falha minha no
cruzamento — o título vinha truncado na lista do canal e não bateu. **Não mexa nele.**

O substituto vem dos 28 specs que o ChatGPT deixou em `lotes/pendentes/`. Use
**`nw-eclipse-artificial-duas-naves`** (não colide com nada da grade).

```bash
node _le-spec.js lotes/pendentes/nw-eclipse-artificial-duas-naves.json --salvar
```

Se passar na validação, gere as **7 imagens** com o MCP do Higgsfield —
`model: "soul_cinematic"`, `aspect_ratio: "9:16"`, `quality: "2k"` —
usando exatamente os 7 prompts do campo `prompts` do spec. Depois:

```bash
node _produz.js nw-eclipse-artificial-duas-naves <url1> <url2> ... <url7>
```

Agende em **05/09 08h** (`2026-09-05T11:00:00.000Z`) via `sobe-lote.js` com um lote de um
item só, e espelhe no Instagram.

**PROVA:** o ID novo, a duração do mp4, e a linha de 05/09 08h em `list-schedule.js`.

---

## Tarefa 7 — espelhar no Instagram os 2 que você já subiu

Os vídeos de **04/09** (`nw-deimos-impacto-unico`) e **06/09**
(`nw-estrela-explodiu-sem-jato`) entraram no YouTube mas ainda não estão na fila do Insta.

```bash
node insta-fila-add.js <lote-com-esses-2>.json
```

Ele sobe o mp4 pro CDN sozinho. Depois **a checagem de duplicata da Tarefa 3**, commit, push,
e confirme lendo de `origin/main`.

**PROVA:** a checagem rodada na fila que veio do remoto.

---

## Tarefa 8 — produzir as 5 AULAS  ⭐ a mais importante

Os specs estão prontos e **já passaram na validação**, em `_equipe/specs-aula/`:

| spec | vai ao ar | tema |
|---|---|---|
| `pl28-lentes-gravitacionais` | **29/08 14h** | massa entorta a luz; a mesma galáxia em 4 cópias |
| `pl29-raio-de-schwarzschild` | **30/08 14h** | a Terra caberia em 9 mm |
| `pl30-estrelas-de-neutrons` | **31/08 14h** | uma colher pesa bilhões de toneladas |
| `pl31-pulsares` | **01/09 14h** | o farol que bate melhor que relógio atômico |
| `pl32-magnetares` | **02/09 14h** | o ímã que racha a própria estrela |

**Faça uma por vez, na ordem.** Para cada uma:

```bash
node _le-spec.js _equipe/specs-aula/<slug>.json --salvar   # confirma e copia p/ lotes/prontos
# gerar as 7 imagens no Higgsfield com os prompts do spec (soul_cinematic, 9:16, 2k)
node _produz.js <slug> <url1> ... <url7>
python _audita-todos.py <slug>                              # obrigatório
```

### ⚠️ Aula é diferente — confira ANTES de dar por pronta

1. **Voz FEMININA (Thalita).** O `monta-lote-spec.js` decide pelo `meta.json`: o spec já traz
   `"voice":"female"` e `"stream":"aula"`. **Se o mp4 sair com voz masculina, PARE e me avise.**
2. **SEM bordão.** Não pode terminar com "Neural Update. O universo está te esperando."
   Aula não leva bordão — é decisão do Marcelo de 13/08.
3. **O `>>` na última linha é de propósito.** Ele faz o TTS acelerar o anúncio da próxima aula
   (+22%). O marcador some antes do áudio e não vaza para a legenda. **Não apague.**
4. **A corrente não pode quebrar.** Cada aula anuncia a seguinte com dia da semana + data.
   Confira que o anúncio bate com o tema da aula do dia seguinte na tabela acima. Se não
   bater, **pare** — um elo errado quebra a série inteira.
5. **`neutron` sem acento** aparece de propósito nos roteiros da pl30/pl31/pl32: o TTS lê
   "neutros" quando está acentuado. A legenda mostra a forma certa por substituição.

Depois de montar as 5, agende todas às 14h dos dias da tabela (`17:00:00.000Z`) e espelhe no
Instagram.

**PROVA por aula:** duração do mp4, a saída do Whisper sem palavra faltando, e a confirmação
de que **não tem bordão** no fim.

---

## O que NÃO é seu

As **7 aulas dos dias 28/08, 03/09, 04/09, 05/09, 06/09, 07/09 e 08/09** vão ser feitas em
**vídeo no Google Flow** — essa parte é minha. Não abra o Flow, não produza esses dias.

Se acabar as tarefas 6, 7 e 8, escreva no seu status e **fique parado**. Não invente vídeo
novo: tudo que existe fora da grade vira retrabalho.
