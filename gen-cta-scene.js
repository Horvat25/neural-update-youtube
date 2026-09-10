'use strict';
/** gen-cta-scene.js — gera a CENA de CTA (barra de progresso animada + INSCREVA-SE).
 *   node gen-cta-scene.js <bg_image> <out.mp4>
 * Usa cta.js pra buscar inscritos/meta reais. ~5s, 720x1280. */
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { planCta } = require('./cta');

const BG = process.argv[2];
const OUT = process.argv[3];

(async () => {
  const plan = await planCta({ force: true });
  const { subs, goal, progress } = plan.cta;
  const pct = progress.toFixed(3);
  const font = 'C\\:/Windows/Fonts/arialbd.ttf';
  const barX = 100, barW = 520, barY = 690, barH = 54;
  const fill = `${barW}*min(t/1.4\\,${pct})`; // anima 0 -> progress em 1.4s

  const vf = [
    `scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280`,
    `boxblur=18:2`, `eq=brightness=-0.34:saturation=1.08`,
    `drawtext=fontfile='${font}':text='META DO CANAL':fontcolor=0x33ccff:fontsize=44:x=(w-text_w)/2:y=430`,
    `drawtext=fontfile='${font}':text='INSCREVA-SE':fontcolor=white:fontsize=90:x=(w-text_w)/2:y=495:shadowcolor=black:shadowx=3:shadowy=3`,
    `drawbox=x=${barX}:y=${barY}:w=${barW}:h=${barH}:color=white@0.20:t=fill`,
    `drawbox=x=${barX}:y=${barY}:w='${fill}':h=${barH}:color=0x33ccff@0.95:t=fill`,
    `drawtext=fontfile='${font}':text='${subs} / ${goal} inscritos':fontcolor=white:fontsize=50:x=(w-text_w)/2:y=${barY + barH + 26}:shadowcolor=black:shadowx=2:shadowy=2`,
    `format=yuv420p`,
  ].join(',');

  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-loop', '1', '-i', BG, '-t', '5', '-vf', vf, '-r', '24', '-c:v', 'libx264', '-crf', '19', '-y', OUT], { timeout: 60000 });
  if (r.status === 0) console.log(`OK CTA scene -> ${OUT} | barra ${subs}/${goal} (${Math.round(progress * 100)}%)`);
  else { console.error('FALHA:', (r.stderr || '').toString().slice(-500)); process.exit(1); }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
