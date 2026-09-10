'use strict';
/**
 * make-longo.js — vídeo LONGO 16:9 (1920x1080) a partir de imagens 9:16.
 * Cada imagem entra centralizada (altura cheia) sobre fundo desfocado dela mesma,
 * com leve zoom. + narração longa (roteiro.txt) + legenda + trilha duckada.
 *   node make-longo.js <img_dir> <out.mp4> [track.mp3]
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const { generateTTSWithTimings } = require('./tts');
const { buildAss } = require('./ass-captions');
const { ensureMusicCached, selectTrackForTopic } = require('./music-manager');

const IMG_DIR = process.argv[2];
const OUT = process.argv[3];
// 🚨 O default era `cosmic-infinite-perspective.mp3` — trilha BANIDA por Content ID
// (está em assets/music-quarantine/). Num LONGO isso é grave: claim de Content ID
// desmonetiza justamente os vídeos que sustentam a meta das 4.000 horas.
// Novo default = a de melhor retenção medida (ver TRACK_WEIGHT em music-manager.js).
const TRACK = process.argv[4] || 'dark-some-amount-of-evil.mp3';
const FPS = 24;

function durOf(f) {
  const p = spawnSync(ffmpeg, ['-i', f], { timeout: 15000 });
  const m = (p.stderr || Buffer.alloc(0)).toString().match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 0;
}

(async () => {
  const work = path.resolve(path.dirname(OUT)); // absoluto: evita aninhar caminho no compose final (cwd:work)
  const tmp = path.join(work, '_lclips_' + Date.now());
  fs.mkdirSync(tmp, { recursive: true });

  const ROTEIRO = fs.readFileSync(path.join(IMG_DIR, 'roteiro.txt'), 'utf8').trim();
  const imgs = fs.readdirSync(IMG_DIR).filter(f => /^img\d+\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort((a, b) => (parseInt(a.match(/\d+/)?.[0] || 0)) - (parseInt(b.match(/\d+/)?.[0] || 0)));
  console.log(`[longo] ${imgs.length} imagens`);

  // 1) narração longa
  const narr = path.join(work, '_longo_narr.mp3');
  const { audioPath, words } = await generateTTSWithTimings(ROTEIRO, narr, process.env.SHORTS_VOICE || 'male');
  const narrDur = durOf(audioPath);
  const segIgual = (narrDur + 1.2) / imgs.length;
  console.log(`[longo] narração ${narrDur.toFixed(1)}s | ${words ? words.length : 0} palavras`);

  // SINCRONIA IMAGEM×FALA no LONGO (07/08/2026). O longo dividia a narração em fatias
  // IGUAIS, o mesmo defeito que a gente já tinha corrigido no Short: a imagem trocava
  // no relógio e não no assunto. Num vídeo de 7 min isso é pior — o espectador fica
  // minutos vendo uma cena que não tem nada a ver com o que está sendo dito, e sai.
  // Regra (PLAYBOOK-SHORTS lei 6-B): substantivo concreto na narração = imagem dele na tela.
  const normW = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const MIN_SCENE = parseFloat(process.env.MIN_SCENE_S || '5');
  let sceneImgs = imgs, segs = imgs.map(() => segIgual);
  const cuesFile = path.join(IMG_DIR, 'cues.txt');
  if (fs.existsSync(cuesFile) && words && words.length) {
    const cues = fs.readFileSync(cuesFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
    const wn = words.map(w => normW(w.text));
    const starts = []; let from = 0, falhou = null;
    for (const c of cues) {
      const cw = c.split(/\s+/).map(normW).filter(Boolean);
      let f = -1;
      for (let i = from; i <= wn.length - cw.length; i++) {
        if (cw.every((x, k) => wn[i + k] === x || wn[i + k].startsWith(x))) { f = i; break; }
      }
      if (f === -1) { falhou = c; break; }
      starts.push(words[f].start); from = f + 1;
    }
    if (falhou) console.warn(`[longo] ⚠️ deixa não encontrada: "${falhou}" — usando fatias iguais`);
    else if (cues.length !== imgs.length) console.warn(`[longo] ⚠️ ${cues.length} deixas × ${imgs.length} imagens — usando fatias iguais`);
    else {
      starts[0] = 0;
      let ks = starts.slice(), ki = imgs.slice();
      const durs = () => ks.map((s, i) => +(((i === ks.length - 1) ? narrDur + 1.2 : ks[i + 1]) - s).toFixed(2));
      let d = durs(), removidas = 0;
      while (ks.length > 2) {                       // piso: cena curta demais cansa
        let pior = -1, v = Infinity;
        d.forEach((x, i) => { if (x < MIN_SCENE && x < v) { v = x; pior = i; } });
        if (pior === -1) break;
        const rm = pior === 0 ? 1 : pior;
        ks.splice(rm, 1); ki.splice(rm, 1); removidas++; d = durs();
      }
      sceneImgs = ki; segs = d;
      console.log(`[longo] 🎯 cenas sincronizadas pela FALA (cues.txt)` +
        (removidas ? ` — ${removidas} curta(s) absorvida(s), ${ki.length} de ${imgs.length} imagens` : ''));
      console.log(`[longo] cenas (s): ${segs.join(' · ')}  [min ${Math.min(...segs).toFixed(1)}s]`);
    }
  }

  // 2) cada imagem -> clipe 16:9 (imagem centralizada + fundo blur + leve zoom)
  const clips = [];
  const falhou = [];
  sceneImgs.forEach((im, i) => {
    const out = path.join(tmp, `c${String(i + 1).padStart(2, "0")}.mp4`);
    const seg = segs[i];
    const frames = Math.round(seg * FPS);
    // MARGEM DE SEGURANÇA (12/08/2026): corta 3% de cada borda da imagem antes de
    // montar a cena. O Soul V2 assina o canto de vez em quando — nome de câmera,
    // rabisco de assinatura, código sem sentido — e isso some no thumbnail mas
    // aparece numa tela grande. Cortar a borda é o conserto barato: o enquadramento
    // dessas cenas é sempre central, então não se perde nada de composição.
    // 3% simétrico NÃO bastou (conferido no frame): a assinatura do Soul V2 fica
    // colada no canto inferior e sobra. A borda de baixo é a suja — leva 6%; o
    // topo e as laterais levam 3%, que é só margem de segurança.
    const vf = `crop=iw*0.94:ih*0.91:iw*0.03:ih*0.03,split=2[a][b];` +
      `[a]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=30:4,eq=brightness=-0.40:saturation=1.05[bg];` +
      // encaixa a imagem INTEIRA em 1920x1080 preservando o aspecto:
      // imagem 16:9 preenche o quadro todo (sem moldura); 9:16 fica centralizada
      // sobre o fundo borrado, como antes. O `-2:1040` fixo deixava moldura borrada
      // em volta das imagens que ja vinham em 16:9 (caso dos videos LONGOS).
      `[b]scale=1920:1080:force_original_aspect_ratio=decrease[fg];` +
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[base];` +
      // ⚠️ `setsar=1` no fim NÃO é enfeite. Em 21/08/2026 a montagem morreu no
      // concat com "Failed to configure output pad": duas cenas tinham vindo de
      // outro modelo de imagem, foram reprocessadas, e o PNG saiu com o aspecto
      // DECLARADO (SAR 1:1 DAR 16:9) enquanto as outras 27 não declaravam nada.
      // O concat se recusa a juntar trechos com aspecto declarado diferente — e o
      // erro não diz uma palavra sobre imagem. Fixando o SAR aqui, tanto faz de
      // onde a imagem veio.
      `[base]zoompan=z='min(zoom+0.0005,1.08)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${FPS},setsar=1,format=yuv420p`;
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-loop', '1', '-i', path.join(IMG_DIR, im),
      '-t', seg.toFixed(2), '-filter_complex', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-y', out], { timeout: 180000 });
    if (r.status === 0 && fs.existsSync(out)) { clips.push(out); console.log(`[longo] clipe ${i + 1}/${sceneImgs.length} ok`); }
    else { falhou.push({ i: i + 1, img: im, erro: (r.stderr || '').toString().slice(-160) }); console.error(`[longo] falha clipe ${i + 1}:`, (r.stderr || '').toString().slice(-260)); }
  });

  // ⛔ ABORTA se qualquer cena falhou (13/08/2026 — defeito real, pego pelo Marcelo).
  // Antes o script seguia com os clipes que tinham dado certo. Uma imagem truncada
  // derrubou a cena 3 de 70, e o vídeo saiu com TUDO depois dos 40s adiantado 13
  // segundos em relação à narração, e o fim sem imagem nenhuma. Não deu erro, não
  // deu aviso: entregou 15 minutos dessincronizados e ninguém viu no log.
  // Vídeo com cena faltando não é aproveitável — melhor parar e consertar.
  if (falhou.length) {
    console.error(`\n[longo] ⛔ ABORTADO: ${falhou.length} cena(s) falharam — o vídeo sairia fora de sincronia.`);
    falhou.forEach(f => console.error(`   cena ${f.i} (${f.img}): ${f.erro.split('\n').pop()}`));
    console.error(`   Causa quase sempre é imagem truncada. Confira com: node confere-imgs.js`);
    process.exit(1);
  }
  if (!clips.length) { console.error('nenhum clipe'); process.exit(1); }

  // 3) legenda 16:9
  //
  // NÚMERO POR EXTENSO → DÍGITO **só na legenda** (07/08/2026, pedido do Marcelo).
  // A narração PRECISA do extenso pro TTS pronunciar certo ("oito mil e oitocentos"),
  // mas ler isso na tela é lento e sem impacto. O olho lê "8.800" num piscar.
  // Aqui a gente funde as palavras faladas num único token com o dígito, preservando
  // o start da primeira e o end da última — a sincronia karaokê não se perde.
  // O mapa fica em `numeros.txt` na pasta do vídeo: uma linha por par `extenso=dígito`.
  const normN = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  let legenda = (words || []).slice();
  const mapaFile = path.join(IMG_DIR, 'numeros.txt');
  if (fs.existsSync(mapaFile) && legenda.length) {
    const pares = fs.readFileSync(mapaFile, 'utf8').split('\n')
      .map(l => l.trim()).filter(l => l && l.includes('='))
      .map(l => { const i = l.indexOf('='); return { de: l.slice(0, i).trim().split(/\s+/).map(normN), para: l.slice(i + 1).trim() }; })
      .sort((a, b) => b.de.length - a.de.length);          // frase mais longa primeiro
    let trocas = 0;
    for (const p of pares) {
      for (let i = 0; i <= legenda.length - p.de.length; i++) {
        if (p.de.every((x, k) => normN(legenda[i + k].text) === x)) {
          legenda.splice(i, p.de.length, {
            text: p.para,
            start: legenda[i].start,
            end: legenda[i + p.de.length - 1].end,
          });
          trocas++;
        }
      }
    }
    if (trocas) console.log(`[longo] legenda: ${trocas} número(s) por extenso viraram dígito`);
  }
  const ass = path.join(work, '_longo_caps.ass');
  fs.writeFileSync(ass, buildAss(legenda, { width: 1920, height: 1080, fontSize: 52, marginV: 70, outline: 4, shadow: 2, group: 3 }), 'utf8');

  // CARTELA DE CAPÍTULO — a cada "Número X" entra um dígito GIGANTE na tela por ~2,6s.
  // Marca visualmente a virada e dá ritmo de documentário: o espectador sabe onde está
  // na lista e quanto falta, o que segura retenção em vídeo longo.
  //
  // Duas formas de marcar capítulo:
  //  (a) `cartelas.txt` — uma linha por capítulo, `deixa exata = NOME`. É a forma
  //      geral: serve pra QUALQUER vídeo, inclusive os que não são contagem
  //      regressiva. Foi adicionada em 12/08 porque o modo (b) só disparava se a
  //      narração dissesse literalmente "Número um", o que engessava o roteiro —
  //      e cartela com contador é justamente o que segura retenção em vídeo longo.
  //  (b) `capitulos.txt` (legado) — `N = NOME`, disparado por "Número N" na fala.
  const cartelas = [];
  const wn2 = (words || []).map(w => normN(w.text));

  // BUSCA DE DEIXA POR TEXTO CONTÍNUO, não palavra a palavra.
  //
  // 12/08/2026: a cartela "Quinta coisa e essa" não disparou num longo de 15 min,
  // e o capítulo 5 em diante saiu com o número errado. Motivo: o Edge TTS às vezes
  // devolve DUAS palavras num único evento de boundary — ali ele mandou
  // "Quinta coisa," como um token só. Comparando posição por posição, "quinta"
  // nunca casava com "quintacoisa" no lugar certo.
  // Agora a gente cola todas as palavras normalizadas num texto só, guarda de qual
  // palavra veio cada caractere, e procura a deixa como substring. Assim tanto faz
  // se o TTS juntou ou separou os tokens.
  const mapaChar = [];
  let blob = '';
  wn2.forEach((w, i) => { for (const c of w) { blob += c; mapaChar.push(i); } });
  const iniChar = [];                       // 1º caractere de cada palavra
  { let visto = -1; mapaChar.forEach((p, c) => { if (p !== visto) { iniChar[p] = c; visto = p; } }); }

  const achaDeixa = (txt, fromWord) => {
    const alvo = txt.split(/\s+/).map(normN).join('');
    if (!alvo) return -1;
    let de = 0;
    for (let p = fromWord; p < wn2.length; p++) if (iniChar[p] !== undefined) { de = iniChar[p]; break; }
    const achou = blob.indexOf(alvo, de);
    return achou < 0 ? -1 : mapaChar[achou];
  };
  const cartFile = path.join(IMG_DIR, 'cartelas.txt');
  const nomesCart = {};
  if (fs.existsSync(cartFile) && words && words.length) {
    let from = 0, n = 0;
    for (const l of fs.readFileSync(cartFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)) {
      const i = l.indexOf('=');
      if (i < 0) continue;
      const deixa = l.slice(0, i).trim();
      // `deixa = NOME`        -> numera na ordem (1, 2, 3...)
      // `deixa = 10 | NOME`   -> número explícito, pra CONTAGEM REGRESSIVA
      //   (o formato campeão do canal é a lista do menos pior pro pior; sem isso
      //    a cartela mostrava 1 no capítulo que a narração chama de "número dez")
      let nome = l.slice(i + 1).trim(), num = null;
      const pipe = /^\s*(\d+)\s*\|\s*(.+)$/.exec(nome);
      if (pipe) { num = +pipe[1]; nome = pipe[2].trim(); }
      const f = achaDeixa(deixa, from);
      if (f === -1) { console.warn(`[longo] ⚠️ cartela sem deixa na fala: "${deixa}"`); continue; }
      from = f + 1; n++;
      const rot = num != null ? num : n;
      nomesCart[rot] = nome;
      cartelas.push({ n: rot, t: words[f].start });
    }
  } else if (fs.existsSync(cuesFile) && words && words.length) {
    const cues = fs.readFileSync(cuesFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
    const EXT = ['um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
    let from = 0;
    for (const c of cues) {
      const f = achaDeixa(c, from);
      if (f === -1) continue;
      from = f + 1;
      const m = /^numero(um|dois|tres|quatro|cinco|seis|sete|oito|nove|dez)$/.exec(c.split(/\s+/).map(normN).filter(Boolean).join(''));
      if (m) cartelas.push({ n: EXT.indexOf(m[1]) + 1, t: words[f].start });
    }
  }
  if (cartelas.length) console.log(`[longo] ${cartelas.length} cartela(s) de capítulo: ${cartelas.map(c => c.n).join(', ')}`);

  // 4) TRILHA VARIADA — monta um leito com várias faixas (não cansa) que cobre o vídeo todo.
  //    TRACK pode ser uma lista separada por vírgula (LONGO_TRACKS tb). Cada faixa entra com fade.
  const tracks = await ensureMusicCached();
  const musicDir = path.join(__dirname, 'assets', 'music-real');
  let playlist = (process.env.LONGO_TRACKS || TRACK).split(',').map(s => s.trim()).filter(Boolean)
    .map(n => path.join(musicDir, n)).filter(f => fs.existsSync(f));
  if (!playlist.length) {
    // 🐛 CONSERTO 25/07: aqui o tópico estava CRAVADO como 'espaco universo'. Como o
    // default do TRACK apontava pra uma trilha banida (que não existe mais em
    // music-real/), a playlist vinha sempre vazia e caía AQUI — ou seja, TODO longo
    // era roteado pro mood "cosmic" independentemente do assunto, sorteando entre as
    // 2 únicas faixas cosmic (uma delas a `cosmic-ice-flow`, a pior do canal).
    // Agora lê o tema real do meta.json do próprio vídeo.
    let tema = 'espaco universo';
    try {
      const mj = path.join(IMG_DIR, 'meta.json');
      if (fs.existsSync(mj)) {
        const m = JSON.parse(fs.readFileSync(mj, 'utf8'));
        tema = [m.title, m.description].filter(Boolean).join(' ').slice(0, 300) || tema;
      }
    } catch {}
    const t = (selectTrackForTopic(tema, tracks) || {}).path;
    if (t) playlist = [t];
  }
  console.log(`[longo] trilha (${playlist.length} faixa(s)): ${playlist.map(p => path.basename(p)).join(' -> ')}`);
  const bed = path.join(work, '_bed_' + Date.now() + '.mp3');
  {
    const bi = [];
    playlist.forEach(p => bi.push('-i', p));
    const fmt = playlist.map((_, i) => `[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo,afade=t=in:st=0:d=1.5[b${i}]`).join(';');
    let bedFilter = '';
    if (playlist.length === 1) {
      bedFilter = '[b0]anull[bed]';
    } else {
      const parts = [];
      for (let i = 1; i < playlist.length; i++) {
        const left = i === 1 ? '[b0]' : `[xf${i - 1}]`;
        const right = `[b${i}]`;
        const out = i === playlist.length - 1 ? '[bed]' : `[xf${i}]`;
        parts.push(`${left}${right}acrossfade=d=2:c1=tri:c2=tri${out}`);
      }
      bedFilter = parts.join(';');
    }
    const br = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...bi, '-filter_complex', `${fmt};${bedFilter}`, '-map', '[bed]', '-c:a', 'libmp3lame', '-q:a', '4', '-y', bed], { timeout: 120000 });
    if (br.status !== 0 || !fs.existsSync(bed)) { console.error('[longo] falha ao montar trilha:', (br.stderr || '').toString().slice(-220)); process.exit(1); }
  }

  // 5) concat + narração + trilha duckada + legenda
  const DUR = +(narrDur + 1.2).toFixed(2);
  const inputs = [];
  clips.forEach(c => inputs.push('-i', c));
  // -stream_loop -1 garante que a trilha SEMPRE cobre a narração inteira (sem cortar o áudio no fim)
  inputs.push('-i', audioPath, '-stream_loop', '-1', '-i', bed);
  const vIdx = clips.map((_, i) => `[${i}:v]`).join('');
  const aNarr = clips.length, aMus = clips.length + 1;

  // CARTELA DO CAPÍTULO: dígito gigante + NOME do lugar + contador "de 10".
  // O nome e o contador não são enfeite — dizem ao espectador onde ele está e quanto
  // falta, que é o que segura retenção em lista longa (lei 6 do PLAYBOOK-LONGOS).
  // Nome vai por textfile= porque acento quebra em text=.
  const FONT_L = 'C\\:/Windows/Fonts/arialbd.ttf';
  const nomes = Object.assign({}, nomesCart);   // cartelas.txt já trouxe os nomes
  const capFile = path.join(IMG_DIR, 'capitulos.txt');
  if (fs.existsSync(capFile)) {
    fs.readFileSync(capFile, 'utf8').split('\n').forEach(l => {
      const m = /^\s*(\d+)\s*=\s*(.+?)\s*$/.exec(l);
      if (m) nomes[+m[1]] = m[2];
    });
  }
  const total = cartelas.length;
  const cartelaFilter = cartelas.map(({ n, t }) => {
    const ini = t.toFixed(2), fim = (t + 3.2).toFixed(2);
    const fade = a => `if(lt(t,${ini}),0,if(lt(t,${(t + 0.35).toFixed(2)}),(t-${ini})/0.35*${a},` +
      `if(lt(t,${(t + 2.8).toFixed(2)}),${a},if(lt(t,${fim}),(${fim}-t)/0.4*${a},0))))`;
    const on = `:enable='between(t,${ini},${fim})'`;
    let out = `,drawtext=fontfile='${FONT_L}':text='${String(n).padStart(2, '0')}'` +
      `:fontcolor=white:fontsize=200:x=96:y=64:borderw=7:bordercolor=black@0.92` +
      `:alpha='${fade(1)}'${on}`;
    // barrinha de acento embaixo do número
    out += `,drawbox=x=104:y=280:w=210:h=8:color=0xFFD400@1:t=fill` +
      `:enable='between(t,${ini},${fim})'`;
    if (nomes[n]) {
      const f = `_cap${n}.txt`;
      fs.writeFileSync(path.join(work, f), nomes[n], 'utf8');
      out += `,drawtext=fontfile='${FONT_L}':textfile='${f}'` +
        `:fontcolor=white:fontsize=62:x=104:y=308:borderw=5:bordercolor=black@0.92` +
        `:alpha='${fade(1)}'${on}`;
    }
    out += `,drawtext=fontfile='${FONT_L}':text='de ${total}'` +
      `:fontcolor=0xFFD400:fontsize=42:x=104:y=392:borderw=4:bordercolor=black@0.9` +
      `:alpha='${fade(0.9)}'${on}`;
    return out;
  }).join('');

  // MARCA NEURAL UPDATE — regra fixa do CLAUDE.md: nenhum vídeo sai sem ela.
  // 12/08/2026: descobri conferindo os frames que o LONGO nunca teve marca —
  // ela existia só no make-short-img-flex. Ou seja, todo documentário do canal
  // foi pro ar sem assinatura, justo o formato que a gente quer que circule em
  // "sugeridos". Canto superior DIREITO porque a cartela de capítulo ocupa o
  // esquerdo. Entra 1,2s depois do início, pelo mesmo motivo do Short: logo no
  // frame zero lê como institucional pra quem ainda não decidiu ficar.
  const logoPath = path.join(__dirname, 'assets', 'brand', 'nu-logo.png');
  const temLogo = fs.existsSync(logoPath);
  if (temLogo) inputs.push('-i', logoPath);
  const marca = temLogo
    ? `[${clips.length + 2}:v]scale=210:-1,format=rgba,colorchannelmixer=aa=0.62[logo];[vsub][logo]overlay=W-w-46:40:enable='gte(t,1.2)'[v]`
    : `[vsub]drawtext=fontfile='${FONT_L}':text='NEURAL UPDATE':fontcolor=white@0.6:fontsize=34:x=w-text_w-46:y=44:shadowcolor=black@0.7:shadowx=2:shadowy=2:enable='gte(t,1.2)'[v]`;

  const filter =
    `${vIdx}concat=n=${clips.length}:v=1,format=yuv420p,subtitles='_longo_caps.ass'${cartelaFilter}[vsub];${marca};` +
    `[${aMus}:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.42[mus];` +
    `[${aNarr}:a]aresample=44100,aformat=channel_layouts=stereo,volume=1.4,asplit=2[v1][v2];` +
    `[mus][v1]sidechaincompress=threshold=0.04:ratio=6:attack=10:release=250[duck];` +
    `[duck][v2]amix=inputs=2:duration=first:weights=1 1:normalize=0,loudnorm=I=-15:TP=-1.5,afade=t=out:st=${(DUR - 1.2).toFixed(2)}:d=1.2[a]`;
  const args = ['-hide_banner', '-loglevel', 'error', '-stats', ...inputs,
    '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-t', String(DUR),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', path.basename(OUT)];
  console.log('[longo] compondo vídeo final 16:9...');
  const r = spawnSync(ffmpeg, args, { cwd: work, stdio: 'inherit', timeout: 600000 });
  try { clips.forEach(c => fs.unlinkSync(c)); fs.rmSync(tmp, { recursive: true, force: true }); fs.unlinkSync(bed); } catch {}
  if (r.status === 0 && fs.existsSync(OUT)) console.log(`[longo] ✓ PRONTO: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
  else { console.error('[longo] falhou:', r.status); process.exit(1); }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
