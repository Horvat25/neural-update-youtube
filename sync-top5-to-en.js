'use strict';
/**
 * sync-top5-to-en.js — traduz os 5 Shorts BR MAIS VISTOS (era Higgsfield) e agenda no canal EN
 * nos próximos 5 dias às 22h. Lida com masters de IMAGEM (make-short-img-flex) e de VÍDEO/Veo
 * (make-short-multi). Idempotente (state) + à prova de quota (não derruba o lote).
 *   node sync-top5-to-en.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const DRY = process.argv.includes('--dry');
const HIGGS = path.join(ROOT, 'exports', 'higgsfield-test');
const OUT = path.join(ROOT, 'exports', 'english-ready', 'top5');
const STATE_FILE = path.join(ROOT, 'data', 'en-sync-state.json');
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.LLM_MODEL || 'anthropic/claude-sonnet-4-5';

// top-5 por views (era Higgsfield) → 22h nos próximos 5 dias. type: img (Soul V2) | veo (clipes)
const TOP5 = [
  { id: 'bh-planet', dir: 'bh-planet',     meta: 'bh-planet/meta.json', type: 'veo', publishAt: '2026-06-21T22:00:00-03:00' },
  { id: 'diamond',   dir: 'diamond',       meta: 'diamond.meta.json',   type: 'img', publishAt: '2026-06-22T22:00:00-03:00' },
  { id: 'giants',    dir: 'giants',        meta: 'giants.meta.json',    type: 'img', publishAt: '2026-06-23T22:00:00-03:00' },
  { id: 'portais',   dir: 'portais',       meta: 'portais.meta.json',   type: 'img', publishAt: '2026-06-24T22:00:00-03:00' },
  { id: 'dyson',     dir: 'dyson',         meta: 'dyson.meta.json',     type: 'img', publishAt: '2026-06-25T22:00:00-03:00' },
];

const loadJson = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fb; } };
const saveJson = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 2)); };

async function adaptToEnglish({ brTitle, brDesc, roteiro }) {
  const prompt = `You adapt Brazilian Portuguese YouTube Shorts into native English Shorts for a GLOBAL audience.
Make the hook and title punchy, curiosity-driven and natural (not a literal translation).
Return only valid JSON:
{"title":"English title, max 80 chars, include #Shorts","script":"spoken English narration, 45-75 words, punchy, native, ends with a question, no URL","hook":"screen hook, max 4 words, ALL CAPS","description":"English description with a question and 4-5 hashtags","tags":["8-12 English tags"],"hashtags":["#Shorts","#Science","#NeuralUpdate"],"topic":"short english topic for music"}
BR title: ${brTitle}
BR description: ${brDesc || ''}
BR narration: ${roteiro}`;
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY ausente');
  const res = await axios.post(OPENROUTER_URL, { model: MODEL, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }, {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://neural-update.com.br', 'X-Title': 'Neural Update EN Top5' }, timeout: 60000,
  });
  const m = res.data.choices[0].message.content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('LLM sem JSON');
  return JSON.parse(m[0]);
}

function run(args, env) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit', timeout: 600000, env: { ...process.env, ...(env || {}) } });
  if (r.status !== 0) throw new Error(`falhou (${r.status}): ${args.join(' ')}`);
}

(async () => {
  require('dotenv').config({ path: path.join(ROOT, '.env') });
  const state = loadJson(STATE_FILE, { processed: {} });
  let ok = 0, pend = 0, skip = 0;
  for (const e of TOP5) {
    const srcDir = path.join(HIGGS, e.dir);
    const brMeta = loadJson(path.join(HIGGS, e.meta), null);
    const roteiroPath = path.join(srcDir, 'roteiro.txt');
    if (!brMeta || !fs.existsSync(roteiroPath)) { console.warn(`! pulei ${e.id} (sem meta/roteiro)`); skip++; continue; }
    if (state.processed['en-top5:' + e.id]) { console.log(`= já agendado: ${e.id}`); skip++; continue; }

    console.log(`\n=== TOP5 ${e.id} (${e.type})  →  EN @ ${e.publishAt} ===`);
    const work = path.join(OUT, 'work', e.id);
    const raw = path.join(OUT, `${e.id}-en-raw.mp4`);
    const finalVid = path.join(OUT, `${e.id}-en-wm.mp4`);
    const metaPath = path.join(OUT, `${e.id}-en.meta.json`);

    let enMeta;
    if (fs.existsSync(finalVid) && fs.existsSync(metaPath)) {
      enMeta = loadJson(metaPath, null);
      console.log(`  (já montado: ${enMeta.title}) — só subir`);
      if (DRY) { console.log('  [dry] já pronto'); ok++; continue; }
    } else {
      const roteiro = fs.readFileSync(roteiroPath, 'utf8').trim();
      const en = await adaptToEnglish({ brTitle: brMeta.title, brDesc: brMeta.description, roteiro });
      console.log(`  TITLE: ${en.title}`);
      console.log(`  HOOK:  ${en.hook}`);
      enMeta = {
        title: en.title, description: en.description, tags: en.tags || [],
        hashtags: en.hashtags || ['#Shorts', '#Science', '#NeuralUpdate'],
        privacyStatus: 'public', includeBlog: false,
        defaultLanguage: 'en-US', defaultAudioLanguage: 'en-US',
        publishAt: e.publishAt, sourceMaster: e.id, sourceBrTitle: brMeta.title,
      };
      saveJson(metaPath, enMeta);
      if (DRY) { console.log('  [dry] meta salva, sem montar/postar'); ok++; continue; }

      fs.rmSync(work, { recursive: true, force: true });
      fs.mkdirSync(work, { recursive: true });
      fs.writeFileSync(path.join(work, 'hook.txt'), (en.hook || '').trim(), 'utf8');
      if (e.type === 'veo') {
        fs.readdirSync(srcDir).filter(f => /^scene\d+\.mp4$/i.test(f)).forEach(f => fs.copyFileSync(path.join(srcDir, f), path.join(work, f)));
        run(['make-short-multi.js', work, raw, en.topic || en.title, en.script.trim()], { SHORTS_VOICE: 'englishMale' });
      } else {
        fs.readdirSync(srcDir).filter(f => /^img\d+\.(png|jpe?g|webp)$/i.test(f)).forEach(f => fs.copyFileSync(path.join(srcDir, f), path.join(work, f)));
        fs.writeFileSync(path.join(work, 'roteiro.txt'), en.script.trim(), 'utf8');
        run(['make-short-img-flex.js', work, raw, en.topic || en.title], { SHORTS_VOICE: 'englishMale' });
      }
      run(['watermark-video.js', raw, finalVid]);
      console.log(`  ✓ montado: ${path.basename(finalVid)}`);
    }

    try {
      run(['post-video-en.js', finalVid, metaPath, e.publishAt]);
      state.processed['en-top5:' + e.id] = { title: enMeta.title, publishAt: e.publishAt, at: new Date().toISOString() };
      saveJson(STATE_FILE, state);
      console.log(`  ✓ AGENDADO no EN @ ${e.publishAt}`);
      ok++;
    } catch (err) {
      console.warn(`  ⚠ upload falhou (quota?) — vídeo PRONTO local; re-rode depois do reset.`);
      pend++;
    }
  }
  console.log(`\n=== FIM TOP5 === agendados: ${ok} | aguardando upload: ${pend} | pulados: ${skip}${DRY ? ' (DRY)' : ''}`);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
