'use strict';
/**
 * _ep.js — constrói UM episódio do canal de ponta a ponta a partir de um spec (08/10/2026).
 *   node _ep.js <spec.json>
 *
 * Cria exports/<slug>/ (clipes, roteiro, cenas, rótulos, meta), gera narração+legenda (make-short-img-flex),
 * monta (_monta-flow), aplica o fecho do bordão (news = Marte, aula = Vênus; viral não leva), remonta,
 * põe destaques na tela e roda a bateria de checagem. Repete sozinho quando o PC fica sem memória.
 *
 * spec: { slug, tipo: 'news'|'aula'|'viral', title, desc, fonte, tags[], track,
 *         blocks[] (frases do roteiro, SEM bordão), cenas[] (bloco de cada clipe, 1-based),
 *         clips[] (caminho relativo a exports/ OU { img, dur, x0, x1, z, y } = panorâmica de imagem),
 *         rotulos[] ("palavra | texto", até 3), hashtags[] }
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const FF = require('./node_modules/ffmpeg-static');
const PY = 'C:/Users/Mateus Horvat/AppData/Local/Programs/Python/Python312/python.exe';
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const S = spec.slug, dir = path.join('exports', S);
const log = (...a) => console.log(`[ep ${S}]`, ...a);
const sleep = s => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${s * 1000})`]);
const read = f => fs.readFileSync(f, 'utf8');
const T = spec.tipo;
const VOZ = T === 'aula' ? 'female' : 'male';
const BORDAO = T === 'news' || T === 'aula';
fs.mkdirSync(dir, { recursive: true });

// ---- 1. clipes ---------------------------------------------------------------------------------------------------
for (const f of fs.readdirSync(dir)) if (/^(cena\d+\.mp4|img\d+\.png)$/.test(f)) fs.rmSync(path.join(dir, f));
spec.clips.forEach((c, i) => {
  const out = path.join(dir, `cena${i + 1}.mp4`);
  if (typeof c === 'string') {
    const src = path.join('exports', c);
    if (!fs.existsSync(src)) { log('✗ clipe não existe:', src); process.exit(1); }
    fs.copyFileSync(src, out);
  } else {
    // imagem parada (foto/ilustração da NASA etc.): mode 'pan' (padrão) corta uma janela vertical que anda;
    // mode 'fit' mostra a imagem inteira sobre a própria imagem borrada, com zoom lento (para imagens pequenas).
    const dur = c.dur || 5, z = c.z || 1, x0 = c.x0 ?? 0, x1 = c.x1 ?? 1, y = c.y ?? 0.5;
    const H = Math.round(1920 * z);
    let args;
    if (c.mode === 'fit') {
      const z0 = c.z0 ?? 1, z1 = c.z1 ?? 1.1;
      const fc = `[0:v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,eq=brightness=-0.25[bg];` +
        `[b]scale=w='1080*(${z0}+(${z1}-${z0})*t/${dur})':h=-2:eval=frame[fg];[bg][fg]overlay=x='(W-w)/2':y='(H-h)/2':eval=frame,format=yuv420p[v]`;
      args = ['-v', 'error', '-y', '-loop', '1', '-framerate', '24', '-i', c.img, '-filter_complex', fc, '-map', '[v]', '-t', String(dur),
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-an', out];
    } else {
      const vf = `scale=-2:${H},crop=1080:1920:'(iw-1080)*(${x0}+(${x1}-${x0})*t/${dur})':'(ih-1920)*${y}',format=yuv420p`;
      args = ['-v', 'error', '-y', '-loop', '1', '-framerate', '24', '-i', c.img, '-vf', vf, '-t', String(dur),
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-an', out];
    }
    const r = spawnSync(FF, args, { encoding: 'utf8' });
    if (r.status !== 0) { log('✗ pan', i + 1, (r.stderr || '').slice(-200)); process.exit(1); }
  }
});
const N = spec.clips.length;
spawnSync(PY, ['-c', `from PIL import Image\nfor i in range(1,${N + 1}): Image.new('RGB',(1080,1920),(0,0,0)).save(r'${dir}/img'+str(i)+'.png')`]);

// ---- 2. textos ---------------------------------------------------------------------------------------------------
fs.writeFileSync(path.join(dir, 'roteiro.txt'), spec.blocks.join('\n\n'));
fs.writeFileSync(path.join(dir, 'cenas.txt'), (spec.cenas || spec.clips.map((_, i) => i + 1)).join('\n') + '\n');
if (spec.rotulos && spec.rotulos.length) fs.writeFileSync(path.join(dir, 'rotulos.txt'), spec.rotulos.join('\n') + '\n');
else if (fs.existsSync(path.join(dir, 'rotulos.txt'))) fs.rmSync(path.join(dir, 'rotulos.txt'));
const desc = [spec.desc, '', spec.fonte, '', 'Mais ciência no nosso blog Neural Update 👉 https://neural-update.com.br', '',
  (spec.hashtags || []).join(' '), '', 'Music: Kevin MacLeod (incompetech.com) — CC BY 4.0'].join('\n');
const meta = {
  title: spec.title, description: desc, tags: spec.tags, privacyStatus: 'private', track: spec.track,
  _prod: { stream: T, voice: VOZ, track: spec.track, ...(T === 'aula' ? { mus_vol: 0.4 } : {}), receita: 'v2.2+padrao-02out+dinamico' },
  producao: { schema: 'producao-v1', tipo: 'misto', bordao: BORDAO, agente: 'claude', registrado_em: new Date().toISOString().slice(0, 10) },
};
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
for (const f of ['_v-sem-fecho', '_sem-rotulo.mp4', 'captions.ass', '_base-voz.mp4']) fs.rmSync(path.join(dir, f), { recursive: true, force: true });

// ---- 3. cadeia -----------------------------------------------------------------------------------------------------
const node = (args, env = {}) => spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 1200000, env: { ...process.env, ...env } });
const fixLF = () => fs.writeFileSync(path.join(dir, 'roteiro.txt'), read(path.join(dir, 'roteiro.txt')).replace(/\r/g, ''));
const MUS = T === 'aula' ? { MUS_VOL: '0.4' } : {};

function tenta(nome, fn, ok, vezes = 4) {
  for (let t = 1; t <= vezes; t++) {
    const r = fn();
    if (ok(r)) { if (t > 1) log(`${nome}: ok na tentativa ${t}`); return r; }
    log(`${nome}: tentativa ${t} falhou`); sleep(12);
  }
  log(`✗ ${nome} falhou ${vezes}x`); process.exit(1);
}
function monta() {
  fixLF();
  return tenta('monta', () => { fs.rmSync(path.join(dir, '_clips_x'), { force: true, recursive: true }); const r = node(['_monta-flow.js', S], { FALA_ATRASO_MS: '0', ...MUS });
    fs.writeFileSync(path.join(dir, '_monta.log'), (r.stdout || '') + (r.stderr || '')); return r; },
    r => /duração/.test(r.stdout || ''));
}

tenta('narração', () => {
  for (const f of fs.readdirSync(dir)) if (/^_clips_/.test(f)) fs.rmSync(path.join(dir, f), { recursive: true, force: true });
  fs.rmSync(path.join(dir, 'captions.ass'), { force: true });
  const r = node(['make-short-img-flex.js', dir, path.join(dir, '_base-voz.mp4'), spec.topic || 'astronomia', spec.track],
    { STOP_MS: '100', PERMITIR_PLACEHOLDER: '1' });
  fs.writeFileSync(path.join(dir, '_tts.log'), (r.stdout || '').replace(/frame=[^\n]*/g, '') + (r.stderr || ''));
  return r;
}, r => fs.existsSync(path.join(dir, 'captions.ass')) && /PRONTO/.test(r.stdout || ''));
const narr = (read(path.join(dir, '_tts.log')).match(/narracao ([\d.]+)s/) || [])[1];
log('narração', narr + 's');

monta();
if (BORDAO) {
  const r = node(['_fecho-vinheta.js', S], { BORDAO_VOZ: VOZ });
  if (r.status !== 0) { log('✗ fecho:', (r.stderr || r.stdout || '').slice(-300)); process.exit(1); }
  monta();
}
if (spec.rotulos && spec.rotulos.length) {
  const r = spawnSync(PY, ['rotulos-na-tela.py', S], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  log((r.stdout || r.stderr || '').trim().split('\n').pop());
}

// ---- 4. checagem ---------------------------------------------------------------------------------------------------
const mp4 = path.join(dir, `${S}.mp4`);
const ff = a => spawnSync(FF, ['-hide_banner', ...a], { encoding: 'utf8' }).stderr || '';
const integ = spawnSync(FF, ['-v', 'error', '-i', mp4, '-f', 'null', '-'], { encoding: 'utf8' }).stderr.trim() === '';
const dm = ff(['-i', mp4]).match(/Duration: (\d+):(\d+):([\d.]+)/);
const dur = dm ? +dm[1] * 3600 + +dm[2] * 60 + parseFloat(dm[3]) : 0;
const pretos = (ff(['-i', mp4, '-vf', 'blackdetect=d=0.5:pic_th=0.98', '-an', '-f', 'null', '-']).match(/black_start/g) || []).length;
const silen = (ff(['-i', mp4, '-af', 'silencedetect=n=-40dB:d=1.5', '-vn', '-f', 'null', '-']).match(/silence_start/g) || []).length;
const frz = ff(['-i', mp4, '-vf', 'freezedetect=n=0.003:d=1', '-an', '-f', 'null', '-']).match(/freeze_start: [\d.]+/g) || [];
const vol = ff(['-i', mp4, '-af', 'volumedetect', '-vn', '-f', 'null', '-']);
const mean = (vol.match(/mean_volume: (-?[\d.]+)/) || [])[1], max = (vol.match(/max_volume: (-?[\d.]+)/) || [])[1];
const cl = read(path.join(dir, '_monta.log')).match(/sincronia por fala: ([^\n]+)/);
spawnSync(FF, ['-v', 'error', '-y', '-i', mp4, '-vf', `fps=${(Math.ceil(dur / 16 * 100) / 100) ** -1},scale=150:-1,tile=16x1`, '-frames:v', '1', path.join(dir, '_tira-final.jpg')]);
const res = { slug: S, tipo: T, duracao: +dur.toFixed(1), integro: integ, pretos, silencios: silen, congelados: frz.join(' ') || 0, mean, max, cenas: cl && cl[1] };
console.log('RESULTADO ' + JSON.stringify(res));
if (dur > 42.4 && T !== 'long') log('⚠️ passou do teto de 42 s');
