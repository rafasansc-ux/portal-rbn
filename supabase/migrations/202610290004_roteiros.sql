begin;
create table public.portal_roteiros (
 id uuid primary key default gen_random_uuid(),
 radio_id uuid not null references public.portal_radios(id),
 titulo text not null check(length(titulo) between 1 and 160),
 dados jsonb not null check(jsonb_typeof(dados)='object' and jsonb_typeof(dados->'itens')='array' and octet_length(dados::text)<=300000),
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 versao integer not null default 1
);
create index portal_roteiros_radio_data on public.portal_roteiros(radio_id,criado_em desc);
alter table public.portal_roteiros enable row level security;
revoke all on public.portal_roteiros from anon,authenticated;
grant select,insert,update on public.portal_roteiros to authenticated;
grant all on public.portal_roteiros to service_role;
create policy roteiro_ler on public.portal_roteiros for select to authenticated using(portal_private.pode_acessar(radio_id));
create policy roteiro_criar on public.portal_roteiros for insert to authenticated with check(portal_private.pode_acessar(radio_id,true));
create policy roteiro_editar on public.portal_roteiros for update to authenticated using(portal_private.pode_acessar(radio_id,true)) with check(portal_private.pode_acessar(radio_id,true));
create function portal_private.roteiro_revisao() returns trigger language plpgsql set search_path='' as $$
begin
 if new.id<>old.id or new.radio_id<>old.radio_id then raise exception 'Identidade do boletim imutável';end if;
 new.criado_em:=old.criado_em;new.atualizado_em:=now();new.versao:=old.versao+1;return new;
end;$$;
create trigger roteiro_revisao before update on public.portal_roteiros for each row execute function portal_private.roteiro_revisao();
commit;
