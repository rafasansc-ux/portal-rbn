begin;
-- Activation is opt-in. No default allowance, no cloned voices in this pilot.
create table public.portal_audio_planos (
 radio_id uuid primary key references public.portal_radios(id),
 ativo boolean not null default false,
 limite_caracteres integer not null default 0 check(limite_caracteres>=0),
 limite_segundos integer not null default 0 check(limite_segundos>=0),
 usd_por_mil numeric not null default 0.08 check(usd_por_mil>=0)
);
create table public.portal_vozes (
 id uuid primary key default gen_random_uuid(),radio_id uuid not null references public.portal_radios(id),
 nome text not null check(length(nome) between 1 and 100),
 provedor_id text not null check(provedor_id ~ '^[a-zA-Z0-9_-]{1,128}$'),
 tipo text not null default 'catalogo' check(tipo='catalogo'),
 autorizada boolean not null default false,ativa boolean not null default false,
 evidencia_licenca text not null check(length(evidencia_licenca)>5),
 unique(id,radio_id)
);
create table public.portal_locucoes (
 id uuid primary key default gen_random_uuid(),radio_id uuid not null references public.portal_radios(id),
 roteiro_id uuid not null references public.portal_roteiros(id),versao integer not null,
 voz_id uuid not null,solicitante uuid not null references auth.users(id),
 chave uuid not null,mes date not null,
 estado text not null default 'processando' check(estado in ('processando','pronto','incerto')),
 titulo text not null,texto text not null check(length(texto) between 1 and 3000),
 caracteres integer not null,segundos_reservados integer not null default 600,
 segundos integer,consumo_reportado integer,custo_estimado_usd numeric not null,
 ritmo numeric not null,estilo text not null,
 caminho text,request_id text,aprovado_em timestamptz,aprovado_por uuid references auth.users(id),
 criado_em timestamptz not null default now(),
 unique(radio_id,chave),foreign key(voz_id,radio_id) references public.portal_vozes(id,radio_id)
);
create index portal_locucoes_radio_mes on public.portal_locucoes(radio_id,mes);
alter table public.portal_audio_planos enable row level security;
alter table public.portal_vozes enable row level security;
alter table public.portal_locucoes enable row level security;
revoke all on public.portal_audio_planos,public.portal_vozes,public.portal_locucoes from anon,authenticated;
grant select on public.portal_audio_planos,public.portal_vozes,public.portal_locucoes to authenticated;
grant all on public.portal_audio_planos,public.portal_vozes,public.portal_locucoes to service_role;
create policy audio_plano_ler on public.portal_audio_planos for select to authenticated using(portal_private.pode_acessar(radio_id));
create policy audio_voz_ler on public.portal_vozes for select to authenticated using(portal_private.pode_acessar(radio_id));
create policy audio_geracao_ler on public.portal_locucoes for select to authenticated using(portal_private.pode_acessar(radio_id));
create function public.portal_reservar_locucao(p_radio uuid,p_usuario uuid,p_roteiro uuid,p_versao integer,p_voz uuid,p_chave uuid,p_ritmo numeric,p_estilo text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare plano public.portal_audio_planos; roteiro public.portal_roteiros; n integer; txt text; job uuid; usados bigint; tempo bigint; periodo date;
begin
 select * into plano from public.portal_audio_planos where radio_id=p_radio for update;
 if not found or not plano.ativo then raise exception 'Locução ainda não habilitada para esta emissora';end if;
 if not exists(select 1 from public.portal_membros m join public.portal_radios r on r.id=m.radio_id where m.radio_id=p_radio and m.usuario_id=p_usuario and m.ativo and m.papel in ('editor','administrador') and r.ativa and r.acesso_ate>now()) then raise exception 'Acesso não autorizado';end if;
 select id into job from public.portal_locucoes where radio_id=p_radio and chave=p_chave;
 if found then return jsonb_build_object('id',job,'nova',false);end if;
 if p_ritmo not between 0.8 and 1.2 or p_estilo not in ('neutro','expressivo') then raise exception 'Configuração inválida';end if;
 if not exists(select 1 from public.portal_vozes where id=p_voz and radio_id=p_radio and ativa and autorizada and tipo='catalogo') then raise exception 'Voz indisponível';end if;
 select * into roteiro from public.portal_roteiros where id=p_roteiro and radio_id=p_radio and versao=p_versao and excluido_em is null;
 if not found then raise exception 'Salve e reabra a versão atual do boletim';end if;
 select string_agg(concat_ws(E'.\n',nullif(i->>'titulo',''),nullif(i->>'texto','')),E'\n\n' order by ordem) into txt from jsonb_array_elements(roteiro.dados->'itens') with ordinality as itens(i,ordem);
 txt:=btrim(txt);n:=length(txt);if n is null or n not between 1 and 3000 then raise exception 'Use de 1 a 3.000 caracteres';end if;
 periodo:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
 select coalesce(sum(caracteres),0),coalesce(sum(coalesce(segundos,segundos_reservados)),0) into usados,tempo from public.portal_locucoes where radio_id=p_radio and mes=periodo;
 if usados+n>plano.limite_caracteres or tempo+600>plano.limite_segundos then raise exception 'Franquia insuficiente. Cada solicitação reserva até dez minutos antes de gerar';end if;
 insert into public.portal_locucoes(radio_id,roteiro_id,versao,voz_id,solicitante,chave,mes,titulo,texto,caracteres,custo_estimado_usd,ritmo,estilo)
 values(p_radio,p_roteiro,p_versao,p_voz,p_usuario,p_chave,periodo,roteiro.titulo,txt,n,n*plano.usd_por_mil/1000,p_ritmo,p_estilo) returning id into job;
 return jsonb_build_object('id',job,'nova',true);
end;$$;
revoke all on function public.portal_reservar_locucao(uuid,uuid,uuid,integer,uuid,uuid,numeric,text) from public,anon,authenticated;
grant execute on function public.portal_reservar_locucao(uuid,uuid,uuid,integer,uuid,uuid,numeric,text) to service_role;
-- Private objects are accessed only through the authenticated backend.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('portal-locucoes','portal-locucoes',false,9600000,array['audio/mpeg']);
commit;
