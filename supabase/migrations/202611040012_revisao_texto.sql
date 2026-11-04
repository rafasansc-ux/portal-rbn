begin;
create table public.portal_revisao_planos(radio_id uuid primary key references public.portal_radios(id),ativo boolean not null default false,limite_mensal integer not null default 0 check(limite_mensal between 0 and 10000));
create table public.portal_revisoes(id uuid primary key default gen_random_uuid(),radio_id uuid not null references public.portal_radios(id),solicitante uuid not null references auth.users(id),chave uuid not null,hash text not null check(hash ~ '^[a-f0-9]{64}$'),mes date not null,estado text not null default 'processando' check(estado in ('processando','pronto','incerto')),resultado jsonb,criado_em timestamptz not null default now(),unique(radio_id,chave));
alter table public.portal_revisao_planos enable row level security;
alter table public.portal_revisoes enable row level security;
revoke all on public.portal_revisao_planos,public.portal_revisoes from anon,authenticated;
grant select on public.portal_revisao_planos,public.portal_revisoes to authenticated;
grant all on public.portal_revisao_planos,public.portal_revisoes to service_role;
create policy revisao_plano_ler on public.portal_revisao_planos for select to authenticated using(portal_private.pode_acessar(radio_id));
create policy revisao_ler on public.portal_revisoes for select to authenticated using(portal_private.pode_acessar(radio_id));
create function public.portal_reservar_revisao(p_radio uuid,p_usuario uuid,p_chave uuid,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare plano public.portal_revisao_planos; anterior public.portal_revisoes; periodo date; job uuid;
begin
 select * into plano from public.portal_revisao_planos where radio_id=p_radio for update;
 if not found or not plano.ativo then raise exception 'Revisão não habilitada';end if;
 if not exists(select 1 from public.portal_membros m join public.portal_radios r on r.id=m.radio_id where m.radio_id=p_radio and m.usuario_id=p_usuario and m.ativo and m.papel in ('editor','administrador') and r.ativa and r.acesso_ate>now()) then raise exception 'Acesso não autorizado';end if;
 select * into anterior from public.portal_revisoes where radio_id=p_radio and chave=p_chave;
 if found then
  if anterior.hash<>p_hash then raise exception 'Chave usada para outro texto';end if;
  return jsonb_build_object('nova',false,'estado',anterior.estado,'resultado',anterior.resultado);
 end if;
 periodo:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
 if (select count(*) from public.portal_revisoes where radio_id=p_radio and mes=periodo)>=plano.limite_mensal then raise exception 'Limite mensal de revisões atingido';end if;
 insert into public.portal_revisoes(radio_id,solicitante,chave,hash,mes) values(p_radio,p_usuario,p_chave,p_hash,periodo) returning id into job;
 return jsonb_build_object('nova',true,'id',job);
end;$$;
revoke all on function public.portal_reservar_revisao(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.portal_reservar_revisao(uuid,uuid,uuid,text) to service_role;
commit;
