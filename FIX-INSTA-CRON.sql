-- FIX do Instagram (11/jul/2026): dá corda no carteiro + mata os crons velhos bugados.
-- ONDE RODAR: supabase.com/dashboard → projeto vtvvmikilbcalohutsmf (gram-text-wizard)
--             → SQL Editor → cola tudo → Run.

-- 1) desliga os crons ANTIGOS da geração bugada (se existirem)
DO $$ BEGIN PERFORM cron.unschedule('auto-reel-morning'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('auto-reel-evening'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2) CARTEIRO: chama o scheduled-publisher a cada 5 min (publica todo post agendado vencido;
--    catch-up embutido — se atrasar, publica na próxima rodada). Roda NA NUVEM (PC desligado = posta igual).
DO $$ BEGIN PERFORM cron.unschedule('scheduled-publisher-5min'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'scheduled-publisher-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vtvvmikilbcalohutsmf.supabase.co/functions/v1/scheduled-publisher',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0dnZtaWtpbGJjYWxvaHV0c21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTM2OTAsImV4cCI6MjA4MDI4OTY5MH0.7xor3_WpfyAjR-LHZMfK9zu_8Hlvrr3DABZU_04nX28"}'::jsonb,
    body := jsonb_build_object('trigger','cron','time', now())
  );
  $$
);

-- 3) conferir: deve listar scheduled-publisher-5min (e NÃO listar os auto-reel)
SELECT jobname, schedule, active FROM cron.job;
