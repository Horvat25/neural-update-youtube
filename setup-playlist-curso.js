'use strict';
/**
 * setup-playlist-curso.js — cria a playlist "Universo do Zero" (curso em ordem
 * didática: Sistema Solar → Gravidade → Órbita → Estrelas → Galáxias → Buracos
 * negros → Exoplanetas → Cosmologia → Dados astronômicos) e insere os vídeos
 * existentes na ordem. Idempotente: se a playlist já existir, só completa itens.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { google, getAuthorizedClient } = require('./youtube-auth');

const TITLE = '🌌 Universo do Zero — Astronomia em ordem';
const DESC = `Aprenda astronomia na ordem certa, um Short por vez — do Sistema Solar aos limites do universo.

Trilha do curso:
1. Sistema Solar
2. Gravidade e tempo
3. Órbitas e movimento
4. Estrelas
5. Galáxias
6. Buracos negros
7. Exoplanetas
8. Cosmologia
9. Sinais e observação do cosmos

Vídeos novos entram toda semana. Blog: https://neural-update.com.br`;

// Ordem didática (módulo → vídeos). Agendados também entram (aparecem ao publicar).
const ORDERED_IDS = [
  // 1. Sistema Solar
  '6hiYDAGZG6I', // água mais velha que o Sol
  'MHp3T0E3p38', // chove diamante em Netuno
  'eOU6kLpBPmo', // se o Sol sumisse agora
  // 2. Gravidade e tempo
  'zAZuDAyQTNs', // Einstein: tempo não passa igual
  'gTVc9ldnd3U', // dilatação do tempo perto de buraco negro
  'y_rfrQgsM7M', // o espaço não é silencioso (ondas gravitacionais)
  // 3. Órbitas e movimento
  '6dXrXM5iPn4', // estrela fugindo da galáxia
  'iW1lTtoe9Ic', // 2 buracos negros vão colidir
  // 4. Estrelas
  'qFCJju1NrRM', // poeira de estrelas
  'x0YcNWT8V0w', // colher de estrela de nêutrons
  'CqYm9AeZkX8', // magnetar
  '9Q42NLiAE_8', // estrela mais velha que o universo
  'cVN2EAbqv_o', // Stephenson 2-18
  'GHmIOhtpN40', // estrela de Tabby
  // 5. Galáxias
  'gxSJEecBqg4', // 100 bilhões de estrelas e silêncio
  'rq5MT6uYBU4', // Grande Atrator
  '6L9yBDUEk2s', // Vazio de Boötes
  // 6. Buracos negros
  'xd8j-OM4ls8', // se você cair num buraco negro
  'Tzr4EzO3-rY', // não te esmaga, ele faz isso
  'T1UcszfQ4n0', // planeta engolido
  'vJa2SYizGOY', // TON 618
  'iTPgfQK-Vxo', // Phoenix A
  '_0g2PBkezKA', // som do buraco negro
  'Hcj2kOzUUxk', // radiação de Hawking
  'sRwMoFtJrCM', // buraco branco
  'bowwTU5NJTU', // buraco negro errante
  '5x8uwaIGElU', // você não sabe nada sobre buracos negros
  // 7. Exoplanetas
  'xmReAthNGmk', // planeta de diamante
  '3BshVjRHCKI', // planeta onde chove vidro
  // 8. Cosmologia
  'jSp7RG35uJQ', // o que havia antes do Big Bang
  'vJIqKbWc1cg', // noite escura prova o Big Bang
  'kAhVdFzvg10', // matéria escura 85%
  'y_fxvdbBGnQ', // universo acelerando
  'tcTp8qk6fgI', // Big Rip
  // 9. Sinais e observação
  'r_XTDAhnztM', // sinal Wow!
  'ZjKW2On5oBY', // sinal dos 16 dias
  'W4DNGoAhkrI', // Oumuamua
  'Y2gNsyfw3qQ', // disco de ouro da Voyager
];

(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });

  // acha ou cria a playlist
  let playlistId = null;
  const existing = await yt.playlists.list({ part: ['snippet'], mine: true, maxResults: 50 });
  const found = (existing.data.items || []).find(p => p.snippet.title === TITLE);
  if (found) { playlistId = found.id; console.log('[playlist] já existe:', playlistId); }
  else {
    const created = await yt.playlists.insert({
      part: ['snippet', 'status'],
      requestBody: { snippet: { title: TITLE, description: DESC, defaultLanguage: 'pt-BR' }, status: { privacyStatus: 'public' } },
    });
    playlistId = created.data.id;
    console.log('[playlist] criada:', playlistId);
  }

  // itens já presentes (evita duplicar em re-execução)
  const present = new Set();
  let pageToken;
  do {
    const r = await yt.playlistItems.list({ part: ['contentDetails'], playlistId, maxResults: 50, pageToken });
    (r.data.items || []).forEach(i => present.add(i.contentDetails.videoId));
    pageToken = r.data.nextPageToken;
  } while (pageToken);

  let ok = 0, skip = 0, fail = 0;
  for (const vid of ORDERED_IDS) {
    if (present.has(vid)) { skip++; continue; }
    try {
      await yt.playlistItems.insert({
        part: ['snippet'],
        requestBody: { snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId: vid } } },
      });
      ok++;
      console.log('  + ' + vid);
    } catch (e) {
      fail++;
      console.warn('  ! ' + vid + ': ' + (e?.errors?.[0]?.reason || e.message));
    }
  }
  console.log(`\n[playlist] adicionados: ${ok} | já estavam: ${skip} | falhas: ${fail}`);
  console.log(`[playlist] URL: https://www.youtube.com/playlist?list=${playlistId}`);
})().catch(e => { console.error('ERRO:', e?.errors?.[0]?.message || e.message); process.exit(1); });
