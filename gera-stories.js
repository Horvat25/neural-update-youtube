'use strict';
/**
 * gera-stories.js — transforma uma lista de fatos em PNGs 1080x1920 de Story.
 *
 *   node gera-stories.js stories/lote-01.json
 *
 * POR QUE ISSO EXISTE: o Story do @neuralupdate está 100% ocioso (0,3% das views),
 * e é o canal mais barato de relacionamento que temos. Decisão do Marcelo em
 * 16/08/2026: publicar Story diário automático.
 *
 * ⚠️ A API do Instagram IGNORA texto, figurinha e link em Story — `media_type=STORIES`
 * só aceita a imagem. Por isso o CTA vai QUEIMADO na arte. Regra aprendida no cliente
 * Reparum; ver clientes/CLAUDE.md item 6.
 *
 * Custo: ZERO crédito de imagem. É HTML renderizado pelo Chrome local, o mesmo
 * caminho de clientes/_lib/html2png.js.
 *
 * ⚠️ CONFORMIDADE AMAZON: nunca escrever preço, nota em estrelas ou nº de avaliações
 * na arte — o contrato do Associados só permite esses dados via API deles.
 * Ver neural-update-forge/COMISSOES-AFILIADO.md.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MOLDE = path.join(__dirname, 'story-template.html');
const SAIDA = path.join(__dirname, 'stories', 'saida');
const HTML2PNG = path.join(__dirname, '..', 'clientes', '_lib', 'html2png.js');

const lote = process.argv[2];
if (!lote) { console.error('uso: node gera-stories.js <lote.json>'); process.exit(1); }

const itens = JSON.parse(fs.readFileSync(path.resolve(lote), 'utf8'));
fs.mkdirSync(SAIDA, { recursive: true });
const molde = fs.readFileSync(MOLDE, 'utf8');

// escapa o que vai pro HTML; <em> é permitido de propósito, pra destacar palavra
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\[\[(.+?)\]\]/g, '<em>$1</em>');   // [[palavra]] vira destaque ciano


// Cor por tipo de story (20/08/2026). O seguidor reconhece o assunto antes de ler.
const CORES = { noticia: "#5eead4", kindle: "#34d399", blog: "#c084fc" };

// Fundo: imagem do BANCO (exports/*/imgN.png), custo zero. Se o item não pedir uma,
// sorteia — mas com semente estável no slug, pra o mesmo story sair sempre igual.
const BANCO = path.join(__dirname, "exports");
let poolFundos = null;
function achaFundo(it) {
  if (it.fundo) return path.resolve(it.fundo);
  if (!poolFundos) {
    poolFundos = [];
    for (const d of fs.readdirSync(BANCO)) {
      const dir = path.join(BANCO, d);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) if (/^img\d+\.png$/i.test(f)) poolFundos.push(path.join(dir, f));
    }
  }
  if (!poolFundos.length) return null;
  let h = 0; for (const c of it.slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return poolFundos[h % poolFundos.length];
}
const paraUrl = p => "file:///" + p.split(path.sep).join("/").replace(/ /g, "%20");

let feitos = 0;
for (const it of itens) {
  if (!it.slug || !it.fato) { console.error('✗ item sem slug ou fato — pulando'); continue; }

  // replaceAll de propósito: com `replace` de texto simples só a PRIMEIRA ocorrência
  // é trocada, e em 16/08 isso quebrou o lote inteiro — o comentário no topo do molde
  // citava {{FATO}} e roubava a substituição, deixando o corpo com o placeholder cru.
  const html = molde
    .replaceAll('{{COR}}', CORES[it.tipo] || CORES.noticia)
    .replaceAll('{{FUNDO}}', (f => f ? paraUrl(f) : '')(achaFundo(it)))
    .replaceAll('{{SELO}}', esc(it.selo || ''))
    .replaceAll('{{FATO}}', esc(it.fato))
    .replaceAll('{{FONTE}}', esc(it.fonte || ''))
    .replaceAll('{{CTA_SUB}}', esc(it.ctaSub || ''))
    .replaceAll('{{CTA}}', esc(it.cta || 'Link na bio'));

  const tmp = path.join(SAIDA, `_${it.slug}.html`);
  const png = path.join(SAIDA, `${it.slug}.png`);
  fs.writeFileSync(tmp, html, 'utf8');

  try {
    execFileSync(process.execPath, [HTML2PNG, tmp, png], { stdio: 'pipe', timeout: 120000 });
    fs.unlinkSync(tmp);
    const kb = (fs.statSync(png).size / 1024).toFixed(0);
    console.log(`✓ ${it.slug}.png  (${kb} KB)`);
    feitos++;
  } catch (e) {
    console.error(`✗ ${it.slug}:`, (e.stderr?.toString() || e.message).slice(0, 160));
  }
}

console.log(`\n${feitos}/${itens.length} Stories gerados em ${SAIDA}`);
console.log('Próximo passo: subir pro CDN e pôr na agenda —');
console.log('  higgsfield upload create "<arquivo.png>" --json');
