const path=require('path');require('dotenv').config({path:path.join(__dirname,'.env')});
const {google,getAuthorizedClient}=require('./youtube-auth');
const d=x=>new Date(Date.now()-x*864e5).toISOString().slice(0,10);
(async()=>{
  const auth=await getAuthorizedClient();
  const ya=google.youtubeAnalytics({version:'v2',auth});
  const q=async(s,e)=>{const r=await ya.reports.query({ids:'channel==MINE',startDate:s,endDate:e,
    metrics:'views,estimatedMinutesWatched,subscribersGained'});return r.data.rows?r.data.rows[0]:[0,0,0];};
  const a=await q(d(30),d(1)), b=await q(d(60),d(31)), c=await q(d(90),d(61));
  const f=n=>Number(n).toLocaleString('pt-BR');
  console.log('JANELA           | views    | min assistidos | inscritos');
  console.log(`90-61 dias atrás | ${f(c[0]).padStart(8)} | ${f(c[1]).padStart(14)} | ${f(c[2]).padStart(9)}`);
  console.log(`60-31 dias atrás | ${f(b[0]).padStart(8)} | ${f(b[1]).padStart(14)} | ${f(b[2]).padStart(9)}`);
  console.log(`ÚLTIMOS 30 DIAS  | ${f(a[0]).padStart(8)} | ${f(a[1]).padStart(14)} | ${f(a[2]).padStart(9)}`);
  console.log(`\ncrescimento 30d vs mês anterior: views ${b[0]>0?((a[0]/b[0]-1)*100).toFixed(0):'∞'}% | inscritos ${b[2]>0?((a[2]/b[2]-1)*100).toFixed(0):'∞'}%`);
  // últimos 7 dias
  const s7=await q(d(7),d(1));
  console.log(`ÚLTIMOS 7 DIAS: ${f(s7[0])} views | ${f(s7[2])} inscritos | média ${Math.round(s7[0]/7)} views/dia`);
})().catch(e=>{console.error('ERRO:',e.message);process.exit(1);});
