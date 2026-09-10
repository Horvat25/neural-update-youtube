'use strict';
/**
 * lote-spec.js — explode um JSON de lote nas pastas exports/<slug>/ do formato padrão.
 *
 * Criado em 06/08/2026 pra produzir a grade de 09 a 13/ago sem escrever 4 arquivos na mão por
 * vídeo. Gera roteiro.txt, hook.txt, cues.txt, prompts.txt e meta.json já no molde vigente
 * (ver PLAYBOOK-SHORTS.md, revisão 06/08: STOP sensorial, logo atrasada, deixas + piso de 3,5s).
 *
 * Uso:  node lote-spec.js lotes/09-ago.json
 *
 * Campos por item: slug, stream, publishAt (UTC), track, topic, title, desc1, tags[], hashtags[],
 *                  hook (multilinha), roteiro, cues[], prompts[], isca (bool), bank[] opcional
 *                  ({from:'slug/img1.png', to:'img5.png'}) pra reaproveitar cena do banco.
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, 'exports');
const BLOG = 'Mais ciência no nosso blog Neural Update 👉 https://neural-update.com.br';
const MUSIC = 'Music: Kevin MacLeod (incompetech.com) — CC BY 4.0';
const ISCA = '🎁 PDF GRÁTIS — os 5 fenômenos mais assustadores do universo (baixe de graça): https://neural-update.com.br/ebook#isca-gratis';
const EBOOK = '📕 Ebook "O Lado Sombrio do Universo" (R$19,90): https://neural-update.com.br/ebook';

const specFile = process.argv[2];
if (!specFile) { console.error('uso: node lote-spec.js <spec.json>'); process.exit(1); }
const items = JSON.parse(fs.readFileSync(specFile, 'utf8'));

let criados = 0;
for (const it of items) {
  const dir = path.join(BASE, it.slug);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'roteiro.txt'), it.roteiro.trim() + '\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'hook.txt'), it.hook.trim() + '\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'cues.txt'), it.cues.join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'prompts.txt'), it.prompts.join('\n') + '\n', 'utf8');

  const partes = [it.desc1];
  if (it.stream === 'vsl-ebook') partes.push(EBOOK);
  if (it.isca) partes.push(ISCA);
  partes.push(BLOG, it.hashtags.join(' '), MUSIC);

  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
    title: it.title,
    description: partes.join('\n\n'),
    tags: it.tags,
    hashtags: it.hashtags,
    privacyStatus: 'private',
    publishAt: it.publishAt,
    _isca: !!it.isca,
    _prod: {
      stream: it.stream, voice: it.voice || 'male', track: it.track, topic: it.topic,
      hookBig: false,
      _nota: 'Lote 09-13/ago no molde 06/08: STOP 500ms + logo atrasada, deixas (cues.txt) com piso de 3,5s.',
    },
  }, null, 2) + '\n', 'utf8');

  // cenas do banco (custo zero) — regra de custo do CLAUDE.md
  for (const b of (it.bank || [])) {
    const src = path.join(BASE, b.from);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, b.to));
    else console.warn(`  ⚠️ ${it.slug}: banco não achou ${b.from}`);
  }

  const novas = it.prompts.length;
  console.log(`✓ ${it.slug.padEnd(28)} ${it.stream.padEnd(10)} ${it.publishAt.slice(0, 16)}  ${novas} img novas + ${(it.bank || []).length} do banco${it.isca ? '  [ISCA]' : ''}`);
  criados++;
}
console.log(`\n${criados} pacote(s). Agora: node cue-check.js ${items.map(i => i.slug).join(' ')}`);
