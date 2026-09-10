'use strict';
/**
 * append-isca-cta.js — cola no FIM de um Short uma cena de CTA da ISCA GRÁTIS (funil).
 *   node append-isca-cta.js <video_base.mp4> <bg_image> <out.mp4> [track.mp3]
 *
 * Divulga o material GRATUITO da bio ("PDF grátis: 5 fenômenos do universo").
 * Texto ESTÁTICO (sem contador de inscritos) → evergreen, seguro pra vídeo AGENDADO.
 * Regra do funil: 1 a cada 3 vídeos (ver CLAUDE.md / memória funil-vendas-isca-gratis).
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { generateTTSWithTimings } = require('./tts');
const { ensureMusicCached, selectTrackForTopic } = require('./music-manager');

const BASE = process.argv[2];
const BG = process.argv[3];
const OUT = process.argv[4];
const TRACK = process.argv[5] || 'cosmic-infinite-perspective.mp3';

// Narração — evergreen, diz que é GRÁTIS, chama "na bio" (nunca lê URL na voz).
const NARR = process.env.ISCA_NARR ||
  'Ah, e tem um presente esperando por você: um PDF gratuito com cinco fenômenos assustadores do universo. Ta de graça, na bio. Corre lá e baixa o seu.';

// 16/08/2026: os textos da cena viraram configuráveis pra atender o CTA do KINDLE
// sem duplicar este arquivo — assim conserto de bug vale pros dois.
//
// ⚠️ SEM ACENTO. O drawtext do ffmpeg quebra com acentuação vinda de linha de
// comando no Windows; por isso o padrão sempre foi "PDF GRATIS", "5 fenomenos".
//
// 🚨 CONFORMIDADE AMAZON: NUNCA pôr preço, nota em estrelas ou nº de avaliações
// aqui. O contrato do Associados só permite preço vindo da API deles.
// Ver neural-update-forge/COMISSOES-AFILIADO.md.
const L1 = process.env.CTA_L1 || 'PDF GRATIS';
const L2 = process.env.CTA_L2 || '5 fenomenos do universo';
const L3 = process.env.CTA_L3 || 'LINK NA BIO';
const L4 = process.env.CTA_L4 || 'de graca';
// Tamanho da linha 1. 104px so cabe em ~11 caracteres num quadro de 720px —
// em 16/08 "1 MES GRATIS" vazou pelas duas bordas. Se a linha for maior, baixe isto.
const S1 = process.env.CTA_S1 || '104';

function durOf(f) {
  const p = spawnSync(ffmpeg, ['-i', f], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 9;
}

(async () => {
  if (!BASE || !BG || !OUT) { console.error('uso: node append-isca-cta.js <base.mp4> <bg.jpg> <out.mp4> [track.mp3]'); process.exit(1); }
  const work = path.dirname(OUT);

  // 1) narração do CTA (acelerada, ágil)
  const narr = path.join(work, '_isca_narr.mp3');
  const { audioPath } = await generateTTSWithTimings(NARR, narr, process.env.SHORTS_VOICE || 'male');
  const TEMPO = 1.22;
  const DUR = +(durOf(audioPath) / TEMPO + 0.5).toFixed(2);
  if (!isFinite(DUR) || DUR <= 0 || DUR > 30) { console.error(`[isca] duracao da cena absurda: ${DUR}s — narracao longa demais ou durOf falhou`); process.exit(1); }
  console.log(`[isca] cena de ${DUR}s`);

  // 2) trilha
  const tracks = await ensureMusicCached();
  const forced = path.join(__dirname, 'assets', 'music-real', TRACK);
  const trackPath = fs.existsSync(forced) ? forced : (selectTrackForTopic('espaco', tracks) || {}).path;

  // 3) cena CTA: fundo desfocado + texto estático da isca grátis + narração + trilha
  const font = 'C\\:/Windows/Fonts/arialbd.ttf';
  const logoPath = path.join(__dirname, 'assets', 'brand', 'nu-logo.png');
  const hasLogo = fs.existsSync(logoPath);
  const vf = `scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=16:2,eq=brightness=-0.36:saturation=1.05,` +
    `drawtext=fontfile='${font}':text='${L1}':fontcolor=yellow:fontsize=${S1}:x=(w-text_w)/2:y=440:box=1:boxcolor=black@0.55:boxborderw=22:shadowcolor=black:shadowx=3:shadowy=3,` +
    `drawtext=fontfile='${font}':text='${L2}':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=580:shadowcolor=black:shadowx=2:shadowy=2,` +
    `drawtext=fontfile='${font}':text='${L3}':fontcolor=0x33ccff:fontsize=64:x=(w-text_w)/2:y=690:shadowcolor=black:shadowx=3:shadowy=3,` +
    `drawtext=fontfile='${font}':text='${L4}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=770:shadowcolor=black:shadowx=2:shadowy=2`;
  // Marca: logo Neural Update no canto (mesma do corpo do vídeo); fallback = texto.
  const vBrand = hasLogo
    ? `[0:v]${vf},format=yuv420p[vbg];[3:v]scale=168:-1[lg];[vbg][lg]overlay=W-w-20:20:format=auto,format=yuv420p[v];`
    : `[0:v]${vf},drawtext=fontfile='${font}':text='NEURAL UPDATE':fontcolor=white@0.6:fontsize=30:x=(w-text_w)/2:y=46:shadowcolor=black@0.7:shadowx=2:shadowy=2,format=yuv420p[v];`;
  const filterScene = vBrand +
    `[2:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.5[mus];` +
    `[1:a]aresample=44100,aformat=channel_layouts=stereo,atempo=${TEMPO},volume=1.5[voz];` +
    `[mus][voz]amix=inputs=2:duration=first:weights=1 1:normalize=0,loudnorm=I=-16:TP=-1.5[a]`;
  const scene = path.join(work, '_isca_scene.mp4');
  const sceneInputs = ['-hide_banner', '-loglevel', 'error', '-loop', '1', '-i', BG, '-i', audioPath, '-i', trackPath];
  if (hasLogo) sceneInputs.push('-i', logoPath);
  let r = spawnSync(ffmpeg, [...sceneInputs,
    '-filter_complex', filterScene, '-map', '[v]', '-map', '[a]', '-t', String(DUR), '-r', '24',
    '-c:v', 'libx264', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-y', scene],
    // 16/08: 120s nao dava. Sao 4 entradas com boxblur + overlay + loudnorm; quando
    // a maquina esta ocupada renderizando lote, estoura e o erro vinha mudo.
    { timeout: +(process.env.ISCA_TIMEOUT || 300000) });
  // 16/08: quando o ffmpeg estoura o timeout, status vem null e stderr vazio — a
  // mensagem antiga ("falha cena:" e mais nada) nao dizia isso e me fez procurar
  // erro de filtro por meia hora. Mostrar signal SEMPRE.
  if (r.status !== 0) {
    console.error(`[isca] falha cena: status=${r.status} signal=${r.signal}` +
      (r.signal ? ' (SIGTERM = estourou o timeout de 120s)' : ''));
    console.error((r.stderr || '').toString().slice(-600) || '(stderr vazio)');
    process.exit(1);
  }

  // 4) concatena base + cena CTA (re-encode, áudio 44100 padronizado)
  r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-stats', '-i', BASE, '-i', scene,
    '-filter_complex',
    '[0:a]aresample=44100,aformat=channel_layouts=stereo[a0];[1:a]aresample=44100,aformat=channel_layouts=stereo[a1];' +
    '[0:v][a0][1:v][a1]concat=n=2:v=1:a=1[v][a]',
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', (process.env.X264_PRESET || 'veryfast'), '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', OUT], { stdio: 'inherit', timeout: 240000 });
  try { fs.unlinkSync(scene); } catch {}
  if (r.status === 0 && fs.existsSync(OUT)) console.log(`[isca] ✓ PRONTO: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
  else { console.error('[isca] falha concat:', r.status); process.exit(1); }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
