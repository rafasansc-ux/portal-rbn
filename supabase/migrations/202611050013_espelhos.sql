begin;
create table public.portal_jornal_modelos (
 id uuid primary key default gen_random_uuid(),
 radio_id uuid not null references public.portal_radios(id),
 nome text not null check(length(nome) between 1 and 160),
 meta_segundos integer not null check(meta_segundos between 60 and 86400),
 blocos jsonb not null check(jsonb_typeof(blocos)='array' and jsonb_array_length(blocos) between 1 and 50 and octet_length(blocos::text)<50000),
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 versao integer not null default 1
);
create index on public.portal_jornal_modelos(radio_id,criado_em desc);
alter table public.portal_jornal_modelos enable row level security;
revoke all on public.portal_jornal_modelos from anon,authenticated;
grant select,insert,update on public.portal_jornal_modelos to authenticated;
grant all on public.portal_jornal_modelos to service_role;
create policy espelho_ler on public.portal_jornal_modelos for select to authenticated using(portal_private.pode_acessar(radio_id));
create policy espelho_criar on public.portal_jornal_modelos for insert to authenticated with check(portal_private.pode_acessar(radio_id,true));
create policy espelho_editar on public.portal_jornal_modelos for update to authenticated using(portal_private.pode_acessar(radio_id,true)) with check(portal_private.pode_acessar(radio_id,true));
create trigger espelho_revisao before update on public.portal_jornal_modelos for each row execute function portal_private.roteiro_revisao();
commit;
