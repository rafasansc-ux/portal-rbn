-- Executar somente depois da função portal-coleta implantada e testada.
-- Cron utiliza UTC; as horas abaixo equivalem a 00h,02h,...,22h de Brasília.
select cron.schedule('portal-rbn-coleta-2h','0 1-23/2 * * *',$job$
  select net.http_post(
    url:='https://amksnfyktkzewxcandpu.supabase.co/functions/v1/portal-coleta',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='portal_job_anon_jwt'),'x-portal-job',
      (select decrypted_secret from vault.decrypted_secrets where name='portal_job_token')),
    body:=jsonb_build_object('radio_id',r.id),timeout_milliseconds:=60000
  ) from public.portal_radios r where r.ativa and r.acesso_ate>now();
$job$);
