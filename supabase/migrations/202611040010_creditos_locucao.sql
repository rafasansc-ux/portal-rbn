begin;
alter table public.portal_audio_planos add column creditos_ativo boolean not null default false;
create table public.portal_audio_ciclos (
 id uuid primary key default gen_random_uuid(), radio_id uuid not null references public.portal_radios(id),
 inicio timestamptz not null, fim timestamptz not null, creditos integer not null check(creditos between 1 and 1000000),
 referencia_pagamento text not null check(length(btrim(referencia_pagamento)) between 3 and 200),
 criado_em timestamptz not null default now(), check(fim>inicio and fim<=inicio+interval '32 days'),
 unique(radio_id,referencia_pagamento), unique(id,radio_id)
);
create table public.portal_audio_recargas (
 id uuid primary key default gen_random_uuid(), ciclo_id uuid not null,radio_id uuid not null,
 creditos integer not null check(creditos between 1 and 1000000),
 referencia_pagamento text not null check(length(btrim(referencia_pagamento)) between 3 and 200),
 criado_em timestamptz not null default now(), unique(radio_id,referencia_pagamento),
 foreign key(ciclo_id,radio_id) references public.portal_audio_ciclos(id,radio_id)
);
alter table public.portal_locucoes add column ciclo_id uuid;
alter table public.portal_locucoes add column creditos integer not null default 0 check(creditos>=0);
alter table public.portal_locucoes add column estornado_em timestamptz;
alter table public.portal_locucoes add column motivo_estorno text;
alter table public.portal_locucoes add foreign key(ciclo_id,radio_id) references public.portal_audio_ciclos(id,radio_id);
update public.portal_locucoes set creditos=ceil(caracteres/100.0)::integer;
alter table public.portal_audio_ciclos enable row level security;
alter table public.portal_audio_recargas enable row level security;
revoke all on public.portal_audio_ciclos,public.portal_audio_recargas from anon,authenticated;
grant select on public.portal_audio_ciclos,public.portal_audio_recargas to authenticated;
grant all on public.portal_audio_ciclos,public.portal_audio_recargas to service_role;
create policy ciclo_ler on public.portal_audio_ciclos for select to authenticated using(portal_private.pode_acessar(radio_id));
create policy recarga_ler on public.portal_audio_recargas for select to authenticated using(portal_private.pode_acessar(radio_id));

-- Only the platform operator, after confirming payment, may grant credits.
create function public.portal_audio_pagamento(p_radio uuid,p_referencia text,p_creditos integer,p_inicio timestamptz default null,p_fim timestamptz default null,p_ciclo uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare ciclo public.portal_audio_ciclos; existente public.portal_audio_recargas;
begin
 perform 1 from public.portal_audio_planos where radio_id=p_radio for update;
 if not found then raise exception 'Plano não encontrado';end if;
 if p_ciclo is null then
  if exists(select 1 from public.portal_audio_recargas where radio_id=p_radio and referencia_pagamento=p_referencia) then raise exception 'Pagamento já usado em recarga';end if;
  select * into ciclo from public.portal_audio_ciclos where radio_id=p_radio and referencia_pagamento=p_referencia;
  if found then
   if ciclo.creditos<>p_creditos or ciclo.inicio is distinct from p_inicio or ciclo.fim is distinct from p_fim then raise exception 'Referência já usada com outros valores';end if;
   return ciclo.id;
  end if;
  if p_inicio is null or p_fim is null or p_inicio>now()+interval '32 days' then raise exception 'Informe início e fim do ciclo pago';end if;
  if exists(select 1 from public.portal_audio_ciclos where radio_id=p_radio and inicio<p_fim and fim>p_inicio) then raise exception 'Ciclo sobreposto';end if;
  insert into public.portal_audio_ciclos(radio_id,inicio,fim,creditos,referencia_pagamento) values(p_radio,p_inicio,p_fim,p_creditos,p_referencia) returning * into ciclo;
  update public.portal_audio_planos set creditos_ativo=true where radio_id=p_radio;
  return ciclo.id;
 else
  if exists(select 1 from public.portal_audio_ciclos where radio_id=p_radio and referencia_pagamento=p_referencia) then raise exception 'Pagamento já usado em ciclo';end if;
  select * into ciclo from public.portal_audio_ciclos where id=p_ciclo and radio_id=p_radio and inicio<=now() and fim>now() for update;
  if not found then raise exception 'Ciclo expirado ou de outra emissora';end if;
  select * into existente from public.portal_audio_recargas where radio_id=p_radio and referencia_pagamento=p_referencia;
  if found then
   if existente.ciclo_id<>p_ciclo or existente.creditos<>p_creditos then raise exception 'Referência já usada com outros valores';end if;
   return existente.id;
  end if;
  insert into public.portal_audio_recargas(ciclo_id,radio_id,creditos,referencia_pagamento) values(p_ciclo,p_radio,p_creditos,p_referencia) returning id into p_ciclo;
  return p_ciclo;
 end if;
end;$$;
revoke all on function public.portal_audio_pagamento(uuid,text,integer,timestamptz,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.portal_audio_pagamento(uuid,text,integer,timestamptz,timestamptz,uuid) to service_role;

create function portal_private.reservar_creditos_audio() returns trigger language plpgsql security definer set search_path='' as $$
declare ativo boolean; ciclo public.portal_audio_ciclos; total bigint; usados bigint;
begin
 select creditos_ativo into ativo from public.portal_audio_planos where radio_id=new.radio_id for update;
 new.creditos:=ceil(new.caracteres/100.0)::integer;
 if ativo then
  select * into ciclo from public.portal_audio_ciclos where radio_id=new.radio_id and inicio<=now() and fim>now() for update;
  if not found then raise exception 'Ciclo expirado. Aguarde a confirmação do pagamento da renovação';end if;
  select ciclo.creditos+coalesce(sum(creditos),0) into total from public.portal_audio_recargas where ciclo_id=ciclo.id;
  select coalesce(sum(creditos),0) into usados from public.portal_locucoes where ciclo_id=ciclo.id and estornado_em is null;
  if usados+new.creditos>total then raise exception 'Créditos insuficientes. Adquira uma recarga antes de gerar';end if;
  new.ciclo_id:=ciclo.id;
 else
  select coalesce(sum(creditos),0) into usados from public.portal_locucoes where radio_id=new.radio_id and mes=new.mes and estornado_em is null;
  select floor(limite_caracteres/100.0) into total from public.portal_audio_planos where radio_id=new.radio_id;
  if usados+new.creditos>total then raise exception 'Créditos de teste insuficientes';end if;
 end if;
 return new;
end;$$;
create trigger reservar_creditos_audio before insert on public.portal_locucoes for each row execute function portal_private.reservar_creditos_audio();

-- Preserve existing pilot quotas; paid credit cycles no longer reserve a whole ten-minute monthly block.
do $migration$ declare definition text;begin
 select pg_get_functiondef('public.portal_reservar_locucao(uuid,uuid,uuid,integer,uuid,uuid,numeric,text)'::regprocedure) into definition;
 if strpos(definition,'if usados+n>plano.limite_caracteres or tempo+600>plano.limite_segundos then')=0 then raise exception 'Reserva diferente da versão esperada';end if;
 definition:=replace(definition,'if usados+n>plano.limite_caracteres or tempo+600>plano.limite_segundos then','if not plano.creditos_ativo and (usados+n>plano.limite_caracteres or tempo+600>plano.limite_segundos) then');
 definition:=replace(definition,'where radio_id=p_radio and mes=periodo;','where radio_id=p_radio and mes=periodo and estornado_em is null;');
 definition:=replace(definition,$old$txt:=btrim(txt,E' \t\n\r' || chr(11) || chr(12));$old$,$new$txt:=btrim(txt,E' \t\n\r' || chr(11) || chr(12) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279));$new$);
 definition:=replace(definition,$old$return jsonb_build_object('id',job,'nova',true);$old$,$new$return jsonb_build_object('id',job,'nova',true,'creditos',ceil(n/100.0)::integer);$new$);
 execute definition;
end;$migration$;

-- Confirmed no-audio refunds only, after operator reconciliation. No automatic retry.
create function public.portal_audio_estornar(p_radio uuid,p_job uuid,p_motivo text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.portal_audio_planos where radio_id=p_radio for update;
 if p_motivo is null or length(btrim(p_motivo))<10 then raise exception 'Registre a conferência da falha e ausência de áudio';end if;
 update public.portal_locucoes set estornado_em=now(),motivo_estorno=p_motivo where id=p_job and radio_id=p_radio and estado='incerto' and caminho is null and estornado_em is null;
 return found;
end;$$;
revoke all on function public.portal_audio_estornar(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.portal_audio_estornar(uuid,uuid,text) to service_role;
create function public.portal_audio_saldo(p_radio uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare plano public.portal_audio_planos; ciclo public.portal_audio_ciclos; total bigint:=0; usados bigint:=0; reservados bigint:=0; periodo date;
begin
 select * into plano from public.portal_audio_planos where radio_id=p_radio;
 if not found then return null;end if;
 if plano.creditos_ativo then
  select * into ciclo from public.portal_audio_ciclos where radio_id=p_radio and inicio<=now() and fim>now();
  if found then
   select ciclo.creditos+coalesce(sum(creditos),0) into total from public.portal_audio_recargas where ciclo_id=ciclo.id;
   select coalesce(sum(creditos) filter(where estado='pronto'),0),coalesce(sum(creditos) filter(where estado<>'pronto'),0) into usados,reservados from public.portal_locucoes where ciclo_id=ciclo.id and estornado_em is null;
  end if;
 else
  total:=floor(plano.limite_caracteres/100.0);periodo:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
  select coalesce(sum(creditos) filter(where estado='pronto'),0),coalesce(sum(creditos) filter(where estado<>'pronto'),0) into usados,reservados from public.portal_locucoes where radio_id=p_radio and portal_locucoes.mes=periodo and estornado_em is null;
 end if;
 return jsonb_build_object('caracteresPorCredito',100,'total',total,'usados',usados,'reservados',reservados,'disponiveis',greatest(0,total-usados-reservados),'inicio',ciclo.inicio,'fim',ciclo.fim,'modo',case when plano.creditos_ativo then 'assinatura' else 'piloto' end,'expirado',plano.creditos_ativo and ciclo.id is null,'renovacaoManual',true);
end;$$;
revoke all on function public.portal_audio_saldo(uuid) from public,anon,authenticated;
grant execute on function public.portal_audio_saldo(uuid) to service_role;
commit;
