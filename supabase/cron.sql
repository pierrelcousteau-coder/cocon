-- Rappels : appelle la fonction « push » toutes les 5 minutes
-- 1. Dashboard > Database > Extensions : activer pg_cron et pg_net
-- 2. Remplacer les 3 valeurs <...> puis exécuter dans le SQL Editor
select cron.schedule(
  'cocon-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{"type":"reminders"}'::jsonb
  );
  $$
);
-- pour arrêter : select cron.unschedule('cocon-reminders');
