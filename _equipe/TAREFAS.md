# FILA DE TRABALHO — faça em ordem, uma por vez

> Leia `LEIA-PRIMEIRO.md` antes da primeira. Depois de cada tarefa, escreva em
> `STATUS-TRABALHADOR.md` e siga para a próxima. Se travar, escreva e **pare**.

---

## O plano em uma frase

A grade vai de **28/08 a 08/09 (12 dias, 3 vídeos/dia)**. Os 24 vídeos que já existem
preenchem os slots de **08h e 18h**. Os 12 slots de **14h ficam vazios de propósito** — são as
aulas, que eu vou escrever. Você libera os 14h, ajusta o resto e produz o que eu mandar.

---

## Tarefa 1 — liberar os 12 slots de 14h no YouTube (11 reagendamentos)

Hoje há 7 vídeos ocupando slots de 14h que **não são aula**. Eles vão para slots de 08h/18h
dos dias novos. Outros 4 trocam de dia para respeitar a regra "**1 vídeo do Flow por dia**".

**Antes de começar:** rode `node list-schedule.js` e confirme que cada ID abaixo está mesmo
agendado no horário "de". ⚠️ Se um ID não bater, **PARE e me avise** — ID errado reagenda o
vídeo errado.

Rode um por vez, conferindo a saída:

```bash
node reschedule.js dQjH9qAUgjE 2026-08-30T21:00:00.000Z
node reschedule.js Cyr6WuUVffg 2026-08-31T21:00:00.000Z
node reschedule.js pOa_w2hPli8 2026-09-02T21:00:00.000Z
node reschedule.js MpLc7YSWOmA 2026-09-03T21:00:00.000Z
node reschedule.js IYnaU8n8eWE 2026-09-04T21:00:00.000Z
node reschedule.js -Ff2qxDyYFI 2026-09-05T21:00:00.000Z
node reschedule.js eI4N_v_q42w 2026-09-06T21:00:00.000Z
node reschedule.js JxDOryK8fI4 2026-09-07T21:00:00.000Z
node reschedule.js 7Rb615vEmGY 2026-09-07T11:00:00.000Z
node reschedule.js x4oyACzKZnA 2026-09-08T21:00:00.000Z
node reschedule.js -VcPgn8KaG4 2026-09-08T11:00:00.000Z
```

| ID | vídeo | de | para |
|---|---|---|---|
| `dQjH9qAUgjE` | andrômeda | 31/08 18h | **30/08 18h** |
| `Cyr6WuUVffg` | Sagitário (Flow) | 30/08 18h | **31/08 18h** |
| `pOa_w2hPli8` | Júpiter (Flow) | 03/09 18h | **02/09 18h** |
| `MpLc7YSWOmA` | planeta de rubi | 02/09 18h | **03/09 18h** |
| `IYnaU8n8eWE` | vácuo quântico | 30/08 14h | **04/09 18h** |
| `-Ff2qxDyYFI` | fusão proibida | 31/08 14h | **05/09 18h** |
| `eI4N_v_q42w` | giros do Sol | 01/09 14h | **06/09 18h** |
| `JxDOryK8fI4` | galáxias escondiam massa | 02/09 14h | **07/09 18h** |
| `7Rb615vEmGY` | energia escura | 28/08 14h | **07/09 08h** |
| `x4oyACzKZnA` | corrente estelar | 03/09 14h | **08/09 18h** |
| `-VcPgn8KaG4` | planetas algodão-doce | 29/08 14h | **08/09 08h** |

⚠️ Os IDs `-Ff2qxDyYFI` e `-VcPgn8KaG4` **começam com hífen**. Se o shell reclamar de
argumento, use `node reschedule.js -- -Ff2qxDyYFI ...` ou aspas.

**PROVA que eu quero:** a saída de `node list-schedule.js` filtrada nos agendados, mostrando
que **nenhum vídeo sobrou em horário de 14h** e que **nenhum horário tem dois vídeos**.

---

## Tarefa 2 — corrigir os títulos dos 7 que saíram do 14h

Eles estão com **🔭 no título**, que é o selo de AULA — e eles não são aula. Isso engana o
espectador. Troque o 🔭 pelo selo do slot novo: **📰** para quem foi pro 08h, e para quem foi
pro 18h **tire o emoji da frente** (o padrão do 18h é sem emoji inicial).

Os títulos ficam assim (edite `exports/<slug>/meta.json` no campo `title` **e** atualize no
YouTube — me avise se não houver script para editar título, que eu escrevo um):

| slug | título novo |
|---|---|
| `nw-energia-escura-enfraquecendo` | `📰 A energia escura NÃO é constante (o modelo balançou) 🌌 #Shorts` |
| `nw-planetas-algodao-doce` | `📰 Esses planetas NÃO deviam existir (são leves demais) 🪐 #Shorts` |
| `nw-vacuo-quantico-estrela-morta` | `O VAZIO não ficou vazio (uma estrela torceu a luz) ✨ #Shorts` |
| `nw-fusao-proibida-buracos-negros` | `Uma fusão de buracos negros que NÃO deveria existir 🕳️ #Shorts` |
| `nw-sol-girinhos-plasma-calor` | `O calor do Sol NÃO sobe reto (giros de 20 km) ☀️ #Shorts` |
| `nw-galaxias-escondiam-massa` | `Essas galáxias NÃO eram tão leves (as estrelas escondidas) 🌌 #Shorts` |
| `nw-corrente-estelar-materia-escura` | `Essa corrente NÃO é só estrelas (ela pesa o invisível) 🌌 #Shorts` |

**PROVA:** os títulos como aparecem em `node list-schedule.js`.

---

## Tarefa 3 — espelhar tudo isso na fila do Instagram

A regra do canal é **mesmo vídeo, mesmo dia, mesma hora nas duas redes**.

⚠️ **A fila do GitHub é a autoridade, não o arquivo local.** Um post duplicado já aconteceu
por causa disso. Siga exatamente:

```bash
cd "D:/Neural Update/instagram"
git fetch origin
git status -sb                     # se estiver atrás, git pull --ff-only ANTES de editar
```

1. Ajuste o campo `quando` de cada um dos 11 itens acima em `publicador/fila.json`, com os
   **mesmos horários UTC** da Tarefa 1.
2. **Depois de editar, rode a checagem de duplicata** (esta é a parte que já falhou):

```bash
node -e "
const f=require('./publicador/fila.json');
const p=f.filter(x=>x.status!=='publicado'&&x.tipo==='reels');
const m={};p.forEach(x=>{(m[x.quando]=m[x.quando]||[]).push(x.slug)});
const dupH=Object.entries(m).filter(([,v])=>v.length>1);
const s=p.map(x=>x.slug), dupS=s.filter((x,i)=>s.indexOf(x)!==i);
console.log('horario duplicado:',dupH.length?JSON.stringify(dupH):'nenhum');
console.log('slug duplicado  :',dupS.length?dupS.join(','):'nenhum');
console.log('sem midia       :',p.filter(x=>!x.midia).length);
"
```

3. Só com **tudo zerado**, faça commit e push.
4. **Confirme lendo do remoto**, nunca do arquivo local:
   `git fetch origin && git show origin/main:publicador/fila.json | node -e "..."` (mesma checagem)

**PROVA:** a saída da checagem rodada **na fila que veio do `origin/main`** depois do push.

---

## Tarefa 4 — subir os 3 vídeos novos dos dias 04, 05 e 06/09

Esses 3 já estão montados e **nunca foram ao ar**. Eles fecham os slots de 08h dos dias novos.

Crie `lotes/extra-04-06set.json` com exatamente isto:

```json
[
  {"slug":"nw-deimos-impacto-unico",      "publishAt":"2026-09-04T11:00:00.000Z"},
  {"slug":"nw-quinteto-jwst",             "publishAt":"2026-09-05T11:00:00.000Z"},
  {"slug":"nw-estrela-explodiu-sem-jato", "publishAt":"2026-09-06T11:00:00.000Z"}
]
```

Depois:

```bash
node sobe-lote.js lotes/extra-04-06set.json
```

⚠️ Antes de rodar, confirme em `node list-schedule.js` que **nenhum dos 3 já está no canal**.
Se algum estiver, tire do arquivo — subir de novo cria vídeo duplicado.

Depois disso, ponha os 3 na fila do Instagram também (mesmo procedimento da Tarefa 3, usando
`node insta-fila-add.js`, que sobe o mp4 pro CDN sozinho).

**PROVA:** os 3 IDs novos e a lista do canal mostrando 04, 05 e 06/09 às 08h.

---

## Tarefa 5 — em espera: produzir as aulas

**Não comece esta ainda.** Eu estou escrevendo os specs das 12 aulas. Cada um que ficar pronto
eu coloco em `_equipe/specs-aula/` e aviso no `STATUS-CHEFE.md`.

Quando eu avisar, o procedimento por aula é:

```bash
node _le-spec.js _equipe/specs-aula/<slug>.json          # valida
node _produz.js <slug> <url1> ... <url7>                 # eu te passo as 7 URLs de imagem
```

E então **auditar** (obrigatório, foi assim que 4 erros de narração foram pegos):

```bash
python _audita-todos.py <slug>     # compara o que o TTS falou com o roteiro.txt
```

⚠️ **Aula tem voz feminina e não tem bordão.** Se o mp4 sair com voz masculina ou com
"Neural Update, o universo está te esperando" no fim, **está errado — pare e me avise**.
