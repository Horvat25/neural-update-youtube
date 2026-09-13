'use strict';
/**
 * carrossel/render.js — gera os slides dos posts de FEED do @neuralupdate (1080x1350, JPEG).
 *
 *   node carrossel/render.js carrossel/posts/2026-09-13-a-massa-decide.json [outros.json…]
 *
 * Saída: carrossel/saida/<slug>/01.jpg, 02.jpg… e _tira.jpg (a tira de conferência).
 * Depois: node carrossel/enfileira.js <os mesmos .json>  (sobe as imagens e gera os itens da fila).
 *
 * POR QUE ASSIM (12/09/2026): o feed era 100% Reels — alcance sem autoridade (3,4 salvamentos
 * por post). Carrossel é o formato que mais gera salvamento. Aqui ele sai SEM crédito nenhum:
 * o texto é HTML/CSS renderizado no Chrome (puppeteer-core) e a imagem vem do banco
 * (exports/<pasta>/img*.png) ou é um astro desenhado em CSS.
 *
 * ⚠️ Astro em CSS existe de propósito: o banco tem estilo cinematográfico e nem sempre mostra o
 * objeto certo (a pasta de "Vênus" tem Saturno dentro). Em canal de ciência, astro errado na
 * tela é informação falsa — quando o slide NOMEIA um planeta, desenhar em vez de adivinhar.
 *
 * Tipos de slide (campo "tipo"): capa · texto · mito · numero · astro · lista · fim.
 * Campos: img (caminho a partir de YouTube/), pos (background-position), astro / astros,
 * ceu (fundo estrelado), kicker, titulo, sub, texto, frase, veredito (MITO|VERDADE),
 * numero, linhas [[a,b]…], fonte, cta (true = mostra salva/manda/segue).
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const RAIZ = path.join(__dirname, '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LOGO = pathToFileURL(path.join(RAIZ, 'assets', 'brand', 'nu-logo.png')).href;

// Céu estrelado determinístico (mesma semente = mesmo céu em todo post).
function estrelas(semente = 11, n = 90) {
  let s = semente;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const pontos = [];
  for (let i = 0; i < n; i++) {
    const x = (r() * 100).toFixed(1), y = (r() * 100).toFixed(1);
    const t = (r() * 2.2 + 0.8).toFixed(1), a = (r() * 0.55 + 0.3).toFixed(2);
    pontos.push(`radial-gradient(${t}px ${t}px at ${x}% ${y}%, rgba(255,255,255,${a}) 50%, transparent 52%)`);
  }
  return pontos.join(',');
}

function astro(nome, tam) {
  const t = `width:${tam}px;height:${tam}px`;
  if (nome === 'saturno') {
    return `<div class="saturno" style="${t}"><div class="anel tras"></div><div class="astro sat"></div><div class="anel frente"></div></div>`;
  }
  if (nome === 'encelado') {
    return `<div class="enc" style="${t}"><div class="astro encelado"></div><div class="jato"></div></div>`;
  }
  return `<div class="astro ${nome}" style="${t}"></div>`;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=block');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;background:#05070d}
.slide{position:relative;width:1080px;height:1350px;overflow:hidden;color:#fff;
  font-family:'Montserrat','Segoe UI',Arial,sans-serif;
  background:${estrelas()},radial-gradient(ellipse at 85% 6%,rgba(55,198,244,.22),transparent 55%),
  radial-gradient(ellipse at 6% 96%,rgba(255,140,40,.16),transparent 55%),#05070d}
.fundo{position:absolute;inset:0;background-size:cover;background-position:center}
.fundo.meia{bottom:auto;height:66%}
.veu{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,7,13,.55) 0%,rgba(5,7,13,0) 16%,rgba(5,7,13,0) 36%,rgba(5,7,13,.86) 60%,#05070d 76%)}
.veu.meia{background:linear-gradient(180deg,rgba(5,7,13,.55) 0%,rgba(5,7,13,0) 14%,rgba(5,7,13,0) 40%,#05070d 66%)}
header{position:absolute;top:44px;left:60px;right:60px;display:flex;align-items:center;gap:16px;z-index:5}
header img{width:62px;height:62px}
header span{font-weight:800;font-size:25px;letter-spacing:.2em;color:#fff}
header b{margin-left:auto;font-weight:700;font-size:24px;padding:8px 18px;border:2px solid rgba(255,255,255,.35);border-radius:99px;background:rgba(5,7,13,.45)}
footer{position:absolute;left:64px;right:64px;bottom:52px;display:flex;justify-content:space-between;align-items:center;z-index:5;font-size:27px;font-weight:600;color:rgba(255,255,255,.78)}
footer .dica{color:#FFD400;font-weight:800;letter-spacing:.06em}
main{position:absolute;left:64px;right:64px;bottom:140px;display:grid;gap:24px;z-index:4}
.kicker{font-size:27px;font-weight:800;letter-spacing:.14em;color:#37C6F4;text-transform:uppercase}
h1{font-size:98px;font-weight:900;line-height:.98;letter-spacing:-.01em;text-transform:uppercase;text-wrap:balance}
h2{font-size:68px;font-weight:800;line-height:1.04;text-wrap:balance}
h1 em,h2 em{color:#FFD400;font-style:normal}
p{font-size:39px;font-weight:500;line-height:1.33;color:rgba(255,255,255,.93)}
p strong{color:#FFD400;font-weight:800}
.sub{font-size:40px;font-weight:600}
.selo{justify-self:start;font-size:46px;font-weight:900;letter-spacing:.08em;padding:8px 26px;border:6px solid currentColor;border-radius:14px;transform:rotate(-4deg)}
.selo.MITO{color:#FF5A5A}.selo.VERDADE{color:#3DDC84}
.frase{font-size:62px;font-weight:800;line-height:1.08}
.numero{font-size:150px;font-weight:900;line-height:.95;color:#FFD400;letter-spacing:-.02em}
.palco{position:absolute;top:150px;left:0;right:0;height:600px;display:flex;justify-content:center;align-items:center;gap:36px;z-index:2}
.linhas{display:grid;gap:0}
.linha{display:grid;grid-template-columns:1fr auto;gap:24px;font-size:40px;padding:20px 0;border-bottom:2px solid rgba(255,255,255,.14)}
.linha b{color:#FFD400;font-weight:800}
.t-fim .palco{top:130px;height:560px}
.chips{display:flex;flex-wrap:wrap;gap:16px;margin-top:10px}
.chip{font-size:31px;font-weight:700;padding:14px 24px;border-radius:99px;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.22)}
.chip.segue{background:#FFD400;color:#05070d;border-color:#FFD400}
.fonte{font-size:26px;font-weight:600;color:rgba(255,255,255,.6)}
.chip-blog{justify-self:start;font-size:32px;font-weight:800;padding:16px 28px;border-radius:99px;background:#FFD400;color:#05070d}
/* astros em CSS */
.astro{position:relative;border-radius:50%;flex:none}
.astro::after{content:'';position:absolute;inset:0;border-radius:50%;box-shadow:inset -70px -50px 120px rgba(0,0,0,.72),inset 16px 12px 40px rgba(255,255,255,.18)}
.lua{background:radial-gradient(circle at 62% 38%,rgba(0,0,0,.18) 0 7%,transparent 8%),radial-gradient(circle at 35% 62%,rgba(0,0,0,.16) 0 10%,transparent 11%),radial-gradient(circle at 70% 72%,rgba(0,0,0,.14) 0 6%,transparent 7%),radial-gradient(circle at 28% 34%,rgba(0,0,0,.12) 0 5%,transparent 6%),radial-gradient(circle at 40% 30%,#ececec,#a9a9a9 55%,#6a6a6a)}
.marte{background:radial-gradient(ellipse at 30% 60%,rgba(90,25,5,.45) 0 12%,transparent 13%),radial-gradient(ellipse at 66% 34%,rgba(90,25,5,.35) 0 9%,transparent 10%),radial-gradient(ellipse 24% 7% at 50% 2%,rgba(255,245,235,.8) 0 70%,transparent 72%),radial-gradient(circle at 40% 30%,#f3a06a,#c8521d 55%,#7a2a0a)}
.venus{background:repeating-linear-gradient(-12deg,rgba(255,255,255,.09) 0 24px,rgba(0,0,0,.06) 24px 48px),radial-gradient(circle at 40% 30%,#fff1c4,#e3be6a 55%,#9b7431)}
.terra{background:radial-gradient(ellipse at 34% 42%,#3f9b4f 0 14%,transparent 15%),radial-gradient(ellipse at 64% 62%,#3a8f47 0 12%,transparent 13%),radial-gradient(ellipse 30% 7% at 50% 2%,#f4f7fb 0 70%,transparent 72%),radial-gradient(ellipse 18% 4% at 45% 30%,rgba(255,255,255,.55) 0 70%,transparent 72%),radial-gradient(ellipse 22% 4% at 62% 48%,rgba(255,255,255,.45) 0 70%,transparent 72%),radial-gradient(circle at 40% 30%,#6fb6ff,#2466c9 55%,#0e2e6b)}
.jupiter{background:radial-gradient(ellipse 14% 9% at 64% 64%,#c4552f 0 60%,transparent 62%),repeating-linear-gradient(0deg,#e8d2b0 0 8%,#c89a6a 8% 13%,#f0e2c8 13% 19%,#b57d4e 19% 23%,#dcc2a0 23% 30%)}
.sat{position:absolute;inset:0;background:repeating-linear-gradient(0deg,#f2deaa 0 10%,#dcc086 10% 16%,#efd9a2 16% 24%,#cfae70 24% 28%)}
.saturno{position:relative;flex:none;transform:rotate(-16deg)}
.anel{position:absolute;left:-48%;top:31%;width:196%;height:38%;border-radius:50%;border:30px solid rgba(226,205,160,.85);box-shadow:0 0 0 12px rgba(170,140,95,.45)}
.anel.tras{z-index:0}.sat{z-index:1}.anel.frente{z-index:2;clip-path:inset(50% 0 0 0)}
.europa{background:radial-gradient(circle at 20% 112%,transparent 58%,rgba(150,70,40,.5) 58.6% 59.6%,transparent 60.2%),radial-gradient(circle at 112% 28%,transparent 47%,rgba(150,70,40,.45) 47.6% 48.5%,transparent 49.1%),radial-gradient(circle at -14% 18%,transparent 61%,rgba(150,70,40,.4) 61.6% 62.4%,transparent 63%),radial-gradient(circle at 62% -24%,transparent 69%,rgba(150,70,40,.42) 69.6% 70.4%,transparent 71%),radial-gradient(circle at 88% 96%,transparent 38%,rgba(150,70,40,.35) 38.6% 39.3%,transparent 40%),radial-gradient(ellipse at 35% 62%,rgba(160,110,70,.18) 0 16%,transparent 17%),radial-gradient(circle at 40% 30%,#fbf3e6,#dccbb0 55%,#9a8a72)}
.enc{position:relative;flex:none}
.enc .astro{position:absolute;inset:0}
.encelado{background:linear-gradient(transparent 70%,rgba(0,0,0,0) 70%),repeating-linear-gradient(-20deg,transparent 0 26px,rgba(80,160,225,.45) 26px 31px),radial-gradient(circle at 40% 30%,#fff,#e2ecf6 55%,#9fb2c6);background-size:100% 100%,100% 30%,100% 100%;background-position:0 0,0 100%,0 0;background-repeat:no-repeat}
.jato{position:absolute;left:50%;top:94%;width:54%;height:62%;transform:translateX(-50%);background:linear-gradient(to bottom,rgba(230,245,255,.8),rgba(230,245,255,0));clip-path:polygon(44% 0,56% 0,100% 100%,0 100%);filter:blur(5px)}
.tita{background:radial-gradient(circle at 40% 30%,#f5c878,#d38b2c 55%,#7c4a12);box-shadow:0 0 70px 22px rgba(226,160,70,.45)}
.sol-branco{background:radial-gradient(circle,#fff 0 56%,#fffaf0 64%,rgba(255,255,255,0) 71%);box-shadow:0 0 140px 70px rgba(255,255,255,.35),0 0 300px 140px rgba(255,240,210,.16)}
.sol-branco::after{display:none}
`;

function topo(i, total) {
  return `<header><img src="${LOGO}"><span>NEURAL UPDATE</span>${total > 1 ? `<b>${i + 1}/${total}</b>` : ''}</header>`;
}
function rodape(i, total) {
  const ultimo = i === total - 1;
  return `<footer><span>@neuralupdate</span>${!ultimo && total > 1 ? '<span class="dica">ARRASTA →</span>' : ''}</footer>`;
}
function fundo(s, meia = false) {
  if (!s.img) return '';
  const url = pathToFileURL(path.resolve(RAIZ, s.img)).href;
  return `<div class="fundo${meia ? ' meia' : ''}" style="background-image:url('${url}');background-position:${s.pos || 'center'}"></div><div class="veu${meia ? ' meia' : ''}"></div>`;
}
function palco(s) {
  const lista = s.astros || (s.astro ? [s.astro] : []);
  if (!lista.length) return '';
  const tam = lista.length === 1 ? (s.tam || 470) : Math.floor(760 / lista.length);
  return `<div class="palco">${lista.map(n => astro(n, tam)).join('')}</div>`;
}
function chips() {
  return `<div class="chips"><span class="chip">🔖 Salva</span><span class="chip">📤 Manda pra alguém</span><span class="chip segue">Segue @neuralupdate</span></div>`;
}

function corpo(s, i, total) {
  const k = s.kicker ? `<div class="kicker">${s.kicker}</div>` : '';
  const fonte = s.fonte ? `<div class="fonte">${s.fonte}</div>` : '';
  switch (s.tipo) {
    case 'capa':
      return `${fundo(s)}${palco(s)}<main>${k}<h1>${s.titulo}</h1>${s.sub ? `<p class="sub">${s.sub}</p>` : ''}</main>`;
    case 'texto':
    case 'astro':
      return `${fundo(s, true)}${palco(s)}<main>${k}<h2>${s.titulo}</h2>${s.texto ? `<p>${s.texto}</p>` : ''}${fonte}</main>`;
    case 'mito':
      return `${fundo(s, true)}${palco(s)}<main><div class="selo ${s.veredito}">${s.veredito}</div><div class="frase">${s.frase}</div><p>${s.texto}</p></main>`;
    case 'numero':
      return `${fundo(s, true)}${palco(s)}<main>${k}<div class="numero">${s.numero}</div>${s.titulo ? `<h2>${s.titulo}</h2>` : ''}${s.texto ? `<p>${s.texto}</p>` : ''}${fonte}</main>`;
    case 'lista':
      return `${fundo(s, true)}<main>${k}<h2>${s.titulo}</h2><div class="linhas">${s.linhas.map(([a, b]) => `<div class="linha"><span>${a}</span><b>${b}</b></div>`).join('')}</div>${s.texto ? `<p>${s.texto}</p>` : ''}${s.cta ? chips() : ''}${fonte}</main>`;
    case 'blog':
      return `${fundo(s, true)}<main>${k}<h2>${s.titulo}</h2>${s.texto ? `<p>${s.texto}</p>` : ''}<div class="chip-blog">📖 Leia completo no blog · link na bio</div>${fonte}</main>`;
    case 'fim':
      return `${palco(s)}<main>${k}<h2>${s.titulo}</h2>${s.texto ? `<p>${s.texto}</p>` : ''}${chips()}${fonte}</main>`;
    default:
      throw new Error(`tipo de slide desconhecido: ${s.tipo}`);
  }
}

function html(s, i, total) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body><div class="slide t-${s.tipo}">${corpo(s, i, total)}${topo(i, total)}${rodape(i, total)}</div></body></html>`;
}

(async () => {
  const arquivos = process.argv.slice(2);
  if (!arquivos.length) { console.error('uso: node carrossel/render.js carrossel/posts/<post>.json'); process.exit(1); }
  const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
  const ff = require('ffmpeg-static');

  for (const arq of arquivos) {
    const spec = JSON.parse(fs.readFileSync(arq, 'utf8'));
    const saida = path.join(__dirname, 'saida', spec.slug);
    fs.mkdirSync(saida, { recursive: true });
    for (const f of fs.readdirSync(saida)) if (/^\d\d\.jpg$/.test(f)) fs.unlinkSync(path.join(saida, f));
    const total = spec.slides.length;
    for (let i = 0; i < total; i++) {
      const s = spec.slides[i];
      if (s.img && !fs.existsSync(path.resolve(RAIZ, s.img))) throw new Error(`${spec.slug} slide ${i + 1}: imagem não existe: ${s.img}`);
      const tmp = path.join(saida, '_slide.html');
      fs.writeFileSync(tmp, html(s, i, total), 'utf8');
      await pagina.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle0' });
      // A fonte do Google carrega por peso e só quando é usada: pedir os 5 pesos explicitamente
      // (com acento, que é outro bloco do arquivo) antes de fotografar o slide.
      await pagina.evaluate(async () => {
        await Promise.all(['500', '600', '700', '800', '900'].map(w => document.fonts.load(`${w} 40px Montserrat`, 'Aa ÁÃÇÊÕ áãçêõ 1')));
        await document.fonts.ready;
      });
      const fonteOk = await pagina.evaluate(() => document.fonts.check('900 40px Montserrat', 'Aa'));
      if (!fonteOk) throw new Error('a fonte Montserrat não carregou (sem internet?) — o slide sairia com a fonte errada');
      await pagina.screenshot({ path: path.join(saida, `${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 90 });
    }
    fs.unlinkSync(path.join(saida, '_slide.html'));
    // tira de conferência: todos os slides lado a lado
    const lista = path.join(saida, '_lista.txt');
    fs.writeFileSync(lista, spec.slides.map((_, i) => `file '${path.join(saida, String(i + 1).padStart(2, '0') + '.jpg').replace(/\\/g, '/')}'`).join('\n'));
    execFileSync(ff, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-vf', `scale=324:405,tile=${total}x1:padding=6:color=white`, '-frames:v', '1', path.join(saida, '_tira.jpg')]);
    fs.unlinkSync(lista);
    console.log(`✓ ${spec.slug}: ${total} slide(s) em ${path.relative(RAIZ, saida)}`);
  }
  await navegador.close();
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
