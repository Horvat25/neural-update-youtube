# YouTube — estado agora

> **Substituir, não acrescentar.** Atualizar a cada lote agendado. Prova = listar os agendados
> **no canal** (não confiar em `data/sobe-lote.json`, os IDs ficam velhos quando um vídeo é re-subido).

**Atualizado:** 10/10/2026 (madrugada) · conferido no canal pela API: 18 agendados, 1 por horário, título certo em todos.

## Agendados (lote `lotes/yt-10a15out.json`, specs em `exports/_lote-10a15out/specs/`)

| dia | 08h notícia | 14h aula | 18h viral |
|---|---|---|---|
| sáb 10/10 | `nw-crew12-volta-237-dias` (wntXLX1bebg) | `pl64-jupiter-mancha-vermelha` (fOM_lMnqoOY) | `viral-estacoes-nao-e-distancia` (wjujuZbCGIw) |
| dom 11/10 | `nw-spherex-anas-marrons` (8sOAleRNjPw) | `pl65-marte-ja-teve-ar-grosso` (cj6vw1MrPWY) | `viral-lua-mercurio-segunda` (H3qJAIfksvU) |
| seg 12/10 | `nw-webb-sinal-radio-mais-distante` (0S8Wi5_tUt8) | `pl66-terra-escudo-magnetico` (Tc8ELbk7YnQ) | `viral-estrelas-piscam-planetas-nao` (3IATy72XDjs) |
| ter 13/10 | `nw-hubble-planeta-segunda-geracao` (bVFDLiDWyJg) | `pl67-cometas-bola-de-neve-suja` (q1LjcNQlQbI) | `viral-lado-escuro-lua-nao-e-escuro` (_3sTNCrMh60) |
| qua 14/10 | `nw-curiosity-amanhecer-marte` (DKqvYmNH8Fo) | `pl68-sol-coroa-mais-quente` (f0uNzz60mLM) | `viral-sol-perde-4-milhoes-toneladas` (nfBEwluQLHI) |
| qui 15/10 | `nw-mmx-japao-fobos` (fPa84niK76U) | `pl69-titan-lua-com-chuva` (SBpowyWv_Ac) | `viral-orionidas-poeira-halley` (WbVbSAgeoLM) |

## O que falta

| slot | situação |
|---|---|
| sex 16/10 em diante | **não existe**. Aula segue o Sistema Solar sem anunciar a próxima (decisão de 08/10) |

## Lembretes do lote atual

- Todo vídeo subiu com **"Uso de IA = Sim"** pelo uploader (a API não devolve o campo; conferir no Studio se reagendar).
- Notas do Jev (tema e edição) congeladas antes de publicar: `../analytics/jev/modelo/previsoes-*.jsonl` (commits `3a41d1a`, `99bc1d5`).
- Toda segunda: `node ../analytics/jev/compara-nota-views.js` (nota × views/h).
