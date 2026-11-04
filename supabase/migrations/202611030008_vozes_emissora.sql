begin;
alter table public.portal_audio_planos add column limite_vozes integer not null default 0 check(limite_vozes between 0 and 20);
alter table public.portal_vozes drop constraint portal_vozes_tipo_check;
alter table public.portal_vozes add constraint portal_vozes_tipo_check check(tipo in ('catalogo','ivc'));
create unique index portal_voz_clone_exclusivo on public.portal_vozes(provedor_id) where tipo='ivc';
create table public.portal_locutores (
 id uuid primary key default gen_random_uuid(),radio_id uuid not null references public.portal_radios(id),
 nome text not null check(length(nome) between 1 and 100),responsavel text not null,
 canal_revogacao text not null,destino_audios text not null,guarda_documentos text not null,
 consentimento_ate timestamptz not null,termos_versao text not null,termos_texto text not null,termos_sha256 text not null,
 documento_caminho text not null,documento_sha256 text not null,amostra_caminho text not null,amostra_sha256 text not null,amostra_segundos integer not null,
 estado text not null default 'cadastrada' check(estado in ('cadastrada','clonando','aguardando_verificacao','aguardando_aprovacao','ativa','desativada','revogada','incerta')),
 voz_id uuid,provedor_id text,provedor_verificada boolean not null default false,
 criado_por uuid not null references auth.users(id),criado_em timestamptz not null default now(),revogado_em timestamptz,
 unique(id,radio_id),foreign key(voz_id,radio_id) references public.portal_vozes(id,radio_id)
);
create index portal_locutores_radio on public.portal_locutores(radio_id,criado_em desc);
create function portal_private.limitar_locutores() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.portal_radios where id=new.radio_id for update;
 if(select count(*) from public.portal_locutores where radio_id=new.radio_id)>=20 then raise exception 'Limite de cadastros por emissora atingido';end if;
 return new;
end;$$;
create trigger limitar_locutores before insert on public.portal_locutores for each row execute function portal_private.limitar_locutores();
create table public.portal_voz_eventos (
 id bigint generated always as identity primary key,radio_id uuid not null references public.portal_radios(id),
 locutor_id uuid not null,usuario_id uuid not null references auth.users(id),acao text not null,criado_em timestamptz not null default now(),
 foreign key(locutor_id,radio_id) references public.portal_locutores(id,radio_id)
);
alter table public.portal_locutores enable row level security;alter table public.portal_voz_eventos enable row level security;
revoke all on public.portal_locutores,public.portal_voz_eventos from anon,authenticated;
grant select on public.portal_locutores,public.portal_voz_eventos to authenticated;
grant all on public.portal_locutores,public.portal_voz_eventos to service_role;
grant usage,select on sequence public.portal_voz_eventos_id_seq to service_role;
create policy locutor_admin_ler on public.portal_locutores for select to authenticated using(portal_private.pode_acessar(radio_id) and exists(select 1 from public.portal_membros where radio_id=portal_locutores.radio_id and usuario_id=auth.uid() and papel='administrador' and ativo));
create policy voz_eventos_admin_ler on public.portal_voz_eventos for select to authenticated using(portal_private.pode_acessar(radio_id) and exists(select 1 from public.portal_membros where radio_id=portal_voz_eventos.radio_id and usuario_id=auth.uid() and papel='administrador' and ativo));
create function public.portal_voz_liberada(p_voz uuid,p_radio uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(portal_private.pode_acessar(p_radio) or coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role')='service_role',false) and exists(select 1 from public.portal_vozes v where v.id=p_voz and v.radio_id=p_radio and v.ativa and v.autorizada and
 (v.tipo='catalogo' or exists(select 1 from public.portal_locutores l where l.voz_id=v.id and l.radio_id=v.radio_id and l.estado='ativa' and l.provedor_verificada and l.revogado_em is null and l.consentimento_ate>now())))
$$;
revoke all on function public.portal_voz_liberada(uuid,uuid) from public,anon;
grant execute on function public.portal_voz_liberada(uuid,uuid) to authenticated,service_role;
create view public.portal_vozes_disponiveis with(security_invoker=true) as select id,radio_id,nome,provedor_id,ativa,autorizada from public.portal_vozes where public.portal_voz_liberada(id,radio_id);
revoke all on public.portal_vozes_disponiveis from anon;grant select on public.portal_vozes_disponiveis to authenticated,service_role;
do $migration$ declare definition text;begin
 select pg_get_functiondef('public.portal_reservar_locucao(uuid,uuid,uuid,integer,uuid,uuid,numeric,text)'::regprocedure) into definition;
 if strpos(definition,'and ativa and autorizada and tipo=''catalogo''')=0 then raise exception 'Função de reserva diferente da versão esperada';end if;
 execute replace(definition,'and ativa and autorizada and tipo=''catalogo''','and public.portal_voz_liberada(id,radio_id)');
end;$migration$;
create function public.portal_iniciar_clonagem(p_radio uuid,p_locutor uuid,p_usuario uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare plano public.portal_audio_planos;begin
 select * into plano from public.portal_audio_planos where radio_id=p_radio for update;
 if not found or not plano.ativo or plano.limite_vozes<1 then raise exception 'Clonagem ainda não liberada no plano';end if;
 if not exists(select 1 from public.portal_membros m join public.portal_radios r on r.id=m.radio_id where m.radio_id=p_radio and m.usuario_id=p_usuario and m.papel='administrador' and m.ativo and r.ativa and r.acesso_ate>now()) then raise exception 'Somente administrador ativo';end if;
 if (select count(*) from public.portal_locutores where radio_id=p_radio and (provedor_id is not null or estado in ('clonando','incerta')))>=plano.limite_vozes then raise exception 'Limite de vozes atingido';end if;
 update public.portal_locutores set estado='clonando' where id=p_locutor and radio_id=p_radio and estado='cadastrada' and revogado_em is null and consentimento_ate>now();
 if not found then return false;end if;
 insert into public.portal_voz_eventos(radio_id,locutor_id,usuario_id,acao) values(p_radio,p_locutor,p_usuario,'clonagem_solicitada');return true;
end;$$;
revoke all on function public.portal_iniciar_clonagem(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.portal_iniciar_clonagem(uuid,uuid,uuid) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('portal-vozes-documentos','portal-vozes-documentos',false,1000000,array['application/pdf','audio/mpeg']);
commit;
