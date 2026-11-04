begin;
-- Match JS trim for the common editorial whitespace, including final newlines.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.portal_reservar_locucao(uuid,uuid,uuid,integer,uuid,uuid,numeric,text)'::regprocedure) into definition;
 if strpos(definition,'txt:=btrim(txt);')=0 then raise exception 'Função de reserva diferente da migração esperada';end if;
 execute replace(definition,'txt:=btrim(txt);',$replacement$txt:=btrim(txt,E' \t\n\r' || chr(11) || chr(12));$replacement$);
end;
$migration$;
commit;
