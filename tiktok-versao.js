'use strict';
/**
 * tiktok-versao.js — gera a versão do TikTok de um vídeo da grade (notícia ou viral).
 *
 * POR QUE (11/09/2026): o TikTok SILENCIA as trilhas das 08h e das 18h
 * (`news-rising-tide`, `dark-some-amount-of-evil`) — 3 de 3 vídeos com elas deram 0 view com
 * o ícone de mudo. Só `cosmic-ice-flow` e `cosmic-ambient-espacial` passaram nas duas redes.
 * E o CTA "o projetor tá na bio" não serve lá: perfil pequeno não tem link clicável e mandar
 * pra fora do app derruba o alcance. Aula NÃO vai pro TikTok (decisão do Marcelo, 11/09).
 *
 *   node tiktok-versao.js <slug> [slug ...]      # remonta esses (vale slug antigo, fora dos lotes)
 *   node tiktok-versao.js --proximos 10          # os próximos N da grade (notícia + viral)
 *
 * Remonta a partir de exports/<slug> (imagens + roteiro) numa cópia em tiktok-lote/_montagem,
 * sem tocar no vídeo do YouTube. Saída: tiktok-lote/<slug>-tt.mp4 e <slug>-tt.legenda.txt.
 * Já existe? Pula (use --refazer); se só faltar a legenda, escreve a legenda.
 *
 * Vídeo antigo (campeões de ago/set) tem 5 ou 6 imagens, não 7 — o montador aceita qualquer
 * quantidade; o mínimo aqui é 5. Se o slug não está em nenhum lote atual, título, descrição e
 * hashtags saem do exports/<slug>/meta.json.
 * ⚠️ 11/09: há lote que guarda SÓ {slug, publishAt} (índice de agendamento). Item sem título
 * não entra na grade — antes ele quebrava a legenda e derrubava o lote inteiro de campeões.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('./node_modules/ffmpeg-static');

const ROOT = __dirname;
const SAIDA = path.join(ROOT, 'tiktok-lote');
const TRILHA_TT = { news: 'cosmic-ambient-espacial.mp3', viral: 'cosmic-ice-flow.mp3' };
const BORDAO = 'Neural Update. O universo está te esperando.';
const MIN_IMGS = 5;
// fim de roteiro que manda pra fora do app ou vende: vira o bordão
const CTA_FINAL = /projetor|na bio|link|comenta|cosmos|kindle|ebook|e-book|amazon|pdf gr[aá]tis/i;
const refazer = process.argv.includes('--refazer');

function grade() {
  const itens = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'lotes')).filter(f => f.endsWith('.json'))) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(ROOT, 'lotes', f), 'utf8')); } catch { continue; }
    for (const it of (Array.isArray(j) ? j : [])) if (it && it.slug && it.publishAt && it.title) itens.push(it);
  }
  return itens.sort((a, b) => a.publishAt < b.publishAt ? -1 : 1);
}
const vaiProTikTok = it => it.stream !== 'aula' && !/^pl\d/.test(it.slug) && it.voice !== 'female'
  && !/^2099/.test(it.publishAt);

// item montado a partir do meta.json, para vídeo antigo que não está em nenhum lote atual
function itemDoExport(slug) {
  const dir = path.join(ROOT, 'exports', slug);
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); } catch { return null; }
  if (!meta.title) return null;
  const desc = String(meta.description || '');
  const tags = (desc.match(/#[\p{L}\d_]+/gu) || []).filter(t => !/^#shorts$/i.test(t)).slice(0, 3);
  return {
    slug, stream: /📰/.test(meta.title) ? 'news' : 'viral', title: meta.title, desc1: desc,
    hashtags: tags.length ? tags : ['#astronomia', '#neuralupdate'], topic: (meta.tags || []).slice(0, 4).join(' ') || 'space',
    publishAt: meta.publishAt || null, doExport: true,
  };
}

function roteiroTikTok(txt) {
  const linhas = txt.trim().split(/\n/);
  let i = linhas.length - 1;
  while (i >= 0 && !linhas[i].trim()) i--;
  if (i >= 0 && CTA_FINAL.test(linhas[i])) linhas[i] = BORDAO;
  return linhas.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function legenda(it) {
  const titulo = it.title.replace(/#Shorts/gi, '').replace(/^📰\s*/, '').replace(/\s+/g, ' ').trim();
  const paragrafo = (it.desc1 || '').split(/\n+/)
    .find(l => l.trim() && !/projetor|#publi|na bio|https?:|kindle|amazon|ebook|music:|cc by/i.test(l) && !/^#/.test(l.trim())) || '';
  const frases = paragrafo.match(/[^.!?]+[.!?]+/g) || [paragrafo];
  const resumo = frases.slice(0, 2).join('').trim();
  const tags = [...new Set([...(it.hashtags || []), '#ciencia', '#espaco'])].join(' ');
  return [titulo, resumo, tags].filter(Boolean).join('\n\n') + '\n';
}

function monta(it) {
  const src = path.join(ROOT, 'exports', it.slug);
  const out = path.join(SAIDA, `${it.slug}-tt.mp4`);
  const leg = out.replace(/\.mp4$/, '.legenda.txt');
  if (fs.existsSync(out) && !refazer) {
    if (!fs.existsSync(leg)) { fs.writeFileSync(leg, legenda(it)); console.log(`· ${it.slug} — vídeo já existia, legenda escrita agora`); }
    else console.log(`· ${it.slug} — versão do TikTok já existe`);
    return out;
  }
  const imgs = fs.existsSync(src) ? fs.readdirSync(src).filter(f => /^img\d+\.png$/i.test(f)) : [];
  if (imgs.length < MIN_IMGS) { console.error(`✗ ${it.slug} — só ${imgs.length} imagens (mínimo ${MIN_IMGS})`); return null; }
  if (!fs.existsSync(path.join(src, 'roteiro.txt'))) { console.error(`✗ ${it.slug} — sem roteiro.txt`); return null; }

  const tmp = path.join(SAIDA, '_montagem', it.slug);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (/^img\d+\.png$/i.test(f) || ['cues.txt', 'hook.txt', '_hook.txt', 'meta.json', 'intro.txt'].includes(f))
      fs.copyFileSync(path.join(src, f), path.join(tmp, f));
  }
  fs.writeFileSync(path.join(tmp, 'roteiro.txt'),
    roteiroTikTok(fs.readFileSync(path.join(src, 'roteiro.txt'), 'utf8')));

  const trilha = TRILHA_TT[it.stream] || TRILHA_TT.viral;
  const bruto = path.join(tmp, 'bruto.mp4');
  const r = spawnSync(process.execPath, ['make-short-img-flex.js', tmp, bruto, it.topic || 'space', trilha],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, SHORTS_VOICE: 'male' }, timeout: 900000 });
  const log = (r.stdout || '') + (r.stderr || '');
  const dur = (log.match(/\[flex\] final ([\d.]+)s/) || [])[1];
  if (!dur || !fs.existsSync(bruto)) { console.error(`✗ ${it.slug}: ${log.trim().slice(-300)}`); return null; }

  // áudio em 48 kHz (o montador sai em 96 kHz) e sem metadados; vídeo copiado como está
  const f = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', bruto, '-map_metadata', '-1',
    '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-b:a', '160k', '-movflags', '+faststart', out], { encoding: 'utf8' });
  if (f.status !== 0) { console.error(`✗ ${it.slug}: ffmpeg ${(f.stderr || '').slice(-200)}`); return null; }
  fs.writeFileSync(leg, legenda(it));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`✓ ${it.slug.padEnd(42)} ${dur}s  ${trilha}  (${imgs.length} imagens)`);
  return out;
}

if (require.main === module) {
  fs.mkdirSync(SAIDA, { recursive: true });
  const todos = grade();
  const iP = process.argv.indexOf('--proximos');
  let alvo;
  if (iP > -1) {
    const agora = new Date().toISOString();
    alvo = todos.filter(it => it.publishAt > agora && vaiProTikTok(it)).slice(0, +process.argv[iP + 1] || 10);
  } else {
    const slugs = process.argv.slice(2).filter(a => !a.startsWith('--'));
    alvo = slugs.map(s => todos.find(it => it.slug === s) || itemDoExport(s) || console.error(`✗ ${s} — não está em lote nem tem meta.json`)).filter(Boolean);
  }
  if (!alvo.length) { console.error('uso: node tiktok-versao.js <slug...> | --proximos N [--refazer]'); process.exit(1); }
  let ok = 0;
  for (const it of alvo) {
    try { if (monta(it)) ok++; }
    catch (e) { console.error(`✗ ${it.slug}: ${e.message}`); } // um vídeo com problema não derruba o lote
  }
  console.log(`\n${ok}/${alvo.length} versões do TikTok prontas em tiktok-lote/`);
}

module.exports = { grade, vaiProTikTok, legenda, roteiroTikTok, monta, itemDoExport, TRILHA_TT };
