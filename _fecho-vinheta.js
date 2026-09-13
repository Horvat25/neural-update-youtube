'use strict';
/**
 * _fecho-vinheta.js — põe o fecho oficial (pausa + bordão + vinheta) num episódio feito com o
 * _monta-flow.js. Depois dele, rodar `node _monta-flow.js <slug>` de novo.
 *
 * POR QUE (12/09/2026): o Marcelo achou que os episódios da série "A morte das estrelas"
 * "terminam muito seco" — o vídeo acabava 0,9 s depois da última palavra. O canal já tem o fecho
 * aprovado no vídeo do portal (exports/portal-buraco-de-minhoca/APRENDIZADO.md): 2 s de pausa com a
 * música continuando, depois "Neural Update. O universo está te esperando." sobre a vinheta
 * oficial (assets/brand/vinheta-neural-update-cosmic-zoom-v1.mp4), usada INTEIRA, sem recortar,
 * recolorir nem reposicionar a marca.
 *
 *   node _fecho-vinheta.js <slug> [--revelacao=4.8] [--pausa=2.0] [--min-ultimo=1.5]
 *
 * O que faz:
 *  1. guarda a versão sem fecho em <slug>/_v-sem-fecho/ (rodar de novo parte SEMPRE de lá, então
 *     não empilha dois bordões);
 *  2. gera o bordão (voz Marte) com o tempo de cada palavra;
 *  3. narr.mp3 = narração + silêncio + bordão + cauda — "Neural" começa exatos --pausa s depois da
 *     última palavra;
 *  4. captions.ass ganha as palavras do bordão, em pares, com "NEURAL UPDATE." separado de
 *     "O UNIVERSO…" (regra do fecho aprovado);
 *  5. roteiro.txt ganha o bloco do bordão (a contagem de palavras do _monta-flow continua batendo);
 *  6. o(s) clipe(s) do último trecho viram UM clipe: [o que já aparecia + vinheta inteira], com a
 *     duração exata da janela que o _monta-flow vai dar a ele — nada é esticado nem cortado.
 * A vinheta começa ANTES da última palavra terminar, para o nome "NEURAL UPDATE" (que aparece nela
 * em --revelacao s) surgir junto da voz. Se isso deixar o último clipe com menos de --min-ultimo s
 * na tela, a vinheta atrasa (o gancho do próximo episódio não pode sumir).
 * A trilha é a do _monta-flow (contínua); o áudio próprio da vinheta não entra.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('./node_modules/ffmpeg-static');
const { generateTTSWithTimings } = require('./tts');

const slug = process.argv[2];
if (!slug) { console.error('uso: node _fecho-vinheta.js <slug> [--revelacao=4.8] [--pausa=2.0] [--min-ultimo=1.5]'); process.exit(1); }
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? parseFloat(a.split('=')[1]) : d; };
const REVELACAO = arg('revelacao', 4.8);
const PAUSA = arg('pausa', 2.0);
const MIN_ULTIMO = arg('min-ultimo', 1.5);
const BORDAO = 'Neural Update. O universo está te esperando.';
const BORDAO_LEGENDA = ['NEURAL', 'UPDATE.', 'O', 'UNIVERSO', 'ESTÁ', 'TE', 'ESPERANDO.'];
const PARES = [[0, 1], [2, 3], [4, 5], [6]];

const dir = path.join('exports', slug);
const VINHETA = path.join('assets', 'brand', 'vinheta-neural-update-cosmic-zoom-v1.mp4');
const BK = path.join(dir, '_v-sem-fecho');

function dur(f) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', f], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
}
function ff(args, oque) {
  const r = spawnSync(ffmpeg, ['-v', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(`✗ ${oque}: ${(r.stderr || '').slice(-600)}`); process.exit(1); }
}
const t2s = t => { const [h, m, s] = t.split(':'); return +h * 3600 + +m * 60 + +s; };
const s2t = x => Math.floor(x / 3600) + ':' + String(Math.floor(x % 3600 / 60)).padStart(2, '0') + ':' + (x % 60).toFixed(2).padStart(5, '0');
const cenasDaPasta = () => fs.readdirSync(dir).filter(f => /^cena\d+\.mp4$/i.test(f)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);

(async () => {
  for (const f of [VINHETA, path.join(dir, 'narr.mp3'), path.join(dir, 'captions.ass'), path.join(dir, 'roteiro.txt'), path.join(dir, 'cenas.txt')]) {
    if (!fs.existsSync(f)) { console.error(`✗ falta ${f}`); process.exit(1); }
  }

  // 1. versão sem fecho: guardar na primeira vez, restaurar nas seguintes
  const base = ['narr.mp3', 'captions.ass', 'roteiro.txt', 'cenas.txt'];
  if (!fs.existsSync(BK)) {
    fs.mkdirSync(BK);
    for (const f of [...base, ...cenasDaPasta(), `${slug}.mp4`]) if (fs.existsSync(path.join(dir, f))) fs.copyFileSync(path.join(dir, f), path.join(BK, f));
    console.log(`guardado: ${BK}`);
  } else {
    for (const f of cenasDaPasta()) fs.unlinkSync(path.join(dir, f));
    for (const f of fs.readdirSync(BK)) if (f !== `${slug}.mp4`) fs.copyFileSync(path.join(BK, f), path.join(dir, f));
    console.log(`restaurado de ${BK} (rodando de novo)`);
  }

  const assPath = path.join(dir, 'captions.ass');
  const ass = fs.readFileSync(assPath, 'utf8');
  const dlg = ass.split('\n').filter(l => l.startsWith('Dialogue:'));
  const inicioPal = dlg.map(l => t2s(l.split(',')[1]));
  const fimUltima = Math.max(...dlg.map(l => t2s(l.split(',')[2])));   // fim da última palavra (tempo do vídeo)
  const pos = (ass.match(/\\pos\((\d+),(\d+)\)/) || [null, '360', '1055']).slice(1);
  const roteiro = fs.readFileSync(path.join(dir, 'roteiro.txt'), 'utf8');
  const blocos = roteiro.split('\n\n').map(b => b.trim()).filter(Boolean);
  const inicios = fs.readFileSync(path.join(dir, 'cenas.txt'), 'utf8').split('\n').map(l => parseInt(l, 10)).filter(n => !isNaN(n));
  const cenas = cenasDaPasta();
  if (inicios.length !== cenas.length) { console.error(`✗ cenas.txt tem ${inicios.length} linhas para ${cenas.length} clipes`); process.exit(1); }

  // janela do último trecho, do jeito que o _monta-flow calcula
  const bUlt = inicios[inicios.length - 1];
  let acc = 0; const tb = [];
  for (const b of blocos) { tb.push(inicioPal[acc]); acc += b.split(/\s+/).filter(Boolean).length; }
  const inicioUlt = bUlt === 1 ? 0 : tb[bUlt - 1] + 0.5;
  const nArq = inicios.filter(b => b === bUlt).length;
  const narrPath = path.join(dir, 'narr.mp3');
  const n = dur(narrPath);
  const janelaOrig = (n + 0.9) - inicioUlt;

  // 2. bordão
  const bordaoPath = path.join(dir, '_bordao.mp3');
  const tts = await generateTTSWithTimings(BORDAO, bordaoPath, 'male');
  const pal = tts.words || [];
  if (pal.length !== BORDAO_LEGENDA.length) { console.error(`✗ o TTS devolveu ${pal.length} palavras no bordão (esperava ${BORDAO_LEGENDA.length})`); process.exit(1); }
  // o arquivo do TTS traz ~0,9 s de silêncio no fim — cortar logo depois da última palavra
  const bordaoCorte = path.join(dir, '_bordao_corte.mp3');
  ff(['-i', bordaoPath, '-t', (pal[pal.length - 1].end + 0.35).toFixed(3), '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', '24000', bordaoCorte], 'corte do bordão');
  fs.renameSync(bordaoCorte, bordaoPath);
  const bDur = dur(bordaoPath);

  // 3. linha do tempo (tempo do vídeo; a voz entra 0,5 s atrasada pelo _monta-flow)
  const vNeural = fimUltima + PAUSA;
  let vIni = vNeural - REVELACAO;                          // vinheta começa aqui
  if (vIni - inicioUlt < MIN_ULTIMO) vIni = inicioUlt + MIN_ULTIMO;
  const bIniNarr = vNeural - 0.5 - pal[0].start;           // onde o arquivo do bordão entra na narr.mp3
  const silencio = bIniNarr - n;
  if (silencio < 0) { console.error(`✗ a narração tem ${(-silencio).toFixed(2)} s de cauda a mais que a pausa — encurte a pausa`); process.exit(1); }
  const vinhetaDur = dur(VINHETA);
  let alvo = vIni + vinhetaDur;                            // o vídeo termina quando a vinheta termina
  // o _monta-flow faz o vídeo durar narração + 0,9 s; se o bordão passar do fim da vinheta, o
  // último quadro dela segura o tempo que faltar (nunca "tempo negativo" — foi o erro da 1ª versão)
  const precisa = bIniNarr + bDur + 0.9;
  let congela = 0;
  if (alvo < precisa) { congela = precisa - alvo; alvo = precisa; }
  const cauda = Math.max(0, (alvo - 0.9) - (bIniNarr + bDur));

  // narr.mp3 nova
  ff(['-i', narrPath, '-i', bordaoPath, '-filter_complex',
    `[0:a]aformat=sample_rates=24000:channel_layouts=mono,apad=pad_dur=${silencio.toFixed(3)}[a0];` +
    `[1:a]aformat=sample_rates=24000:channel_layouts=mono,apad=pad_dur=${cauda.toFixed(3)}[a1];[a0][a1]concat=n=2:v=0:a=1[a]`,
    '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', '24000', path.join(dir, '_narr_nova.mp3')], 'narração com bordão');
  fs.renameSync(path.join(dir, '_narr_nova.mp3'), narrPath);

  // 4. legendas do bordão (pares, destaque amarelo na palavra falada — mesmo formato do flex)
  const ini = pal.map(w => 0.5 + bIniNarr + w.start);
  const linhas = [];
  PARES.forEach(par => par.forEach(i => {
    const fim = i < pal.length - 1 ? ini[i + 1] : 0.5 + bIniNarr + pal[i].end + 0.6;
    const txt = par.map(j => j === i ? `{\\1c&H0000FFFF&\\b1}${BORDAO_LEGENDA[j]}{\\r}` : BORDAO_LEGENDA[j]).join(' ');
    linhas.push(`Dialogue: 0,${s2t(ini[i])},${s2t(fim)},Cap,,0,0,0,,{\\an2\\pos(${pos[0]},${pos[1]})}${txt}`);
  }));
  fs.writeFileSync(assPath, ass.replace(/\s*$/, '') + '\n' + linhas.join('\n') + '\n');

  // 5. roteiro com o bloco do bordão
  fs.writeFileSync(path.join(dir, 'roteiro.txt'), blocos.join('\n\n') + '\n\n' + BORDAO + '\n');

  // 6. último trecho = [clipe(s) que já apareciam + vinheta inteira]
  const doUlt = cenas.slice(cenas.length - nArq);
  const conteudo = vIni - inicioUlt;
  const fatia = janelaOrig / nArq;
  const partes = [];
  let resta = conteudo;
  doUlt.forEach((c, k) => {
    if (resta <= 0.05) return;
    const d = dur(path.join(dir, c));
    const quero = Math.min(k === doUlt.length - 1 ? resta : Math.min(fatia, resta), resta);
    const f = quero > d ? Math.min(quero / d, 1.5) : 1;
    const o = path.join(dir, `_fecho_p${k}.mp4`);
    ff([...(f === 1 ? ['-t', quero.toFixed(3)] : []), '-i', path.join(dir, c), '-an', '-vf',
      (f !== 1 ? `setpts=${f.toFixed(6)}*PTS,` : '') + 'scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1,fps=24',
      ...(f !== 1 ? ['-t', quero.toFixed(3)] : []), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', o], `trecho de ${c}`);
    partes.push(o); resta -= dur(o);
  });
  const vOut = path.join(dir, '_fecho_vinheta.mp4');
  ff(['-i', VINHETA, '-an', '-vf', `fps=24,setsar=1${congela > 0 ? `,tpad=stop_mode=clone:stop_duration=${congela.toFixed(3)}` : ''}`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', vOut], 'vinheta');
  const lista = path.join(dir, '_fecho_lista.txt');
  fs.writeFileSync(lista, [...partes, vOut].map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n'));
  const combinado = path.join(dir, '_fecho_combinado.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', combinado], 'emenda final');
  for (const c of doUlt) fs.unlinkSync(path.join(dir, c));
  fs.renameSync(combinado, path.join(dir, doUlt[0]));
  fs.writeFileSync(path.join(dir, 'cenas.txt'), inicios.slice(0, inicios.length - nArq + 1).join('\n') + '\n');
  [...partes, vOut, lista].forEach(p => { try { fs.unlinkSync(p); } catch {} });

  const janelaNova = alvo - inicioUlt;
  console.log(`última palavra termina ${fimUltima.toFixed(2)}s · pausa ${PAUSA}s · "Neural" em ${vNeural.toFixed(2)}s`);
  console.log(`vinheta de ${vIni.toFixed(2)}s a ${alvo.toFixed(2)}s · nome "NEURAL UPDATE" na tela em ~${(vIni + REVELACAO).toFixed(2)}s` + (congela ? ` · último quadro congelado ${congela.toFixed(2)}s` : ''));
  console.log(`último trecho: ${conteudo.toFixed(2)}s do clipe + vinheta · clipe combinado ${dur(path.join(dir, doUlt[0])).toFixed(2)}s para janela de ${janelaNova.toFixed(2)}s`);
  console.log(`narração nova ${dur(narrPath).toFixed(2)}s (alvo ${(alvo - 0.9).toFixed(2)}s) · pronto: node _monta-flow.js ${slug}`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
