'use strict';
require('dotenv').config();
const { google, getAuthorizedClient } = require('./youtube-auth');
const IDS = ['sD_CEigttkA', 'ZjKW2On5oBY', 'uOr7rvV2BRk', '6L9yBDUEk2s'];
(async () => {
  const auth = await getAuthorizedClient();
  const yt = google.youtube({ version: 'v3', auth });
  const r = await yt.videos.list({ part: ['snippet', 'status', 'statistics'], id: IDS });
  for (const v of r.data.items || []) {
    const s = v.status, st = v.statistics, sn = v.snippet;
    console.log('==============================');
    console.log('ID:        ', v.id);
    console.log('Título:    ', sn.title.slice(0, 55));
    console.log('Privacy:   ', s.privacyStatus, '| uploadStatus:', s.uploadStatus, '| embeddable:', s.embeddable);
    console.log('publishAt: ', s.publishAt || '(sem agendamento)');
    console.log('publicado: ', sn.publishedAt);
    console.log('VIEWS PÚBLICAS:', st.viewCount, '| likes:', st.likeCount, '| coment:', st.commentCount);
    if (s.rejectionReason) console.log('⚠️ REJEITADO:', s.rejectionReason);
    if (s.failureReason) console.log('⚠️ FALHA:', s.failureReason);
  }
})().catch(e => { console.error('ERRO:', e?.errors?.[0]?.message || e.message); process.exit(1); });
