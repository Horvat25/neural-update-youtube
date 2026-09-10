'use strict';
/**
 * blog-capas.js — converte imagem do banco (9:16, de Short) em capa de blog 16:9.
 *
 * Tecnica: a imagem original entra centralizada, em altura cheia, sobre uma
 * versao borrada e escurecida dela mesma cortada em 16:9 — mesmo truque do
 * make-longo.js. Assim nao perde o assunto no corte.
 *
 * Tambem CORTA 8% do rodape antes: o Soul V2 crava assinatura falsa ali
 * (ver limpa-assinatura.js).
 *
 * Saida: 1200x675 JPEG q78 — alvo abaixo de 110KB por causa do LCP, que conta
 * pra ranqueamento (SEO-STRATEGY.md).
 *
 * Uso: node blog-capas.js <origem.png> <destino.jpg>
 */
const fs=require('fs'), path=require('path');
const ffmpeg=require('ffmpeg-static');
const {spawnSync}=require('child_process');
const SRC=process.argv[2], OUT=process.argv[3];
if(!SRC||!OUT||!fs.existsSync(SRC)){console.error('uso: node blog-capas.js <src> <out>');process.exit(1);}
fs.mkdirSync(path.dirname(OUT),{recursive:true});
const vf = [
 // recorta uma JANELA 16:9 da vertical, ancorada em 42% da altura (onde o
 // assunto costuma estar nas nossas imagens) — capa cheia, sem tarja borrada.
 // A 1a versao centralizava a vertical sobre fundo borrado e ficava com cara
 // de video em letterbox, nao de capa de blog.
 'crop=iw:ih*0.92:0:0',                                  // tira a assinatura do rodape
 'crop=iw:iw*9/16:0:(ih-iw*9/16)*0.42',                  // janela 16:9
 'scale=1200:675',
 'unsharp=5:5:0.6'                                       // devolve nitidez perdida no downscale
].join(',');
const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-i',SRC,'-vf',vf,'-frames:v','1','-q:v','5','-y',OUT],{timeout:60000});
if(r.status!==0||!fs.existsSync(OUT)){console.error('FALHOU',SRC,(r.stderr||'').toString().slice(-200));process.exit(1);}
console.log(path.basename(OUT), Math.round(fs.statSync(OUT).size/1024)+'KB');
