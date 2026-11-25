-- Documentos contratuais (PDF) no Business Hub.
-- Incremental: reutiliza public.contracts e as políticas RLS já existentes.
-- Bucket privado; o arquivo nunca é público. Caminho: {client_id}/{contract_id}/{uuid}.pdf

alter table public.contracts
  add column if not exists document_path text,
  add column if not exists document_filename text not null default '',
  add column if not exists document_size bigint,
  add column if not exists document_uploaded_at timestamptz;

create or replace function public.contract_path_uuid(object_name text, part int)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare piece text;
begin
  piece := split_part(coalesce(object_name, ''), '/', part);
  if piece ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return piece::uuid;
  end if;
  return null;
end;
$$;
revoke all on function public.contract_path_uuid(text, int) from public;
grant execute on function public.contract_path_uuid(text, int) to authenticated;

-- true somente se o objeto pertence a um contrato existente e o usuário
-- é administrador ou está vinculado ao mesmo client_id.
create or replace function public.can_read_contract_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.contracts c
    where c.client_id = public.contract_path_uuid(object_name, 1)
      and c.id = public.contract_path_uuid(object_name, 2)
      and (public.is_admin() or public.is_client_of(c.client_id))
  );
$$;
revoke all on function public.can_read_contract_object(text) from public;
grant execute on function public.can_read_contract_object(text) to authenticated;

create or replace function public.can_manage_contract_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() and exists (
    select 1
    from public.contracts c
    where c.client_id = public.contract_path_uuid(object_name, 1)
      and c.id = public.contract_path_uuid(object_name, 2)
  );
$$;
revoke all on function public.can_manage_contract_object(text) from public;
grant execute on function public.can_manage_contract_object(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contract-documents',
  'contract-documents',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists contract_docs_select on storage.objects;
create policy contract_docs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'contract-documents' and public.can_read_contract_object(name));

drop policy if exists contract_docs_insert on storage.objects;
create policy contract_docs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contract-documents' and public.can_manage_contract_object(name));

drop policy if exists contract_docs_update on storage.objects;
create policy contract_docs_update on storage.objects
  for update to authenticated
  using (bucket_id = 'contract-documents' and public.can_manage_contract_object(name))
  with check (bucket_id = 'contract-documents' and public.can_manage_contract_object(name));

drop policy if exists contract_docs_delete on storage.objects;
create policy contract_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'contract-documents' and public.can_manage_contract_object(name));
