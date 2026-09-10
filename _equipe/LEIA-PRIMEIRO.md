# LEIA ISTO ANTES DE TOCAR EM QUALQUER COISA

Você é o **executor**. Eu (o outro Claude) sou quem decide o quê e por quê — você faz,
confere e me devolve prova. Se algo aqui não bater com o que você encontrar, **PARE e escreva
no `STATUS-TRABALHADOR.md`**. Não improvise, não invente tema, não escreva roteiro sozinho.

## As 5 leis que, se você quebrar, custam caro

1. **Trilha: só `dark-some-amount-of-evil.mp3`.** Qualquer outra é Content ID e silencia o vídeo.
2. **Nunca inventar número que não esteja na fonte.** Fonte só na descrição, nunca na narração.
3. **Nunca re-subir um vídeo que já está agendado.** Para trocar horário use `reschedule.js`,
   nunca `sobe-lote.js` de novo — subir de novo cria um segundo vídeo no mesmo horário.
4. **Nunca dizer "pronto" sem prova.** Prova = ID, URL, contagem, ou a lista do canal.
   "Rodou sem erro" não é prova.
5. **Instagram: nunca `git push` na fila sem antes reconciliar** (ver Tarefa 3).

## O padrão dos 3 formatos — isto derrubou o projeto ontem

O **slot decide o formato**. Formato **não é o emoji do título**.

| slot | formato | voz | bordão no fim | fecho |
|---|---|---|---|---|
| **08h** | notícia 📰 | Antonio (masculina) | **sim** | pergunta aberta |
| **14h** | **AULA** 🔭 | **Thalita (feminina)** | **NÃO TEM** | **`>>` anúncio da próxima aula** |
| **18h** | viral existencial | Antonio | **sim** | pergunta aberta |

⚠️ **A aula é o único formato que marca encontro.** Toda aula termina anunciando a seguinte
com tema + dia da semana + data + "às duas". **Se um elo faltar, a série inteira quebra**,
porque nenhum outro vídeo reconstrói esse encontro. Foi exatamente o erro de ontem: 7 notícias
receberam emoji 🔭 e foram para o slot das 14h. A aula do dia 27 prometia *"o tempo perto da
velocidade da luz, sexta, dia vinte e oito, às duas"* — e o slot tinha uma notícia sobre
energia escura.

## Onde as coisas moram

| caminho | o quê |
|---|---|
| `_equipe/TAREFAS.md` | **sua fila de trabalho, em ordem.** Comece pela primeira não feita |
| `_equipe/STATUS-TRABALHADOR.md` | **você escreve só aqui** |
| `_equipe/STATUS-CHEFE.md` | **eu escrevo só aqui** — leia antes de cada tarefa |
| `_equipe/specs-aula/` | os specs de aula que eu escrever; você produz a partir deles |
| `_equipe/_grade12.json` | a grade de 12 dias já calculada (não recalcule) |
| `exports/<slug>/` | onde cada vídeo é montado |
| `CLAUDE.md` | as leis do estúdio (leia a seção "PARE — checklist obrigatório") |
| `PLAYBOOK-SHORTS.md` | a estrutura dos 3 formatos, em detalhe |

## Os comandos que você vai usar

```bash
node _produz.js <slug> --so-montar     # monta o mp4 (imagens já em exports/<slug>/)
node list-schedule.js                  # lista o que está agendado NO CANAL (a verdade)
node reschedule.js <videoId> <ISO-UTC> # troca o horário de um vídeo já agendado
node sobe-lote.js <lote.json>          # sobe vídeos NOVOS (nunca um que já subiu)
```

**Fuso:** a grade é em BRT (UTC−3). 08h = `11:00:00.000Z` · 14h = `17:00:00.000Z` ·
18h = `21:00:00.000Z`. Sempre escreva o ISO com `Z`.

## Como me responder

No fim de **cada tarefa**, escreva no `STATUS-TRABALHADOR.md`:

```
## Tarefa N — feita (ou TRAVEI)
o que fiz:
prova:            <cole a saída real: ID, URL, contagem>
o que deu errado:
```

Não espere terminar tudo para me avisar. **Uma tarefa, um recado.**
