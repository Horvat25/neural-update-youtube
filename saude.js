#!/usr/bin/env node
/**
 * saude.js — verifica o ecossistema inteiro em UM comando.
 *
 * POR QUE EXISTE (19/08/2026): as fontes de engenharia de agentes dizem que dar ao
 * agente um mecanismo de auto-verificacao e "o fator mais ignorado e mais critico"
 * contra ele entrar em loop ou declarar pronto o que nao esta. Numa operacao de
 * conteudo nao existe suite de testes — entao esta e a suite.
 *
 * Alem disso: NESTE ecossistema toda falha e silenciosa. Ja aconteceu de a publicacao
 * do site morrer sem aviso, da captacao de email engolir lead por semanas, e de dois
 * videos ficarem agendados pro mesmo horario. Todos foram descobertos tarde.
 *
 *   node estudio/saude.js
 *
 * Sai com codigo 1 se achar problema — da pra usar em automacao.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { execSync } = require('child_process');

const ok = [], alerta = [], erro = [];
const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const brt = d => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

async function youtube() {
  try {
    const { google, getAuthorizedClient } = require('./youtube-auth');
    const auth = await getAuthorizedClient();
    const yt = google.youtube({ version: 'v3', auth });
    const ch = await yt.channels.list({ part: ['contentDetails', 'statistics'], mine: true });
    const up = ch.data.items[0].contentDetails.relatedPlaylists.uploads;
    ok.push(`YouTube: ${ch.data.items[0].statistics.subscriberCount} inscritos · ${ch.data.items[0].statistics.viewCount} views`);

    let ids = [], tok;
    do {
      const r = await yt.playlistItems.list({ part: ['contentDetails'], playlistId: up, maxResults: 50, pageToken: tok });
      ids.push(...r.data.items.map(i => i.contentDetails.videoId)); tok = r.data.nextPageToken;
    } while (tok && ids.length < 150);
    const det = [];
    for (let i = 0; i < ids.length; i += 50) {
      const r = await yt.videos.list({ part: ['status', 'snippet'], id: ids.slice(i, i + 50) });
      det.push(...r.data.items);
    }
    const agora = new Date();
    const fut = det.filter(v => v.status.publishAt && new Date(v.status.publishAt) > agora
                             && new Date(v.status.publishAt) < new Date('2090-01-01'))
                   .sort((a, b) => new Date(a.status.publishAt) - new Date(b.status.publishAt));

    // ⚠️ dois videos no MESMO horario = post em dobro. Ja aconteceu.
    const porHora = {};
    fut.forEach(v => (porHora[v.status.publishAt] = porHora[v.status.publishAt] || []).push(v.id));
    const dup = Object.entries(porHora).filter(([, a]) => a.length > 1);
    dup.forEach(([h, a]) => erro.push(`YouTube: DOIS videos as ${brt(h)} → ${a.join(' + ')}`));

    if (!fut.length) erro.push('YouTube: NENHUM video agendado — a grade acabou');
    else {
      const ate = fut[fut.length - 1].status.publishAt;
      const dias = Math.round((new Date(ate) - agora) / 864e5);
      const msg = `YouTube: ${fut.length} agendados, ate ${brt(ate)} (${dias}d)`;
      (dias <= 2 ? alerta : ok).push(msg + (dias <= 2 ? ' ← produzir lote novo' : ''));
    }
  } catch (e) { erro.push('YouTube: ' + (e?.errors?.[0]?.message || e.message)); }
}

function instagram() {
  try {
    const j = JSON.parse(execSync('git show origin/main:publicador/fila.json',
      { cwd: path.join(__dirname, '..', 'instagram'), maxBuffer: 1e8 }).toString());
    const agora = new Date();
    const falhas = j.filter(x => ['falhou', 'perdido'].includes(x.status));
    falhas.forEach(x => erro.push(`Instagram: ${x.status} em ${x.slug} — ${x.erro || ''}`));
    const fut = j.filter(x => x.status === 'agendado' && new Date(x.quando) > agora)
                 .sort((a, b) => new Date(a.quando) - new Date(b.quando));
    if (!fut.length) erro.push('Instagram: fila VAZIA');
    else {
      const ate = fut[fut.length - 1].quando;
      const dias = Math.round((new Date(ate) - agora) / 864e5);
      const st = fut.filter(x => x.tipo === 'story').length;
      const msg = `Instagram: ${fut.length} na fila (${st} stories), ate ${brt(ate)} (${dias}d)`;
      (dias <= 2 ? alerta : ok).push(msg + (dias <= 2 ? ' ← renovar fila' : ''));
      // 30/09/2026: Reels escondiam que os Stories tinham acabado (27/09). Cobertura por tipo.
      for (const [tipo, nome] of [['reels', 'Reels'], ['story', 'Stories']]) {
        const f = fut.filter(x => x.tipo === tipo);
        const d = f.length ? Math.round((new Date(f[f.length - 1].quando) - agora) / 864e5) : 0;
        if (d <= 1) erro.push(`Instagram: ${nome} acabando (${f.length} na fila, ${d}d) — gerar o proximo lote`);
      }
    }
  } catch (e) { erro.push('Instagram: ' + e.message); }
}

async function site() {
  for (const [p, nome] of [['/links', 'bio'], ['/kindle', 'pagina Kindle'], ['/gratis', 'isca']]) {
    try {
      const r = await fetch('https://neural-update.com.br' + p);
      (r.ok ? ok : erro).push(`Site ${nome} (${p}): ${r.status}`);
    } catch (e) { erro.push(`Site ${p}: ${e.message}`); }
  }
  try {
    const d = await (await fetch('https://neural-update.com.br/api/clique?cb=' + Date.now())).json();
    if (!d.ok) return erro.push('Funil: API de clique respondeu erro');
    const c = (d.cliques_por_dia || []).find(x => x.dia === hoje);
    const v = (d.visitas_por_dia || []).find(x => x.dia === hoje);
    ok.push(`Funil hoje: ${v ? v.visitas : 0} visitas · ${c ? c.cliques : 0} cliques · ${d.leads} leads no total`);
  } catch (e) { erro.push('Funil: ' + e.message); }
}

(async () => {
  console.log('Verificando o ecossistema...\n');
  await youtube(); instagram(); await site();
  const bloco = (t, a, s) => a.length && console.log(`${s} ${t}\n` + a.map(x => '   ' + x).join('\n') + '\n');
  bloco('OK', ok, '✅'); bloco('ATENCAO', alerta, '⚠️'); bloco('PROBLEMA', erro, '🔴');
  console.log(erro.length ? `${erro.length} problema(s) — resolver antes de seguir.`
            : alerta.length ? `Sem problema. ${alerta.length} item(ns) pedindo atencao.`
            : 'Tudo certo.');
  process.exit(erro.length ? 1 : 0);
})();
