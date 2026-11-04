begin;
-- Recoverable deletion: retain the private object and consumption ledger.
alter table public.portal_locucoes add column excluido_em timestamptz;
alter table public.portal_locucoes add column excluido_por uuid references auth.users(id);
commit;
