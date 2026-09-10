'use strict';
/**
 * sync-all-to-en.js — traduz os Shorts BR AGENDADOS e agenda no canal EN nos MESMOS horários.
 * Não depende de o vídeo BR estar público (usa os masters locais + um mapa explícito).
 * Reusa a tradução LLM (OpenRouter/Claude Sonnet) do Codex + voz EN + marca d'água.
 *
 *   node sync-all-to-en.js --dry     (só traduz e mostra, NÃO posta)
 *   node sync-all-to-en.js           (traduz, monta, marca e AGENDA no canal EN)
 *   node sync-all-to-en.js --only=d1-newton   (processa só um)
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const DRY = process.argv.includes('--dry');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || null;
const HIGGS = path.join(ROOT, 'exports', 'higgsfield-test');
const OUT = path.join(ROOT, 'exports', 'english-ready');
const STATE_FILE = path.join(ROOT, 'data', 'en-sync-state.json');
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.LLM_MODEL || 'anthropic/claude-sonnet-4-5';

// master (pasta em higgsfield-test) -> horário do BR (mesmo horário no EN). Sem CTA (é BR-específico).
const SCHEDULE = [
  ['q1-dupla-fenda',  '2026-06-21T09:00:00-03:00'],
  ['d1-newton',       '2026-06-21T14:00:00-03:00'],
  ['p2-tesla',        '2026-06-21T18:00:00-03:00'],
  ['q3-emaranhamento','2026-06-22T09:00:00-03:00'],
  ['d2-buraco-branco','2026-06-22T14:00:00-03:00'],
  ['q4-computacao',   '2026-06-22T18:00:00-03:00'],
  ['q5-tunelamento',  '2026-06-23T09:00:00-03:00'],
  ['d3-hawking',      '2026-06-23T14:00:00-03:00'],
  ['n1-neutrons',     '2026-06-23T18:00:00-03:00'],
  ['q2-schrodinger',  '2026-06-24T09:00:00-03:00'],
  ['d4-elon',         '2026-06-24T14:00:00-03:00'],
  ['n2-som-bh',       '2026-06-24T18:00:00-03:00'],
  ['n3-diamantes',    '2026-06-25T09:00:00-03:00'],
  ['d5-matusalem',    '2026-06-25T14:00:00-03:00'],
  ['n4-ton618',       '2026-06-25T18:00:00-03:00'],
];

const loadJson = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fb; } };
const saveJson = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 2)); };

async function adaptToEnglish({ brTitle, brDesc, roteiro }) {
  const prompt = `You adapt Brazilian Portuguese YouTube Shorts into native English Shorts for a GLOBAL audience.
Make the hook and title punchy, curiosity-driven and natural (not a literal translation).

Return only valid JSON:
{
  "title": "English title, max 80 chars, include #Shorts",
  "script": "spoken English narration, 45-75 words, punchy, native, ends with a question, no URL",
  "hook": "screen hook, max 4 words, ALL CAPS, very short so it fits the screen",
  "description": "English YouTube description with a question and 4-5 hashtags",
  "tags": ["8-12 English tags"],
  "hashtags": ["#Shorts","#Science","#NeuralUpdate"],
  "topic": "short topic in english for music selection"
}

BR title: ${brTitle}
BR description: ${brDesc || ''}
BR narration: ${roteiro}`;
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY ausente no .env');
  const res = await axios.post(OPENROUTER_URL, {
    model: MODEL, max_tokens: 1200, messages: [{ role: 'user', content: prompt }],
  }, {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json',
      'HTTP-Referer': 'https://neural-update.com.br', 'X-Title': 'Neural Update EN Sync' },
    timeout: 60000,
  });
  const m = res.data.choices[0].message.content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('LLM não retornou JSON');
  return JSON.parse(m[0]);
}

function copyImages(srcDir, workDir) {
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
  const imgs = fs.readdirSync(srcDir).filter(f => /^img\d+\.(png|jpe?g|webp)$/i.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  if (imgs.length < 2) throw new Error(`poucas imagens em ${srcDir}`);
  imgs.forEach(im => fs.copyFileSync(path.join(srcDir, im), path.join(workDir, im)));
}

function run(args, env) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit', timeout: 600000, env: { ...process.env, ...(env || {}) } });
  if (r.status !== 0) throw new Error(`falhou (${r.status}): ${args.join(' ')}`);
}

(async () => {
  require('dotenv').config({ path: path.join(ROOT, '.env') });
  const state = loadJson(STATE_FILE, { processed: {} });
  const list = ONLY ? SCHEDULE.filter(([d]) => d === ONLY) : SCHEDULE;
  let ok = 0, skip = 0, pend = 0;
  for (const [dir, publishAt] of list) {
    const srcDir = path.join(HIGGS, dir);
    const meta = loadJson(path.join(srcDir, 'meta.json'), null);
    const roteiroPath = path.join(srcDir, 'roteiro.txt');
    if (!meta || !fs.existsSync(roteiroPath)) { console.warn(`! pulei ${dir} (sem meta/roteiro)`); skip++; continue; }
    if (state.processed['en:' + dir] && !ONLY) { console.log(`= já feito: ${dir}`); skip++; continue; }

    console.log(`\n=== ${dir}  →  EN @ ${publishAt} ===`);
    const work = path.join(OUT, 'work', dir);
    const raw = path.join(OUT, `${dir}-en-raw.mp4`);
    const finalVid = path.join(OUT, `${dir}-en-wm.mp4`);
    const metaPath = path.join(OUT, `${dir}-en.meta.json`);

    let enMeta;
    if (fs.existsSync(finalVid) && fs.existsSync(metaPath)) {
      // Já montado num run anterior — só falta subir (idempotente, não regasta LLM nem remonta).
      enMeta = loadJson(metaPath, null);
      console.log(`  (já montado: ${enMeta.title}) — só subir`);
      if (DRY) { console.log('  [dry] já pronto'); ok++; continue; }
    } else {
      const roteiro = fs.readFileSync(roteiroPath, 'utf8').trim();
      const en = await adaptToEnglish({ brTitle: meta.title, brDesc: meta.description, roteiro });
      console.log(`  TITLE: ${en.title}`);
      console.log(`  HOOK:  ${en.hook}`);
      enMeta = {
        title: en.title, description: en.description, tags: en.tags || [],
        hashtags: en.hashtags || ['#Shorts', '#Science', '#NeuralUpdate'],
        privacyStatus: 'public', includeBlog: false,
        defaultLanguage: 'en-US', defaultAudioLanguage: 'en-US',
        publishAt, sourceMaster: dir, sourceBrTitle: meta.title,
      };
      saveJson(metaPath, enMeta);
      if (DRY) { console.log('  [dry] meta salva, sem montar/postar'); ok++; continue; }
      copyImages(srcDir, work);
      fs.writeFileSync(path.join(work, 'roteiro.txt'), en.script.trim(), 'utf8');
      fs.writeFileSync(path.join(work, 'hook.txt'), (en.hook || '').trim(), 'utf8');
      run(['make-short-img-flex.js', work, raw, en.topic || en.title], { SHORTS_VOICE: 'englishMale' });
      run(['watermark-video.js', raw, finalVid]);
      console.log(`  ✓ montado: ${path.basename(finalVid)}`);
    }

    // Upload (única etapa que gasta quota). Se a quota estourar, NÃO derruba o lote:
    // o vídeo fica PRONTO local e um re-run depois sobe (sem remontar).
    try {
      run(['post-video-en.js', finalVid, metaPath, publishAt]);
      state.processed['en:' + dir] = { title: enMeta.title, publishAt, at: new Date().toISOString() };
      saveJson(STATE_FILE, state);
      console.log(`  ✓ AGENDADO no EN @ ${publishAt}`);
      ok++;
    } catch (e) {
      console.warn(`  ⚠ upload falhou (quota?) — vídeo PRONTO local; re-rode depois do reset pra subir.`);
      pend++;
    }
  }
  console.log(`\n=== FIM === agendados: ${ok} | montados aguardando upload: ${pend} | pulados: ${skip}${DRY ? ' (DRY)' : ''}`);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
