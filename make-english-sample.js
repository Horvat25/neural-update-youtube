'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { generateTTSWithTimings } = require('./tts');
const { buildAss } = require('./ass-captions');

const ROOT = __dirname;
const workDir = path.join(ROOT, '.video-work', 'english-fermi-sample');
const outDir = path.join(ROOT, 'exports', 'english-ready', 'samples');
fs.mkdirSync(workDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const script = [
  'One hundred billion stars.',
  'And somehow, silence.',
  'Our galaxy is ancient, filled with worlds older than the Sun.',
  'If life is common, someone should have found us by now.',
  'So where is everybody?',
  'Maybe the silence is not empty.',
  'Maybe it is the warning.'
].join(' ');

const scenes = [
  path.join(ROOT, 'exports', 'higgsfield-test', 'fermi-final', 'scene1.mp4'),
  path.join(ROOT, 'exports', 'higgsfield-test', 'fermi-final', 'scene2.mp4'),
  path.join(ROOT, 'exports', 'higgsfield-test', 'fermi-final', 'scene3.mp4'),
];

const voicePath = path.join(workDir, 'fermi-en-voice.mp3');
const assPath = path.join(workDir, 'fermi-en.ass');
const musicPath = path.join(ROOT, 'assets', 'music-real', 'cosmic-infinite-perspective.mp3');
const output = path.join(outDir, 'fermi-short-en-watermark-bright.mp4');
const font = 'C\\:/Windows/Fonts/arialbd.ttf';

for (const file of [...scenes, musicPath]) {
  if (!fs.existsSync(file)) {
    console.error('missing file:', file);
    process.exit(1);
  }
}

function ffPath(file) {
  return file.replace(/\\/g, '/');
}

(async () => {
  const tts = await generateTTSWithTimings(script, voicePath, 'englishMale');
  if (!tts?.audioPath || !fs.existsSync(voicePath)) {
    console.error('failed to generate English voice');
    process.exit(1);
  }

  const ass = buildAss(tts.words || [], {
    group: 2,
    fontSize: 86,
    marginV: 325,
    outline: 9,
    shadow: 2,
    uppercase: true,
  });
  fs.writeFileSync(assPath, ass, 'utf8');

  const filters = [
    `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v0]`,
    `[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v1]`,
    `[2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v2]`,
    `[v0][v1][v2]concat=n=3:v=1:a=0[base]`,
    `[base]drawtext=fontfile='${font}':text='NEURAL UPDATE':fontcolor=white@0.92:fontsize=30:x=W-tw-34:y=44:shadowcolor=black@0.82:shadowx=2:shadowy=2,subtitles='${ffPath(path.relative(ROOT, assPath))}'[v]`,
    `[3:a]volume=1.55,acompressor=threshold=-18dB:ratio=2.5:attack=12:release=180,alimiter=limit=0.96[voice]`,
    `[4:a]volume=0.18,atrim=0:24,afade=t=in:st=0:d=0.8,afade=t=out:st=22:d=2[bed]`,
    `[voice][bed]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.96,loudnorm=I=-14:TP=-1.5:LRA=9[a]`,
  ].join(';');

  const args = [
    '-hide_banner', '-loglevel', 'error', '-stats',
    '-i', scenes[0],
    '-i', scenes[1],
    '-i', scenes[2],
    '-i', voicePath,
    '-stream_loop', '-1', '-i', musicPath,
    '-filter_complex', filters,
    '-map', '[v]',
    '-map', '[a]',
    '-t', '24',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-y', output,
  ];

  const res = spawnSync(ffmpeg, args, { cwd: ROOT, stdio: 'inherit', timeout: 15 * 60 * 1000 });
  if (res.status !== 0 || !fs.existsSync(output)) {
    console.error('failed to render English sample');
    process.exit(res.status || 1);
  }

  console.log(`[english-sample] ok: ${output}`);
})();
