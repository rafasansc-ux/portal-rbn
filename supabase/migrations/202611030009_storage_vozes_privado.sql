begin;
-- Keep these buckets server-only even if a broader storage policy is added later.
create policy portal_audio_arquivos_privados on storage.objects as restrictive for all to anon,authenticated
using(bucket_id not in ('portal-vozes-documentos','portal-locucoes'))
with check(bucket_id not in ('portal-vozes-documentos','portal-locucoes'));
commit;
