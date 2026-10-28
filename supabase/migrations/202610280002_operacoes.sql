begin;

create function portal_private.limitar_fontes()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if TG_OP='UPDATE' and new.radio_id=old.radio_id then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.radio_id::text,0));
  if (select count(*) from public.portal_fontes where radio_id=new.radio_id)>=40 then
    raise exception 'Limite de 40 fontes por rádio';
  end if;
  return new;
end;
$$;
revoke all on function portal_private.limitar_fontes() from public,anon;
create trigger portal_fontes_limite before insert or update of radio_id
  on public.portal_fontes for each row execute function portal_private.limitar_fontes();

create function public.portal_substituir_fontes(p_radio uuid, p_fontes jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if not portal_private.pode_acessar(p_radio,true) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  if jsonb_typeof(p_fontes) is distinct from 'array' or jsonb_array_length(p_fontes)>40 then
    raise exception 'Lista de fontes inválida';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_radio::text,0));
  delete from public.portal_fontes where radio_id=p_radio;
  insert into public.portal_fontes(radio_id,nome,editoria,rss,ativa)
    select p_radio,f.nome,f.editoria,f.rss,f.ativo
    from jsonb_to_recordset(p_fontes) as f(nome text,editoria text,rss text,ativo boolean);
end;
$$;
revoke all on function public.portal_substituir_fontes(uuid,jsonb) from public,anon;
grant execute on function public.portal_substituir_fontes(uuid,jsonb) to authenticated;

alter table public.portal_boletins add column coleta_token uuid;
alter table public.portal_boletins add column coleta_usuario uuid;
alter table public.portal_boletins add column coleta_ate timestamptz;
alter table public.portal_boletins add column proximo_inicio timestamptz;

create function public.portal_iniciar_coleta(p_radio uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_token uuid;
begin
  if not portal_private.pode_acessar(p_radio,true) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  insert into public.portal_boletins(radio_id) values(p_radio) on conflict do nothing;
  update public.portal_boletins
    set coleta_token=gen_random_uuid(), coleta_usuario=(select auth.uid()),
      coleta_ate=now()+interval '2 minutes', proximo_inicio=now()+interval '1 minute'
    where radio_id=p_radio and (coleta_ate is null or coleta_ate<now())
      and (proximo_inicio is null or proximo_inicio<now())
    returning coleta_token into v_token;
  return v_token;
end;
$$;

create function public.portal_salvar_boletim(p_radio uuid,p_token uuid,p_dados jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if not portal_private.pode_acessar(p_radio,true) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  if jsonb_typeof(p_dados) is distinct from 'object'
    or jsonb_typeof(p_dados->'editorias') is distinct from 'array' then
    raise exception 'Boletim inválido';
  end if;
  update public.portal_boletins
    set dados=p_dados, ultima_tentativa=now(),
      ultimo_sucesso=case when jsonb_array_length(coalesce(p_dados->'erros','[]'::jsonb))=0
        then now() else ultimo_sucesso end,
      coleta_token=null,coleta_usuario=null,coleta_ate=null
    where radio_id=p_radio and coleta_token=p_token
      and coleta_usuario=(select auth.uid()) and coleta_ate>now();
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'Coleta expirada ou não autorizada' using errcode='42501'; end if;
end;
$$;
revoke all on function public.portal_iniciar_coleta(uuid) from public,anon;
revoke all on function public.portal_salvar_boletim(uuid,uuid,jsonb) from public,anon;
grant execute on function public.portal_iniciar_coleta(uuid) to authenticated;
grant execute on function public.portal_salvar_boletim(uuid,uuid,jsonb) to authenticated;
commit;
