'use strict';
/**
 * lote-14h-ago.js — slot das 14h de 02 a 07/08/2026.
 *
 * Regra de paridade INVERTIDA em relação ao registro antigo: a aula de
 * "ciência cidadã" foi prometida EM VOZ pra sábado 01/08 (dia ímpar), então a
 * corrente ficou **aula nos ímpares (01, 03, 05, 07) e VSL nos pares (02, 04, 06)**.
 * Toda aula fecha anunciando a próxima com dia da semana + data + "às 2 da tarde" —
 * isso COMPROMETE o slot anunciado, não pode falhar.
 *
 * Aulas aqui já são do CURSO AVANÇADO (o básico fechou em 03/08 com
 * astrofísica/cosmologia). Playlist avançada: PLBLw9ndJiuyc.
 * ⚠️ Ao publicar: node add-to-playlist.js <id> PLBLw9ndJiuyc
 *
 * VSL vende o ebook PAGO ("O Lado Sombrio do Universo"), não a isca grátis.
 * Todas as cenas vêm do banco → custo ZERO.
 */

const H14 = 'T17:00:00.000Z';
const CRED = '\n\nMusic: Kevin MacLeod (incompetech.com) — CC BY 4.0';
const PL_AV = '\n\n🔭 Curso avançado — playlist: https://youtube.com/playlist?list=PLBLw9ndJiuyc';
const ISCA = '\n📩 Comenta COSMOS que eu te mando o PDF grátis dos 5 fenômenos do universo.';
const EBOOK = '\n\n📕 O Lado Sombrio do Universo — o ebook completo está no link da bio e fixado nos comentários.';

module.exports = [
  {
    slug: 'vsl11-buraco-branco', quando: '2026-08-02' + H14, voz: 'male',
    trilha: 'dark-some-amount-of-evil.mp3',
    hook: 'O CONTRÁRIO DE UM BURACO NEGRO',
    roteiro: 'Se um buraco negro engole tudo e nada sai, a matemática permite o contrário: um buraco branco, que cospe matéria e onde nada pode entrar. As equações de Einstein não proíbem. Só que ninguém nunca viu um. E tem uma hipótese incômoda: alguns físicos suspeitam que o Big Bang tenha sido exatamente isso, o outro lado de um buraco negro que colapsou em outro universo. Se estiver certo, a gente vive dentro da saída de um. É desse tipo de ideia que eu falo no meu ebook, O Lado Sombrio do Universo. Link na bio.',
    bank: ['w12-buraco-errante/img2', 'vsl5-buraco-errante/img3', 'n1-t-zero/img2', 's4-colisao-bn/img3', 'vsl-ebook/img5'],
    titulo: '📕 O buraco BRANCO: o contrário do buraco negro existe? ⚪ #Shorts',
    desc: 'As equações de Einstein não proíbem um buraco branco: um objeto que cospe matéria e onde nada pode entrar. Ninguém nunca viu um — e alguns físicos suspeitam que o Big Bang tenha sido exatamente isso.',
    tags: ['buraco branco', 'buraco negro', 'big bang', 'einstein', 'relatividade', 'ebook'],
    extra: EBOOK,
  },
  {
    slug: 'pl12-relatividade-especial', quando: '2026-08-05' + H14, voz: 'female',
    trilha: 'quantum-investigations.mp3',
    hook: 'O TEMPO NÃO PASSA IGUAL',
    roteiro: 'Bem-vindo ao curso avançado. Primeira aula: relatividade especial. Einstein partiu de duas ideias simples. Primeira: as leis da física são as mesmas pra qualquer um que se mova em velocidade constante. Segunda: a velocidade da luz é a mesma pra todo mundo, não importa o quanto você corra atrás dela. Só que se a luz não muda de velocidade, alguma outra coisa tem que ceder. E o que cede é o tempo. Quem se move rápido envelhece mais devagar, de verdade, já medido em relógio atômico. Na próxima aula: relatividade geral. Sexta, dia sete, às duas da tarde. Te espero. Neural Update. O universo está te esperando.',
    bank: ['astronomia-astrofisica-aula/img15', 'longo-lua-nao-cai/img11', 'pl5-ondas-gravitacionais/img2', 'astronomia-astrofisica-aula/img20', 'n3-um-segundo/img4'],
    titulo: '🔭 Relatividade Especial: por que o tempo não passa igual #Shorts',
    desc: 'AULA 1 do curso avançado. Einstein partiu de duas ideias: as leis da física são iguais para quem se move em velocidade constante, e a velocidade da luz é a mesma para todos. Se a luz não cede, o tempo cede.',
    tags: ['relatividade especial', 'einstein', 'dilatacao do tempo', 'velocidade da luz', 'aula', 'fisica'],
    extra: PL_AV + ISCA,
    playlist: 'PLBLw9ndJiuyc',
  },
  {
    slug: 'vsl12-fim-do-tempo', quando: '2026-08-04' + H14, voz: 'male',
    trilha: 'dark-some-amount-of-evil.mp3',
    hook: 'O UNIVERSO VAI ESQUECER TUDO',
    roteiro: 'O universo não vai acabar com explosão. Vai acabar com esquecimento. Daqui a um número de anos que não cabe na sua cabeça, a última estrela apaga, os últimos buracos negros evaporam, e o que sobra é uma sopa morna e uniforme onde nada mais pode acontecer. Sem diferença de temperatura não existe energia útil, e sem energia útil não existe evento. Nem tempo, porque tempo precisa de mudança pra ser medido. O universo não morre: ele fica idêntico a si mesmo pra sempre. Eu escrevi sobre isso no meu ebook, O Lado Sombrio do Universo. Link na bio.',
    bank: ['n15-morte-termica/img2', 'n14-ultimo-buraco-negro/img3', 'n13-ultima-estrela/img2', 'n15-morte-termica/img5', 'vsl-ebook/img3'],
    titulo: '📕 A morte térmica: o universo vai ESQUECER tudo 🌑 #Shorts',
    desc: 'O universo não acaba com explosão, acaba com esquecimento. Sem diferença de temperatura não existe energia útil, e sem energia útil não existe evento — nem tempo, que precisa de mudança para ser medido.',
    tags: ['morte termica', 'fim do universo', 'entropia', 'termodinamica', 'cosmologia', 'ebook'],
    extra: EBOOK,
  },
  {
    slug: 'vsl13-nada-quantico', quando: '2026-08-06' + H14, voz: 'male',
    trilha: 'quantum-investigations.mp3',
    hook: 'O VÁCUO NÃO ESTÁ VAZIO',
    roteiro: 'O vácuo perfeito não existe. Tire todo átomo, toda luz, toda partícula de uma caixa, e o que sobra ainda ferve. A física quântica permite que pares de partículas apareçam do nada e se aniquilem em seguida, tempo demais curto pra violar a conservação de energia. Isso não é especulação: esse borbulhar já foi medido em laboratório pelo efeito que ele faz em duas placas metálicas muito próximas. O nada tem energia, e ela pode ser a coisa que está acelerando a expansão do universo. Eu abro esse assunto no meu ebook, O Lado Sombrio do Universo. Link na bio.',
    bank: ['vsl10-decaimento-vacuo/img2', 'vsl10-decaimento-vacuo/img4', 'aula-energia-escura/img3', 's6-toque/img2', 'vsl-ebook/img4'],
    titulo: '📕 O vácuo não está VAZIO (e isso foi medido) ⚛️ #Shorts',
    desc: 'Tire todo átomo e toda luz de uma caixa e o que sobra ainda ferve: pares de partículas surgem do nada e se aniquilam. O efeito já foi medido entre duas placas metálicas próximas.',
    tags: ['vacuo quantico', 'efeito casimir', 'energia do vacuo', 'energia escura', 'fisica quantica', 'ebook'],
    extra: EBOOK,
  },
  {
    slug: 'pl13-relatividade-geral', quando: '2026-08-07' + H14, voz: 'female',
    trilha: 'cosmic-ambient-espacial.mp3',
    hook: 'GRAVIDADE NÃO É UMA FORÇA',
    roteiro: 'Aula dois do avançado: relatividade geral. E ela começa com uma frase que parece errada: gravidade não é uma força. Einstein percebeu que massa deforma o espaço e o tempo em volta dela, como um peso afundando um tecido esticado. O que a gente chama de queda é só um objeto seguindo o caminho mais reto possível dentro de um espaço que está curvo. A Terra não puxa você: ela dobra o espaço, e você desliza. E isso foi confirmado num eclipse, medindo a luz de estrelas se curvando ao passar perto do Sol. Na próxima aula: espaço-tempo. Domingo, dia nove, às duas da tarde. Te espero. Neural Update. O universo está te esperando.',
    bank: ['longo-lua-nao-cai/img13', 'longo-lua-nao-cai/img12', 'longo-lua-nao-cai/img15', 'longo-lua-nao-cai/img16', 'astronomia-astrofisica-aula/img15'],
    titulo: '🔭 Relatividade Geral: gravidade NÃO é uma força #Shorts',
    desc: 'AULA 2 do curso avançado. Massa deforma o espaço e o tempo em volta dela. O que chamamos de queda é um objeto seguindo o caminho mais reto possível num espaço curvo — confirmado num eclipse, medindo a luz de estrelas se curvando perto do Sol.',
    tags: ['relatividade geral', 'einstein', 'gravidade', 'espaco-tempo', 'eclipse', 'aula', 'fisica'],
    extra: PL_AV + ISCA,
    playlist: 'PLBLw9ndJiuyc',
  },
].map(v => ({
  ...v,
  desc: v.desc + (v.extra || '') + CRED + '\n\n#astronomia #universo #espaço #ciencia #neuralupdate',
}));
