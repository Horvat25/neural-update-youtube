const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = __dirname;
const exportsDir = path.join(root, 'exports');
const ffmpeg = require('ffmpeg-static');

const packages = [
  ['nw-flow-cratera-falcon9-en', 'FALCON 9|MOON CRASH'],
  ['nw-vacuo-quantico-estrela-morta-en', 'EMPTY SPACE|TWISTED'],
  ['nw-flow-sagitario-a-jejum-en', 'OUR BLACK HOLE|IS STARVING'],
  ['nw-nascimento-de-um-magnetar-en', 'A MAGNETAR|WAS BORN'],
  ['nw-fusao-proibida-buracos-negros-en', 'FORBIDDEN|BLACK HOLE'],
  ['nw-andromeda-pode-nao-bater-en', 'ANDROMEDA|MAY MISS'],
  ['nw-asteroide-de-metal-en', 'A METAL|WORLD'],
  ['nw-sol-girinhos-plasma-calor-en', 'SOLAR|WHIRLPOOLS'],
  ['nw-flow-portal-minhoca-en', 'THE PORTAL|COLLAPSES'],
  ['nw-robo-subiu-marte-en', 'ONE KILOMETER|UP MARS'],
  ['nw-galaxias-escondiam-massa-en', 'HIDDEN|GALAXY MASS'],
  ['nw-planeta-chove-rubi-en', 'RUBIES|FALL HERE'],
  ['nw-maior-erupcao-em-io-en', 'THE BIGGEST|ERUPTION'],
  ['nw-corrente-estelar-materia-escura-en', 'WEIGHING|DARK MATTER'],
  ['nw-flow-jupiter-sem-chao-en', 'NO GROUND|ON JUPITER'],
];

function packageInfo(slug, coverText) {
  const dir = path.join(exportsDir, slug);
  return {
    slug,
    dir,
    coverText,
    master: path.join(dir, `${slug}.mp4`),
    upload: path.join(dir, '_upload.mp4'),
    script: path.join(dir, 'roteiro.txt'),
    manifest: path.join(dir, 'script_manifest.json'),
    srt: path.join(dir, 'legenda-en.srt'),
    cover: path.join(dir, 'capa.jpg'),
    meta: path.join(dir, 'meta.json'),
    para: path.join(dir, 'PARA-SUBIR.md'),
  };
}

function run(args, cwd = root) {
  const result = spawnSync(ffmpeg, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed with status ${result.status}`);
}

function writeManifest(info) {
  const narration = fs.readFileSync(info.script, 'utf8').trim();
  fs.writeFileSync(
    info.manifest,
    `${JSON.stringify({ blocks: [{ vo_line: narration }] }, null, 2)}\n`,
    'utf8',
  );
}

function compress(info) {
  run([
    '-y', '-i', info.master,
    '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280',
    '-c:v', 'libx264', '-crf', '28', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '112k', '-movflags', '+faststart',
    info.upload,
  ]);
}

function cover(info) {
  const [line1, line2] = info.coverText.split('|');
  const fontName = '_arialbd.ttf';
  const fontTarget = path.join(info.dir, fontName);
  const filterPath = path.join(info.dir, '_capa-filter.txt');
  fs.copyFileSync('C:\\Windows\\Fonts\\arialbd.ttf', fontTarget);
  const filter = [
    `[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,crop=720:405:0:438,scale=1280:720,format=rgba[base]`,
    `color=c=black@0.0:s=1280x720,format=rgba,geq=r=0:g=0:b=0:a='255*0.78*(1-X/W)'[shade]`,
    `[base][shade]overlay,drawtext=fontfile='${fontName}':text='${line1}':fontcolor=0xFFE500:fontsize=92:borderw=8:bordercolor=black:x=54:y=270,drawtext=fontfile='${fontName}':text='${line2}':fontcolor=0xFFE500:fontsize=92:borderw=8:bordercolor=black:x=54:y=380[out]`,
  ].join(';\n');
  fs.writeFileSync(filterPath, filter, 'utf8');
  try {
    run(['-y', '-ss', '20', '-i', info.master, '-filter_complex_script', filterPath, '-map', '[out]', '-frames:v', '1', '-q:v', '2', info.cover], info.dir);
  } finally {
    for (const temp of [fontTarget, filterPath]) {
      try { fs.unlinkSync(temp); } catch {}
    }
  }
}

function writeInstructions(info) {
  const meta = JSON.parse(fs.readFileSync(info.meta, 'utf8'));
  const tags = (meta.tags || []).slice(0, 10);
  const markdown = [
    `# Bilibili upload — ${info.slug}`,
    '',
    `- Video: \`_upload.mp4\``,
    `- Master: \`${info.slug}.mp4\``,
    `- Cover: \`capa.jpg\``,
    `- Subtitle: \`legenda-en.srt\``,
    `- Subtitle language: English`,
    `- Type: Original`,
    '',
    '## Title',
    '',
    meta.title,
    '',
    '## Introduction',
    '',
    meta.description,
    '',
    '## Tags — enter one at a time',
    '',
    ...tags.map((tag) => `- ${tag}`),
    '',
    '## Release',
    '',
    'Follow the approved calendar only after the single-video timezone test is confirmed.',
    '',
  ].join('\n');
  fs.writeFileSync(info.para, markdown, 'utf8');
}

function audit(info) {
  const required = [info.master, info.upload, info.srt, info.cover, info.para, info.manifest];
  const missing = required.filter((file) => !fs.existsSync(file));
  const uploadBytes = fs.existsSync(info.upload) ? fs.statSync(info.upload).size : 0;
  const coverBytes = fs.existsSync(info.cover) ? fs.statSync(info.cover).size : 0;
  const result = {
    slug: info.slug,
    missing,
    uploadMB: Number((uploadBytes / 1024 / 1024).toFixed(2)),
    uploadUnder9MB: uploadBytes > 0 && uploadBytes < 9 * 1024 * 1024,
    coverMB: Number((coverBytes / 1024 / 1024).toFixed(2)),
    coverUnder5MB: coverBytes > 0 && coverBytes < 5 * 1024 * 1024,
  };
  console.log(JSON.stringify(result));
  if (missing.length || !result.uploadUnder9MB || !result.coverUnder5MB) process.exitCode = 2;
}

const command = process.argv[2];
const requested = process.argv[3];
const selected = packages
  .filter(([slug]) => !requested || requested === 'all' || slug === requested)
  .map(([slug, coverText]) => packageInfo(slug, coverText));

if (!['manifest', 'compress', 'cover', 'instructions', 'audit'].includes(command) || !selected.length) {
  console.error('Usage: node _bili-finaliza.js <manifest|compress|cover|instructions|audit> <slug|all>');
  process.exit(1);
}

for (const info of selected) {
  if (command === 'manifest') writeManifest(info);
  if (command === 'compress') compress(info);
  if (command === 'cover') cover(info);
  if (command === 'instructions') writeInstructions(info);
  if (command === 'audit') audit(info);
}
