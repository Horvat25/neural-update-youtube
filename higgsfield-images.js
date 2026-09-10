'use strict';
/**
 * higgsfield-images.js — gera imagens Soul V2 (econômico, ~0,12cr/imagem) via
 * CLI do Higgsfield, mesma lógica do gen-imgs.ps1, só que em Node puro (sem
 * depender de PowerShell), pra poder ser chamado direto do servidor do painel.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Estilo base — método Rory Flynn (Ultimate Midjourney Power User): descrever como
// diretor de fotografia (câmera + lente + abertura + film stock + luz específica).
// Tags genéricas ("8k", "ultra-detailed", "award-winning") viraram junk token nos
// modelos 2026 e foram removidas — especificidade real rende mais.
// NEGATIVE de texto é OBRIGATÓRIO: o modelo escreve pseudo-latim ilegível nas imagens;
// todo texto do nosso vídeo é queimado depois (hook + legenda), nunca vem da imagem.
const CINEMA_STYLE = ', shot on ARRI Alexa with 35mm anamorphic lens at f/2.8, Kodak Vision3 film stock, volumetric god rays, cinematic teal and orange grade, shallow depth of field, epic atmosphere, no text, no words, no letters, no writing, no captions, no watermark, no signature, no logo';

function winQuote(s) {
  // cmd.exe: aspas duplas literais escapadas como "" dentro de um valor "entre aspas"
  return `"${String(s).replace(/"/g, '""')}"`;
}

function genOne(prompt, outPath) {
  const fullPrompt = `${prompt}${CINEMA_STYLE}`;
  const isWin = process.platform === 'win32';
  // No Windows, spawnSync com shell:true e args em array NÃO escapa os valores —
  // ele só junta tudo com espaço, então um --prompt com vírgulas/espaços vira
  // vários "argumentos posicionais" pro cmd.exe. Por isso montamos a string já
  // quotada manualmente em vez de passar um array.
  const r = isWin
    ? spawnSync(
        `higgsfield generate create text2image_soul_v2 --prompt ${winQuote(fullPrompt)} --aspect_ratio 9:16 --quality 2k --wait --wait-timeout 5m`,
        { encoding: 'utf8', timeout: 320000, shell: true }
      )
    : spawnSync('higgsfield', [
        'generate', 'create', 'text2image_soul_v2',
        '--prompt', fullPrompt,
        '--aspect_ratio', '9:16', '--quality', '2k',
        '--wait', '--wait-timeout', '5m',
      ], { encoding: 'utf8', timeout: 320000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/https?:\/\/[^\s"]+\.(jpg|jpeg|png|webp)/i);
  if (!m) throw new Error('Sem URL na resposta do Higgsfield: ' + out.slice(-300));
  return m[0];
}

async function downloadTo(url, outPath) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000 });
  fs.writeFileSync(outPath, res.data);
}

// O Higgsfield devolve 502/timeout esporádico — sem retry, um erro transitório
// derruba o lote inteiro (e perde as imagens já pagas). 3 tentativas com backoff.
function genOneRetry(prompt, outPath, tries = 3) {
  let last;
  for (let t = 1; t <= tries; t++) {
    try { return genOne(prompt, outPath); }
    catch (e) {
      last = e;
      if (t < tries) {
        const wait = t * 15000;
        console.warn(`  [higgsfield] tentativa ${t}/${tries} falhou (${String(e.message).slice(0, 60)}) — retry em ${wait / 1000}s`);
        spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${wait})`], { timeout: wait + 5000 });
      }
    }
  }
  throw last;
}

/**
 * Gera N imagens a partir de prompts (array de strings em inglês), salva como
 * img1.png, img2.png... em outDir. Pula as que já existem (economia).
 */
async function generateImages(prompts, outDir, onProgress) {
  fs.mkdirSync(outDir, { recursive: true });
  const paths = [];
  for (let i = 0; i < prompts.length; i++) {
    const n = `img${i + 1}`;
    const existing = fs.readdirSync(outDir).find(f => new RegExp(`^${n}\\.(png|jpe?g|webp)$`, 'i').test(f));
    if (existing) { paths.push(path.join(outDir, existing)); continue; }
    if (onProgress) onProgress(i + 1, prompts.length);
    const url = genOneRetry(prompts[i], outDir);
    const ext = (path.extname(url.split('?')[0]) || '.png');
    const outPath = path.join(outDir, `${n}${ext}`);
    await downloadTo(url, outPath);
    paths.push(outPath);
  }
  return paths;
}

module.exports = { generateImages };
