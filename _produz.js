'use strict';
/**
 * _produz.js — pega um spec validado + as URLs das imagens e entrega o .mp4 auditado.
 *
 * Existe para o ChatGPT poder tocar a parte mecânica da produção sozinho. O Claude gera as
 * imagens no Higgsfield (é o MCP dele) e cola as URLs aqui; daqui pra frente é tudo shell.
 *
 *   node _produz.js <slug> url1 url2 url3 url4 url5 url6 url7
 *   node _produz.js <slug> --so-montar        # imagens já estão em exports/<slug>/
 *
 * O que ele faz, em ordem:
 *   1. baixa as 7 imagens
 *   2. normaliza todas para 1080x1920 com SAR 1  ← sem isso o concat do ffmpeg quebra
 *   3. escreve roteiro.txt / cues.txt / prompts.txt / hook.txt / meta.json a partir do spec
 *   4. chama monta-lote-spec.js
 *   5. audita: duração, resolução, e o que o Whisper ouviu
 *   6. gera _tira.jpg com 7 frames lado a lado, para conferir a olho
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('./node_modules/ffmpeg-static');

const slug = process.argv[2];
if (!slug) { console.error('uso: node _produz.js <slug> [url1..url7 | --so-montar]'); process.exit(1); }

const urls = process.argv.slice(3).filter(a => a.startsWith('http'));
const soMontar = process.argv.includes('--so-montar');
const dir = path.join('exports', slug);
fs.mkdirSync(dir, { recursive: true });

// ---------- 1. procurar o spec ----------
const candidatos = [
  path.join('lotes', 'prontos', `${slug}.json`),
  path.join('lotes', 'pendentes', `${slug}.json`),
];
const specFile = candidatos.find(f => fs.existsSync(f));
if (!specFile) { console.error(`✗ spec não encontrado. Procurei em:\n  ${candidatos.join('\n  ')}`); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const it = Array.isArray(spec) ? spec[0] : spec;
console.log(`spec: ${specFile}`);

// ---------- 2. baixar ----------
if (!soMontar) {
  if (urls.length !== 7) { console.error(`✗ preciso de 7 URLs, recebi ${urls.length}`); process.exit(1); }
  urls.forEach((u, i) => {
    const destino = path.join(dir, `img${i + 1}.png`);
    const r = spawnSync('curl', ['-sL', '--max-time', '120', '-o', destino, u], { encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(destino) || fs.statSync(destino).size < 5000) {
      console.error(`✗ falhou baixar img${i + 1}`); process.exit(1);
    }
    console.log(`  ↓ img${i + 1}.png`);
  });
}

// ---------- 3. normalizar (1080x1920, SAR 1) ----------
for (let i = 1; i <= 7; i++) {
  const f = path.join(dir, `img${i}.png`);
  if (!fs.existsSync(f)) { console.error(`✗ falta ${f}`); process.exit(1); }
  const tmp = path.join(dir, `_n${i}.png`);
  const r = spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', f,
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1',
    '-frames:v', '1', tmp], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(`✗ normalizar img${i}: ${r.stderr}`); process.exit(1); }
  fs.renameSync(tmp, f);
}
console.log('  ✓ 7 imagens normalizadas para 1080x1920');

// ---------- 4. escrever os arquivos do spec ----------
fs.writeFileSync(path.join(dir, 'roteiro.txt'), it.roteiro + '\n', 'utf8');
fs.writeFileSync(path.join(dir, 'cues.txt'), it.cues.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(dir, 'prompts.txt'), it.prompts.join('\n\n') + '\n', 'utf8');
fs.writeFileSync(path.join(dir, 'hook.txt'), it.hook + '\n', 'utf8');
const desc = `${it.desc1}\n\nMais ciência no nosso blog Neural Update 👉 https://neural-update.com.br\n\n${it.hashtags.join(' ')}\n\nMusic: Kevin MacLeod (incompetech.com) — CC BY 4.0`;
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
  title: it.title, description: desc, tags: it.tags,
  _prod: { stream: it.stream, track: it.track },
}, null, 2), 'utf8');
console.log('  ✓ roteiro, cues, prompts, hook e meta escritos');

// ---------- 5. montar ----------
const loteTmp = path.join('lotes', `_produz-${slug}.json`);
fs.writeFileSync(loteTmp, JSON.stringify([it], null, 2), 'utf8');
const mp4 = path.join(dir, `${slug}.mp4`);
if (fs.existsSync(mp4)) fs.unlinkSync(mp4);
console.log('\nmontando...');
const m = spawnSync('node', ['monta-lote-spec.js', loteTmp, '--refazer'], { encoding: 'utf8' });
const saida = (m.stdout || '') + (m.stderr || '');
saida.split('\n').filter(l => /final|PRONTO|trilha:|hook na tela|✗|falha/.test(l)).forEach(l => console.log('  ' + l.trim()));
fs.unlinkSync(loteTmp);
if (!fs.existsSync(mp4)) { console.error('\n✗ o .mp4 não foi gerado'); process.exit(1); }

// ---------- 6. auditar ----------
console.log('\nauditoria:');
const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', mp4], { encoding: 'utf8' });
const info = probe.stderr || '';
const dur = (info.match(/Duration: (\d+:\d+:\d+\.\d+)/) || [])[1];
const res = (info.match(/, (\d{3,4}x\d{3,4})/) || [])[1];
const segs = dur ? (+dur.slice(3, 5)) * 60 + parseFloat(dur.slice(6)) : 0;
console.log(`  duração  : ${segs.toFixed(1)}s ${segs > 48 ? '⚠ ACIMA DE 48s — encurtar o roteiro' : segs < 36 ? '⚠ curto demais' : '✓'}`);
console.log(`  resolução: ${res}`);

const ln = spawnSync(ffmpeg, ['-hide_banner', '-i', mp4, '-af', 'loudnorm=print_format=summary', '-f', 'null', '-'], { encoding: 'utf8' });
const lufs = ((ln.stderr || '').match(/Input Integrated:\s*(-?[\d.]+)/) || [])[1];
if (lufs) console.log(`  loudness : ${lufs} LUFS`);

// tira de frames
const pts = [0.8, 6, 12, 20, 28, 35, Math.max(38, segs - 4)];
const tira = path.join(dir, '_tira.jpg');
const tmps = pts.map((t, i) => {
  const o = path.join(dir, `_f${i}.jpg`);
  spawnSync(ffmpeg, ['-v', 'error', '-y', '-ss', String(t), '-i', mp4, '-frames:v', '1', '-vf', 'scale=170:-1', o], { encoding: 'utf8' });
  return o;
}).filter(f => fs.existsSync(f));
if (tmps.length === 7) {
  spawnSync(ffmpeg, ['-v', 'error', '-y', ...tmps.flatMap(f => ['-i', f]),
    '-filter_complex', '[0:v][1:v][2:v][3:v][4:v][5:v][6:v]hstack=inputs=7', tira], { encoding: 'utf8' });
  console.log(`  tira     : ${tira}`);
}
tmps.forEach(f => { try { fs.unlinkSync(f); } catch {} });

console.log(`\n✓ ${mp4}`);
console.log('\nFALTA O CLAUDE CONFERIR: a tira de frames (as imagens fazem sentido com a fala?)');
console.log('e rodar o Whisper no áudio final para checar se o TTS falou tudo certo.');
