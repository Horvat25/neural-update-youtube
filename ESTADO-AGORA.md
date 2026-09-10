# ESTADO DA PRODUÇÃO — 13/ago/2026, madrugada

> Passagem de bastão. Estratégia e números: `../ESTUDO-ECOSSISTEMA-13AGO.md`.
> Plano da semana: `ORDEM-DE-SERVICO-13-20AGO.md`.

## 🔴 PRIMEIRO: o que precisa do Marcelo

**A captação de email está morta.** O Supabase do blog foi REMOVIDO (o DNS de
`vjaqqkaabvwimfyxvmlz.supabase.co` não existe — projeto pausado mantém DNS, removido não).
Os três formulários da isca chamam `supabase.functions.invoke("newsletter-subscribe")`
e falham em silêncio. A venda do ebook sobrevive porque é Hotmart, externo.

→ Conserto: **formulário hospedado no Brevo** (grátis, e o Brevo já é o nosso disparador).
Precisa de login dele. Detalhes no estudo.
→ **Decisão pendente:** suspender ou não o CTA da isca até isso ser resolvido. Não mexi
na regra 1-em-3 por conta própria; as descrições ainda apontam pro formulário quebrado.

## ✅ ENTREGUE

**2 documentários**, agendados com capa custom e na playlist `PLUqo9C3hpEyU`:
| vídeo | quando | duração | capítulos |
|---|---|---|---|
| [Anéis da Terra](https://youtube.com/watch?v=9r1IMLeeDKA) | 13/08 20h | 15,4 min | 9 |
| [Sobrevivência no Sistema Solar](https://youtube.com/watch?v=q0bdn7qa_tI) | 16/08 20h | 14,3 min | 10 (regressiva) |

**21 Shorts** de 14 a 20/ago, **todos entre 32,4s e 43,3s** (a regra dos 44s).
- 7 notícias, 3 aulas (pl17→pl18→pl19 encadeadas), 4 VSLs, 7 virais.
- As 4 notícias novas foram conferidas na fonte, não inventadas.
- A dívida da **pl17** foi paga (a pl16 prometia aula pro sábado 15 às 14h).
- **6 já subiram** (dias 14 e 15 cobertos). Faltam 15.

**Catálogo:** 5 títulos + 5 capas trocados, playlist criada.

## ▶️ ROTINA — já está automática

**Não precisa rodar nada.** Criei a tarefa agendada `neural-update-upload-diario`
(todo dia 06:38): ela roda `node upload-next.js`, sobe 6/dia, para na quota e retoma
no dia seguinte. Os 15 Shorts que faltam entram sozinhos em 3 dias.
Quando a grade acabar, ela avisa e pode ser desligada (barra lateral → Scheduled).

**Instagram: já foi.** Fila com 29 itens no GitHub (`1c71e06..90d3f5f`), 26 agendados,
cobrindo até 20/08. Verificado depois do push.

## 🚪 PORTA FECHADA: o MCP do Supabase não resolve o blog

O MCP do Supabase reconectou e responde `get_project_url` → `vtvvmikilbcalohutsmf`
(outro projeto, não o do blog). Mas **qualquer operação real devolve `Unauthorized`** —
falta access token. Ou seja: não dá pra ressuscitar o `newsletter-subscribe` por aqui,
nem inspecionar o banco. **O Brevo continua sendo o único caminho, e depende do Marcelo.**

## 🛠️ FERRAMENTAS NOVAS (13/ago)

| script | pra quê |
|---|---|
| `sugere-cues.js <slug> [seg]` | escreve o cues.txt sozinho: roda o TTS de graça e escolhe as deixas pela PAUSA na fala |
| `valida-cartelas.js <slug>` | confere de graça se toda deixa de capítulo existe, ANTES dos 20 min de render |
| `concilia-cenas.js <slug>` | se uma imagem falhar no lote, apaga a deixa órfã e renumera |
| `monta-lote-spec.js <lote.json>` | monta os mp4 de um lote do `lote-spec.js` |
| `insta-fila-add.js <lote.json>` | sobe os mp4 pro CDN e põe na fila do Instagram |
| `baixa.py` · `set-titulo.js` · `_ypp.js` · `_longos-trafego.js` | download que não trunca · título · relatórios |

`make-longo.js` ganhou: `cartelas.txt` (com número explícito pra contagem regressiva),
busca de deixa por texto contínuo, **marca NEURAL UPDATE** e corte de borda.

## ⚠️ AS SEIS ARMADILHAS SILENCIOSAS (nenhuma dá erro)

1. **`curl.exe` dentro do PowerShell TRUNCA o download.** Num lote de 70 truncou as 70:
   a Higgsfield gerava, cobrava, e o script apagava. Agora usa `baixa.py`.
   Regra: **repetir o DOWNLOAD, nunca a GERAÇÃO.**
2. **O Edge TTS junta duas palavras num evento só** (`"Quinta coisa,"`). Comparar palavra
   a palavra falha e a cartela não dispara — os capítulos seguintes saem numerados errado.
3. **O longo nunca teve marca d'água.** Existia só no gerador de Shorts.
4. **Nome de marca no prompt vira logotipo na imagem.** O estilo mandava "shot on ARRI
   Alexa" e o Soul V2 escrevia "ARRI" no canto. Removido.
5. **`build-lote.js` espera o spec DELE** (`{roteiro, titulo, quando, trilha}`). O formato
   `{slug, tags}` é do `distribui-lote.js`. Passando o errado ele grava `undefined` por
   cima do roteiro.txt e monta um vídeo narrando "undefined". Destruiu 2 antes de eu ver.
   → Por isso existe o `monta-lote-spec.js`, que nunca escreve dentro de `exports/`.
6. **O `cue-check` mede só a NARRAÇÃO.** O vídeo montado leva o STOP sensorial e a cauda,
   e sai 2-4s mais longo. Medir o **mp4 final**, não a fala.

**O hábito que achou todas:** depois de montar, extrair frames e olhar. Nenhuma aparecia
no log.

## 💰 ORÇAMENTO

Higgsfield: **34 créditos**, renova **dia 17** — sobra não acumula, gastar até lá é lucro.
Token do Instagram: renovar até **10/nov/2026**.
