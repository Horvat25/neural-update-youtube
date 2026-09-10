'use strict';
/**
 * Adds a Neural Update watermark to a video.
 *
 * Usage:
 *   node watermark-video.js <input.mp4> <output.mp4>
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  console.error('usage: node watermark-video.js <input.mp4> <output.mp4>');
  process.exit(1);
}
if (!fs.existsSync(input)) {
  console.error('input not found:', input);
  process.exit(1);
}

fs.mkdirSync(path.dirname(output), { recursive: true });

const font = 'C\\:/Windows/Fonts/arialbd.ttf';

const args = [
  '-hide_banner', '-loglevel', 'error', '-stats',
  '-i', input,
  '-vf',
  `drawtext=fontfile='${font}':text='NEURAL UPDATE':fontcolor=white@0.92:fontsize=30:x=W-tw-34:y=44:shadowcolor=black@0.82:shadowx=2:shadowy=2`,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
  '-c:a', 'copy',
  '-movflags', '+faststart',
  '-y', output
];

const res = spawnSync(ffmpeg, args, { stdio: 'inherit', timeout: 15 * 60 * 1000 });
if (res.status !== 0 || !fs.existsSync(output)) {
  console.error('watermark failed');
  process.exit(res.status || 1);
}

console.log(`[watermark] ok: ${output}`);
