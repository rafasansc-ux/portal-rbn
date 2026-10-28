begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table public.portal_tempo (
  id text primary key check(id='epagri'),
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.portal_tempo enable row level security;
revoke all on public.portal_tempo from anon,authenticated;
grant select on public.portal_tempo to authenticated;
grant all on public.portal_tempo to service_role;
create policy portal_tempo_leitura on public.portal_tempo for select to authenticated using(true);

-- Token exclusivo do coletor. Gerado dentro do banco; nunca sai em resultados.
do $$ begin
  if not exists(select 1 from vault.secrets where name='portal_job_token') then
    perform vault.create_secret(md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),'portal_job_token');
  end if;
end $$;

create function public.portal_job_validar(p_token text)
returns boolean language sql stable security definer set search_path=''
as $$ select length(p_token)=64 and exists (
  select 1 from vault.decrypted_secrets where name='portal_job_token' and decrypted_secret=p_token
); $$;
revoke all on function public.portal_job_validar(text) from public,anon,authenticated;
grant execute on function public.portal_job_validar(text) to service_role;

create function public.portal_job_reservar(p_radio uuid)
returns uuid language plpgsql security definer set search_path=''
as $$ declare v_token uuid; begin
  if not exists(select 1 from public.portal_radios where id=p_radio and ativa and acesso_ate>now()) then
    raise exception 'Rádio indisponível' using errcode='42501';
  end if;
  insert into public.portal_boletins(radio_id) values(p_radio) on conflict do nothing;
  update public.portal_boletins set coleta_token=gen_random_uuid(),coleta_usuario=null,
    coleta_ate=now()+interval '2 minutes',proximo_inicio=now()+interval '1 minute'
    where radio_id=p_radio and (coleta_ate is null or coleta_ate<now())
      and (proximo_inicio is null or proximo_inicio<now())
    returning coleta_token into v_token;
  return v_token;
end $$;
revoke all on function public.portal_job_reservar(uuid) from public,anon,authenticated;
grant execute on function public.portal_job_reservar(uuid) to service_role;

create function public.portal_automacao_status()
returns jsonb language sql stable security definer set search_path=''
as $$ select jsonb_build_object('ativa',exists(
  select 1 from cron.job where jobname='portal-rbn-coleta-2h' and active
),'intervaloMinutos',120); $$;
revoke all on function public.portal_automacao_status() from public,anon;
grant execute on function public.portal_automacao_status() to authenticated;
commit;
