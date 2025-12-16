-- Enable the required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Create the daily digest cron job (Runs every day at 10:00 AM UTC)
-- NOTE: Replace [YOUR_PROJECT_REF] with your actual project Reference ID
-- NOTE: Replace [YOUR_SERVICE_ROLE_KEY] with your actual Service Role Key (from Project Settings > API)

select
  cron.schedule(
    'send-daily-digest', -- name of the cron job
    '0 10 * * *',        -- schedule (Every day at 10:00 AM UTC)
    $$
    select
      net.http_post(
          url:='https://npbyzgvsujrwlfhljgre.supabase.co/functions/v1/make-server-d6a7a206/send-daily-digest',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wYnl6Z3ZzdWpyd2xmaGxqZ3JlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc4NzM5OCwiZXhwIjoyMDc4MzYzMzk4fQ.eTZeG91cpHgr9wZxgbjJFGqAOtcLIiS4UXzWbW_5Uhs"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );

-- Create the weekly report cron job (Runs every Sunday at 10:00 AM UTC)
select
  cron.schedule(
    'send-weekly-report', -- name of the cron job
    '0 10 * * 0',         -- schedule (Every Sunday at 10:00 AM UTC)
    $$
    select
      net.http_post(
          url:='https://npbyzgvsujrwlfhljgre.supabase.co/functions/v1/make-server-d6a7a206/send-weekly-report',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wYnl6Z3ZzdWpyd2xmaGxqZ3JlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc4NzM5OCwiZXhwIjoyMDc4MzYzMzk4fQ.eTZeG91cpHgr9wZxgbjJFGqAOtcLIiS4UXzWbW_5Uhs"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );

-- To check if jobs are scheduled:
-- select * from cron.job;

-- To check logs of executed jobs:
-- select * from net.http_request_queue;
