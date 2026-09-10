#!/bin/bash
# Cola o CTA do Kindle Unlimited no fim de um Short.
#   bash cta-kindle.sh <slug> [A|B|C]
#
# Decisao do Marcelo 16/08: o formato VSL morreu (vitrine nao distribui). O video
# se distribui como CONTEUDO e a oferta pega carona nos ~10s finais, premiando
# quem assistiu ate o fim. Cadencia: 1 video sim, 1 nao, em ordem cronologica.
#
# 🚨 CONFORMIDADE AMAZON: nunca preco, nota em estrelas ou nº de avaliacoes.
#    Tamanho de catalogo e a propria oferta de teste PODEM — sao o que o material
#    oficial do Associados divulga. Ver neural-update-forge/COMISSOES-AFILIADO.md.
#
# ⚠️ SEM ACENTO e SEM VIRGULA no texto de TELA: o drawtext do ffmpeg quebra com
#    acento vindo do shell no Windows, e virgula separa argumento de filtro.
#    (A narracao e outra coisa — vai pro TTS e aceita acento normalmente.)
#
# FATOS CONFERIDOS EM 16/08 — nao alterar de cabeca:
#  · catalogo = +5 MILHOES de titulos. O "1 milhao" que eu vinha usando era o
#    numero antigo, so de ebook: subvendia o produto em 5x.
#  · o teste EXIGE cartao. Essa e a maior fricao, e o Reclame Aqui e cheio de
#    "fui cobrado porque esqueci de cancelar".
#  · da pra assinar e cancelar no MESMO minuto e ficar com os 30 dias. E a Amazon
#    paga a bonificacao mesmo se a pessoa nao usar o teste. Ou seja: aqui o
#    conselho mais honesto e tambem o mais lucrativo. Daí sai a variacao A.
S="$1"; V="${2:-A}"
case "$V" in
  A) # O TRUQUE — mata o medo nº1 (ser cobrado) e e um macete que da vontade de mandar pro amigo
     export CTA_L1="O TRUQUE"; export CTA_S1="104"
     export CTA_L2="assina e cancela na hora"
     export CTA_L4="os 30 dias continuam seus"
     export ISCA_NARR="Um truque: assina o teste de trinta dias e cancela no mesmo minuto. Você continua com os livros até o último dia, e não te cobram nada." ;;
  B) # O TAMANHO — mata as duas objecoes de uma vez: vale a pena? preciso do aparelho?
     export CTA_L1="5 MILHOES"; export CTA_S1="104"
     export CTA_L2="de livros da Amazon em 30 dias"
     export CTA_L4="no seu celular sem Kindle"
     export ISCA_NARR="Cinco milhões de livros da Amazon. Trinta dias de graça. E não precisa ter Kindle: roda no celular que você ta segurando agora." ;;
  C) # O DEFEITO PRIMEIRO — mesmo movimento de recusar o telescopio barato:
     # quem avisa do problema ganha o direito de ser ouvido
     export CTA_L1="PEDE CARTAO"; export CTA_S1="90"
     export CTA_L2="e mesmo assim vale a pena"
     export CTA_L4="cancela no 1o minuto e fica"
     export ISCA_NARR="Vou te contar o problema antes: pede cartão, mesmo sendo de graça. Mas dá pra cancelar no primeiro minuto e ficar com os trinta dias inteiros." ;;
  *) echo "variacao invalida: $V (use A, B ou C)"; exit 1 ;;
esac
export CTA_L3="LINK NA BIO"
node append-isca-cta.js "exports/$S/$S.mp4" "exports/$S/img1.png" "exports/$S/${S}-kindle.mp4" dark-some-amount-of-evil.mp3
