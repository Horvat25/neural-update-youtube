'use strict';
/**
 * _tt.js — gera a versão do TikTok de um episódio já montado por _ep.js (09/10/2026).
 *   node _tt.js <spec.json> [<spec.json> ...]
 * TikTok silencia some-amount / rising-tide (Content ID), então: news → cosmic-ambient-espacial, viral → cosmic-ice-flow;
 * aula já usa trilha segura → copia o master. Volume igualado ao master (sem loudnorm: estoura a memória do PC).
 * Saída: tiktok-lote/<slug>-tt.mp4 + tiktok-lote/<slug>-tt.legenda.txt
 *
 * --so-legenda: NÃO gera vídeo nem lê o master; só escreve a legenda em tiktok-lote/_teste-legenda/ (não toca
 *   nas legendas reais). Serve para conferir o texto antes do lote.
 * Legenda (14/10/2026): título (1ª linha = CHAVE que o plano e o robô usam, não mexer) → "Fonte: <curta>" (se o spec
 *   tem `fonte`; `tt_fonte: false` desliga, `tt_fonte: "texto"` substitui o corte automático) → 1ª frase → hashtags → (se `tt_pointer`) "Mais no Instagram: @neuralupdate"
 *   (`tt_pointer: true` usa o texto padrão; string usa o texto dela).
 * `tt_oferta`: "kindle" | "projetor" | texto próprio → linha de oferta entre a frase e as hashtags. Não combina com tt_pointer
 *   (os dois são testes separados: a oferta vai nas aulas, o pointer nos virais). `--sem-oferta` (plano B) troca a oferta por
 *   "Mais no Instagram: @neuralupdate".
 * CTA ROTINA (15/10/2026): o master dos 14 news+virais de 16–22/10 termina com a CTA (voz própria, não está no narr.mp3).
 *   `--cta-dir=<pasta>`: se existir <pasta>/cta-<slug>.mp3, a versão TikTok usa narr.mp3 até o corte + essa voz da CTA
 *   (começa em dur(master) − (dur(voz)+0.45), igual ao cta_aplica.js) + trilha SEGURA do TikTok; a legenda termina com
 *   "Comenta ROTINA 👇" (sem prometer DM/link) e o pointer/oferta não entram (um pedido só por vídeo).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const FF = require('./node_modules/ffmpeg-static');
const TRILHA = { news: 'cosmic-ambient-espacial.mp3', viral: 'cosmic-ice-flow.mp3' };
const POINTER_PADRAO = 'Mais no Instagram: @neuralupdate';
const SO_LEGENDA = process.argv.includes('--so-legenda');
const CTA_DIR = (process.argv.find(a => a.startsWith('--cta-dir=')) || '').slice('--cta-dir='.length);
const CTA_LINHA = 'Comenta ROTINA 👇';
const ctaVoz = spec => (CTA_DIR && spec.tipo !== 'aula' && fs.existsSync(path.join(CTA_DIR, `cta-${spec.slug}.mp3`))) ? path.join(CTA_DIR, `cta-${spec.slug}.mp3`) : null;
const duracao = f => { const m = (spawnSync(FF, ['-hide_banner', '-i', f], { encoding: 'utf8' }).stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/); return m ? +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]) : NaN; };
// Plano B: sem resposta automática por palavra no direct do Insta, a oferta vira só o pointer (nunca prometer DM onde não existe).
const SEM_OFERTA = process.argv.includes('--sem-oferta');
// 14/10/2026 (FUNIL-2-PRODUTOS.md): linha de oferta da legenda. Sem preço/estrelas/avaliações; aviso de afiliado na própria linha.
const OFERTAS = {
  kindle: '📚 Lê no celular? O Kindle Unlimited tem 1º mês grátis pra novos assinantes (pede cartão; dá pra cancelar). Manda KINDLE no direct do Instagram @neuralupdate. Link de afiliado Amazon.',
  projetor: '🌌 Projetor de astronauta que enche o teto de estrelas. Manda ASTRONAUTA no direct do Instagram @neuralupdate. Link de afiliado Shopee.',
};

// "Fonte: NASA — Título (data): url ; ..." → "Fonte: NASA". Só a 1ª linha do campo; corta no 1º separador.
function fonteCurta(spec) {
  if (spec.tt_fonte === false) return '';
  if (typeof spec.tt_fonte === 'string' && spec.tt_fonte.trim()) return `Fonte: ${spec.tt_fonte.trim().slice(0, 80)}`; // override quando o corte automático sai ruim (ex.: fonte que começa por um lugar)
  const l1 = String(spec.fonte || '').split('\n')[0].replace(/^\s*fonte:\s*/i, '').trim();
  const curta = l1.split(/\s+—\s+|\s+\(|;|:|\.\s/)[0].trim();
  return curta ? `Fonte: ${curta.slice(0, 60)}` : '';
}

function legendaTT(spec) {
  const titulo = spec.title.replace(/#Shorts/g, '').replace(/^📰\s*/, '').replace(/^🔭\s*/, '').trim();
  const frase = (spec.desc.replace(/^Escola de Astronomia Neural Update · Sistema Solar\.\s*/, '').match(/^[^.]+\./) || [''])[0];
  const tags = [...new Set((spec.hashtags || []).filter(h => h !== '#neuralupdate').slice(0, 3).concat(['#astronomia', '#ciencia', '#neuralupdate']))].join(' ');
  let oferta = spec.tt_oferta ? (OFERTAS[spec.tt_oferta] || String(spec.tt_oferta)) : '';
  let pointer = spec.tt_pointer ? (typeof spec.tt_pointer === 'string' ? spec.tt_pointer : POINTER_PADRAO) : '';
  if (oferta && SEM_OFERTA) { oferta = ''; pointer = pointer || POINTER_PADRAO; }
  if (oferta && pointer) { console.warn(`! ${spec.slug}: tt_oferta e tt_pointer juntos misturam os dois testes; mantive só a oferta`); pointer = ''; }
  const cta = ctaVoz(spec) ? CTA_LINHA : '';
  if (cta && (oferta || pointer)) { console.warn(`! ${spec.slug}: vídeo com CTA ROTINA; tirei ${oferta ? 'tt_oferta' : 'tt_pointer'} (um pedido só por vídeo)`); oferta = ''; pointer = ''; }
  return [titulo, fonteCurta(spec), frase, oferta, tags, pointer, cta].filter(Boolean).join('\n\n') + '\n';
}

for (const arq of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
  const spec = JSON.parse(fs.readFileSync(arq, 'utf8'));
  if (SO_LEGENDA) {
    fs.mkdirSync(path.join('tiktok-lote', '_teste-legenda'), { recursive: true });
    const dest = path.join('tiktok-lote', '_teste-legenda', `${spec.slug}-tt.legenda.txt`);
    fs.writeFileSync(dest, legendaTT(spec));
    console.log(`✓ ${spec.slug}  legenda de teste → ${dest}`);
    continue;
  }
  const S = spec.slug, dir = path.join('exports', S), master = path.join(dir, `${S}.mp4`);
  const out = path.join('tiktok-lote', `${S}-tt.mp4`);
  fs.mkdirSync('tiktok-lote', { recursive: true });
  const info = spawnSync(FF, ['-hide_banner', '-i', master], { encoding: 'utf8' }).stderr || '';
  const m = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const dur = +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
  if (spec.tipo === 'aula') {
    fs.copyFileSync(master, out);
  } else {
    const trilha = path.join('assets', 'music-real', TRILHA[spec.tipo]);
    const st = (dur - 0.25).toFixed(2);
    const vozCta = ctaVoz(spec);
    let entrada = '[1:a]atrim=start=0.080,asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo,volume=1.35,asplit=2[voice][key];';
    if (vozCta) {
      const T0 = dur - (duracao(vozCta) + 0.45), ms = Math.round((T0 + 0.2) * 1000);
      if (!(T0 > 5)) { console.log(`✗ ${S}: início da CTA calculado em ${T0.toFixed(2)}s, não confio`); continue; }
      entrada = `[1:a]atrim=start=0.080,asetpts=PTS-STARTPTS,atrim=0:${T0.toFixed(3)},afade=t=out:st=${(T0 - 0.3).toFixed(3)}:d=0.3,aformat=sample_rates=44100:channel_layouts=stereo,volume=1.35[v1];` +
        `[3:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms},volume=1.35[v2];` +
        `[v1][v2]amix=inputs=2:duration=longest:normalize=0,asplit=2[voice][key];`;
      console.log(`· ${S}: CTA ROTINA começa em ${T0.toFixed(2)}s (voz ${duracao(vozCta).toFixed(2)}s)`);
    }
    const fc = `[2:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.45[mus];` + entrada +
      `[mus][key]sidechaincompress=threshold=0.035:ratio=4:attack=8:release=180[duck];` +
      `[duck][voice]amix=inputs=2:duration=first:weights=1 1:normalize=0,volume=${spec.tipo==='news'?1.2:1.0},alimiter=limit=0.84,afade=t=out:st=${st}:d=0.25[a]`;
    let ok = false;
    for (let t = 1; t <= 4 && !ok; t++) {
      const r = spawnSync(FF, ['-v', 'error', '-y', '-i', master, '-i', path.join(dir, 'narr.mp3'), '-stream_loop', '-1', '-i', trilha, ...(vozCta ? ['-i', vozCta] : []),
        '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', dur.toFixed(2), out], { encoding: 'utf8' });
      ok = r.status === 0;
      if (!ok) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},8000)']);
    }
    if (!ok) { console.log(`✗ ${S}: remix falhou`); continue; }
  }
  const nv = spawnSync(FF, ['-hide_banner', '-i', out, '-af', 'volumedetect', '-vn', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const mv = spawnSync(FF, ['-hide_banner', '-i', master, '-af', 'volumedetect', '-vn', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const g = s => (s.match(/mean_volume: (-?[\d.]+)/) || [])[1];
  fs.writeFileSync(path.join('tiktok-lote', `${S}-tt.legenda.txt`), legendaTT(spec));
  console.log(`✓ ${S}  tt ${g(nv)} dB (master ${g(mv)} dB)`);
}
