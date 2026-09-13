'use strict';
/**
 * carrossel/enfileira.js — hospeda os slides no site e monta os itens da fila do Insta.
 *
 *   1) node carrossel/enfileira.js --copiar <worktree-do-site> carrossel/posts/<post>.json …
 *      copia saida/<slug>/NN.jpg para <site>/public/carrossel/<slug>/ e grava saida/<slug>/urls.json
 *      → depois: commit + push no neural-update-forge (push na main = deploy no Cloudflare Pages)
 *   2) node carrossel/enfileira.js carrossel/posts/<post>.json …
 *      confere que cada URL já responde image/jpeg e grava carrossel/saida/_novos-fila.json
 *   3) node carrossel/poe-na-fila.js <worktree-limpo-do-insta>/publicador/fila.json  (+ push)
 *
 * POR QUE O SITE (13/09/2026): o `higgsfield upload create` quebra com JPG — assina o upload
 * como .png e o S3 recusa (SignatureDoesNotMatch). E o feed do Instagram SÓ aceita JPEG.
 * O site neural-update.com.br já serve as artes dos stories do projetor do mesmo jeito
 * (public/stories/…), então as imagens do carrossel moram em public/carrossel/<slug>/.
 */
const fs = require('fs');
const path = require('path');

const SITE = 'https://neural-update.com.br';
const args = process.argv.slice(2);
const iCopiar = args.indexOf('--copiar');
const destinoSite = iCopiar >= 0 ? args[iCopiar + 1] : null;
// ⚠️ 13/09/2026: sem --copiar, iCopiar é -1 e "i !== iCopiar + 1" pulava o PRIMEIRO post (o de
// 13/09 ficou fora da fila). O caminho do site só existe quando --copiar foi passado.
const arquivos = args.filter((a, i) => a.endsWith('.json') && !(iCopiar >= 0 && i === iCopiar + 1));

function slidesDe(spec) {
  const dir = path.join(__dirname, 'saida', spec.slug);
  const jpgs = fs.readdirSync(dir).filter(f => /^\d\d\.jpg$/.test(f)).sort();
  if (jpgs.length !== spec.slides.length) throw new Error(`${spec.slug}: ${jpgs.length} jpg para ${spec.slides.length} slides — rode o render.js antes`);
  return { dir, jpgs };
}

(async () => {
  if (!arquivos.length) { console.error('uso: ver o cabeçalho deste arquivo'); process.exit(1); }
  const specs = arquivos.map(a => JSON.parse(fs.readFileSync(a, 'utf8')));

  if (destinoSite) {
    for (const spec of specs) {
      const { dir, jpgs } = slidesDe(spec);
      const alvo = path.join(destinoSite, 'public', 'carrossel', spec.slug);
      fs.mkdirSync(alvo, { recursive: true });
      const urls = {};
      for (const j of jpgs) {
        fs.copyFileSync(path.join(dir, j), path.join(alvo, j));
        urls[j] = `${SITE}/carrossel/${spec.slug}/${j}`;
      }
      fs.writeFileSync(path.join(dir, 'urls.json'), JSON.stringify(urls, null, 2));
      console.log(`→ ${spec.slug}: ${jpgs.length} jpg copiado(s) para ${path.relative(destinoSite, alvo)}`);
    }
    console.log('\nAgora: commit + push no site. Depois do deploy, rode sem --copiar para conferir.');
    return;
  }

  const novos = [];
  for (const spec of specs) {
    const { dir, jpgs } = slidesDe(spec);
    const urls = JSON.parse(fs.readFileSync(path.join(dir, 'urls.json'), 'utf8'));
    for (const j of jpgs) {
      const r = await fetch(urls[j], { method: 'HEAD', cache: 'no-store' });
      const tipo = r.headers.get('content-type') || '';
      if (!r.ok || !/image\/jpeg/i.test(tipo)) throw new Error(`${spec.slug}/${j}: ${r.status} ${tipo} — o deploy do site já terminou?`);
    }
    const lista = jpgs.map(j => urls[j]);
    novos.push({
      quando: spec.quando,
      tipo: lista.length > 1 ? 'carrossel' : 'post',
      midia: lista.length > 1 ? lista : lista[0],
      legenda: spec.legenda,
      slug: spec.slug,
      status: 'agendado',
      origem: 'carrossel/render.js',
    });
    console.log(`✓ ${spec.slug}: ${lista.length} imagem(ns) no ar, ${spec.quando}`);
  }
  const destino = path.join(__dirname, 'saida', '_novos-fila.json');
  fs.writeFileSync(destino, JSON.stringify(novos, null, 2));
  console.log(`\n${novos.length} item(ns) em ${path.relative(path.join(__dirname, '..'), destino)}`);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
