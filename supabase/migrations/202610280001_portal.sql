-- Estrutura do Portal RBN: validada localmente; ainda não aplicada remotamente.
-- Usa tabelas próprias e não altera config, usuarios, clientes ou visitas.
-- Aplicar somente após confirmar o projeto de destino e revisar o esquema.
begin;

create schema portal_private;
revoke all on schema portal_private from public, anon;
grant usage on schema portal_private to authenticated;

create table public.portal_radios (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(nome) between 1 and 150),
  ativa boolean not null default true,
  acesso_ate timestamptz not null,
  criado_em timestamptz not null default now()
);
create table public.portal_membros (
  radio_id uuid not null references public.portal_radios(id),
  usuario_id uuid not null references auth.users(id),
  papel text not null check (papel in ('administrador','editor','leitor')),
  ativo boolean not null default true,
  primary key (radio_id, usuario_id)
);
create index portal_membros_usuario on public.portal_membros(usuario_id, radio_id);
create table public.portal_fontes (
  id uuid primary key default gen_random_uuid(),
  radio_id uuid not null references public.portal_radios(id),
  nome text not null check (length(nome) between 1 and 150),
  editoria text not null check (length(editoria) between 1 and 80),
  rss text not null check (rss ~ '^https://'),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  unique(radio_id, rss)
);
create index portal_fontes_radio on public.portal_fontes(radio_id);
create table public.portal_preferencias (
  radio_id uuid primary key references public.portal_radios(id),
  dados jsonb not null default '{}'::jsonb check (jsonb_typeof(dados)='object')
);
create table public.portal_boletins (
  radio_id uuid primary key references public.portal_radios(id),
  dados jsonb not null default '{"editorias":[]}'::jsonb
    check (jsonb_typeof(dados)='object' and dados ? 'editorias' and jsonb_typeof(dados->'editorias')='array'),
  ultima_tentativa timestamptz,
  ultimo_sucesso timestamptz
);

-- A função consulta vínculos e assinatura sob um proprietário confiável,
-- evitando recursão das políticas. O cliente nunca escolhe sua própria rádio.
create function portal_private.pode_acessar(p_radio uuid, p_escrever boolean default false)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.portal_membros m
    join public.portal_radios r on r.id=m.radio_id
    where m.usuario_id=(select auth.uid()) and m.radio_id=p_radio
      and m.ativo and r.ativa and r.acesso_ate>now()
      and (not p_escrever or m.papel in ('administrador','editor'))
  );
$$;
revoke all on function portal_private.pode_acessar(uuid,boolean) from public, anon;
grant execute on function portal_private.pode_acessar(uuid,boolean) to authenticated;

alter table public.portal_radios enable row level security;
alter table public.portal_membros enable row level security;
alter table public.portal_fontes enable row level security;
alter table public.portal_preferencias enable row level security;
alter table public.portal_boletins enable row level security;

revoke all on public.portal_radios, public.portal_membros, public.portal_fontes,
  public.portal_preferencias, public.portal_boletins from anon, authenticated;
grant select on public.portal_radios, public.portal_membros, public.portal_fontes,
  public.portal_preferencias, public.portal_boletins to authenticated;
grant insert,update,delete on public.portal_fontes to authenticated;
grant insert,update on public.portal_preferencias to authenticated;
grant all on public.portal_radios, public.portal_membros, public.portal_fontes,
  public.portal_preferencias, public.portal_boletins to service_role;

create policy portal_radio_leitura on public.portal_radios for select to authenticated
  using (portal_private.pode_acessar(id));
create policy portal_membro_proprio on public.portal_membros for select to authenticated
  using (usuario_id=(select auth.uid()));
create policy portal_fonte_leitura on public.portal_fontes for select to authenticated
  using (portal_private.pode_acessar(radio_id));
create policy portal_fonte_criar on public.portal_fontes for insert to authenticated
  with check (portal_private.pode_acessar(radio_id,true));
create policy portal_fonte_alterar on public.portal_fontes for update to authenticated
  using (portal_private.pode_acessar(radio_id,true))
  with check (portal_private.pode_acessar(radio_id,true));
create policy portal_fonte_excluir on public.portal_fontes for delete to authenticated
  using (portal_private.pode_acessar(radio_id,true));
create policy portal_preferencia_leitura on public.portal_preferencias for select to authenticated
  using (portal_private.pode_acessar(radio_id));
create policy portal_preferencia_criar on public.portal_preferencias for insert to authenticated
  with check (portal_private.pode_acessar(radio_id,true));
create policy portal_preferencia_alterar on public.portal_preferencias for update to authenticated
  using (portal_private.pode_acessar(radio_id,true))
  with check (portal_private.pode_acessar(radio_id,true));
create policy portal_boletim_leitura on public.portal_boletins for select to authenticated
  using (portal_private.pode_acessar(radio_id));

-- Criação/renovação de rádios, vínculos e gravação de boletins ficam somente
-- no servidor confiável. Chave service_role nunca pertence ao navegador.
commit;
