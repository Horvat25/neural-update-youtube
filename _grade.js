'use strict';
const fs=require('fs'),path=require('path');
const DESK='C:/Users/Mateus Horvat/Desktop/Neural Update - Videos para postar';
const BLOG='\n\nMais ciência no nosso blog Neural Update 👉 https://neural-update.com.br\n\n';
const MUS='\n\nMusic: Kevin MacLeod (incompetech.com) — CC BY 4.0';

// ---- os 5 do Flow: viram exports/<slug>/ com mp4 + meta.json ----
const flow=[
 {slug:'nw-flow-jupiter-sem-chao',src:'01-jupiter-flow-final-neural-update.mp4',
  title:'Júpiter não tem chão — e ninguém sabe o que tem embaixo 🪐 #Shorts',
  d:'Júpiter é uma esfera de gás sem superfície nenhuma. Descendo pelas nuvens a luz some e a pressão esmaga qualquer nave. A Grande Mancha Vermelha é uma tempestade maior que a Terra girando há séculos.',
  tags:['júpiter','sistema solar','grande mancha vermelha','planeta gasoso','astronomia','espaço','ciência']},
 {slug:'nw-flow-sagitario-a-jejum',src:'02-sagitario-a-final-neural-update.mp4',
  title:'O buraco negro da Via Láctea vive de quase nada ⚫ #Shorts',
  d:'Sagitário A* tem 4 milhões de massas solares e faz estrelas dispararem ao redor — mas menos de 1% do gás que chega nele chega a cruzar o horizonte de eventos. O resto escapa em clarões. Estamos a 26 mil anos-luz dele.',
  tags:['sagitário a','buraco negro','via láctea','horizonte de eventos','astronomia','espaço','ciência']},
 {slug:'nw-flow-portal-minhoca',src:'03-portal-buraco-de-minhoca-final-neural-update.mp4',
  title:'Este astronauta nunca chegaria do outro lado 🌀 #Shorts',
  d:'Buracos de minhoca aparecem nas equações da relatividade, mas nenhum jamais foi observado. Para continuar aberto, um túnel desses precisaria de energia negativa — algo que nunca conseguimos controlar. Sem ela, colapsaria antes da travessia.',
  tags:['buraco de minhoca','relatividade','energia negativa','física','einstein','espaço','ciência']},
 {slug:'nw-flow-cratera-falcon9',src:'04-cratera-lua-falcon9-final-neural-update.mp4',
  title:'📰 Cratera nova na Lua foi feita por um foguete NOSSO 🌑 #Shorts',
  d:'Em 5 de agosto o estágio superior de um Falcon 9 caiu sem controle na Lua e abriu um buraco de 18 metros. A sonda da NASA fotografou seis dias depois — os raios claros em volta são material que nunca tinha visto a luz do Sol.',
  tags:['lua','falcon 9','cratera','nasa','lro','spacex','espaço','ciência']},
 {slug:'nw-flow-roman-lancamento',src:'05-roman-telescope-final-neural-update.mp4',
  title:'📰 Telescópio Roman parte com espelho de satélite ESPIÃO 🔭 #Shorts',
  d:'O Nancy Grace Roman Space Telescope deixa a Terra para nunca mais voltar. O espelho dele veio de um satélite de espionagem que olhava para baixo. Ele não enxerga mais fundo que o Hubble — enxerga cem vezes mais largo, e deve medir a luz de um bilhão de galáxias.',
  tags:['telescópio roman','nancy grace roman','nasa','lançamento','hubble','galáxias','espaço','ciência']},
];
for(const f of flow){
  const dir=path.join('exports',f.slug); fs.mkdirSync(dir,{recursive:true});
  const mp4=path.join(dir,f.slug+'.mp4');
  if(!fs.existsSync(mp4)) fs.copyFileSync(path.join(DESK,f.src),mp4);
  const hs=['#Shorts','#espaço','#astronomia','#ciência','#universo','#neuralupdate'];
  fs.writeFileSync(path.join(dir,'meta.json'),JSON.stringify({
    title:f.title, description:f.d+BLOG+hs.join(' ')+MUS, tags:f.tags},null,2),'utf8');
  console.log('flow ✓',f.slug,'—',f.title.length,'chars');
}

// ---- retitular os de imagem conforme o slot ----
const novos={
 'nw-energia-escura-enfraquecendo':'🔭 A energia escura NÃO é constante (o modelo balançou) 🌌 #Shorts',
 'nw-planetas-algodao-doce':'🔭 Esses planetas NÃO deviam existir (são leves demais) 🪐 #Shorts',
 'nw-vacuo-quantico-estrela-morta':'🔭 O VAZIO não ficou vazio (uma estrela torceu a luz) ✨ #Shorts',
 'nw-fusao-proibida-buracos-negros':'🔭 Uma fusão de buracos negros que NÃO deveria existir 🕳️ #Shorts',
 'nw-sol-girinhos-plasma-calor':'🔭 O calor do Sol NÃO sobe reto (giros de 20 km) ☀️ #Shorts',
 'nw-galaxias-escondiam-massa':'🔭 Essas galáxias NÃO eram tão leves (as estrelas escondidas) 🌌 #Shorts',
 'nw-corrente-estelar-materia-escura':'🔭 Essa corrente NÃO é só estrelas (ela pesa o invisível) 🌌 #Shorts',
 'nw-tres-buracos-negros':'Acharam TRÊS buracos negros na MESMA galáxia 🕳️ #Shorts',
 'nw-terra-sumiu-ceu-de-marte':'A Terra SUMIU do céu de Marte (e um robô filmou) 🔴 #Shorts',
 'nw-andromeda-pode-nao-bater':'A colisão com Andrômeda pode NÃO acontecer 🌌 #Shorts',
 'nw-planeta-chove-rubi':'Existe um planeta onde chove RUBI e SAFIRA 💎 #Shorts',
};
for(const [slug,t] of Object.entries(novos)){
  const p=path.join('exports',slug,'meta.json');
  const m=JSON.parse(fs.readFileSync(p,'utf8'));
  if(m.title!==t){ m.title=t; fs.writeFileSync(p,JSON.stringify(m,null,2),'utf8'); }
  console.log('título ✓',slug,'—',t.length,'chars');
}
