'use strict';
/**
 * baixa-truncadas.js — resgata as imagens que o gen-imgs.ps1 gerou mas não conseguiu salvar.
 *
 * POR QUE existe: em 07/08/2026 um lote de 50 imagens em 16:9 saiu com TODAS as
 * downloads truncadas. O Invoke-WebRequest do PowerShell engasga com arquivos maiores
 * (as 16:9 pesam ~5-7 MB contra ~3,5 MB das 9:16). O script detecta o truncamento,
 * APAGA o arquivo corrompido e imprime a URL com o aviso "NAO regere" — porque o
 * crédito já foi cobrado na geração. Este script lê o log e baixa tudo por curl.
 *
 *   node baixa-truncadas.js <log.txt> <pasta-destino>
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [, , LOG, DEST] = process.argv;
if (!LOG || !DEST) { console.error('uso: node baixa-truncadas.js <log> <destino>'); process.exit(1); }

const txt = fs.readFileSync(LOG, 'utf8');
// "TRUNCADO img37 - apagado. URL (baixe manual, NAO regere): https://..."
const re = /TRUNCADO\s+(img\d+)\s+-\s+apagado\.\s+URL[^:]*:\s*(https:\/\/\S+\.png)/g;
const alvos = [];
let m;
while ((m = re.exec(txt))) alvos.push({ nome: m[1], url: m[2] });

console.log(`${alvos.length} imagem(ns) truncada(s) no log`);
let ok = 0, falhas = [];
for (const { nome, url } of alvos) {
  const out = path.join(DEST, nome + '.png');
  const r = spawnSync('curl', ['-sS', '--fail', '--retry', '3', '--retry-delay', '2',
    '-o', out, url], { encoding: 'utf8', timeout: 180000 });
  const tam = fs.existsSync(out) ? fs.statSync(out).size : 0;
  // PNG íntegro termina com o chunk IEND
  const fim = tam > 1000 ? fs.readFileSync(out).subarray(-8).toString('latin1').includes('IEND') : false;
  if (r.status === 0 && fim) { ok++; process.stdout.write(`✓ ${nome} (${Math.round(tam / 1024)} KB)  `); }
  else { falhas.push(nome); process.stdout.write(`✗ ${nome}  `); }
}
console.log(`\n\nbaixadas: ${ok}/${alvos.length}`);
if (falhas.length) console.log('falharam:', falhas.join(', '));
