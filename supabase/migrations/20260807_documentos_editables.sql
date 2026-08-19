-- =============================================================
-- iCredix · Documentos editables (formatos diligenciables)
-- Tabla document_records: guarda los registros diligenciados de
-- la "Autorización de Bloqueo de Equipo" y la "Ficha de Estudio
-- de Crédito" (los campos diligenciados + datos del cliente).
-- Ejecutar en SQL Editor (una sola vez)
-- =============================================================

create table if not exists public.document_records (
  id uuid primary key default gen_random_uuid(),
  doc_key text not null,
  client_name text not null default 'Cliente sin nombre',
  cedula text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.document_records enable row level security;

drop policy if exists "document_records_select_auth" on public.document_records;
create policy "document_records_select_auth"
  on public.document_records for select to authenticated
  using (true);

drop policy if exists "document_records_insert_auth" on public.document_records;
create policy "document_records_insert_auth"
  on public.document_records for insert to authenticated
  with check (true);

drop policy if exists "document_records_update_auth" on public.document_records;
create policy "document_records_update_auth"
  on public.document_records for update to authenticated
  using (true);

drop policy if exists "document_records_delete_auth" on public.document_records;
create policy "document_records_delete_auth"
  on public.document_records for delete to authenticated
  using (true);

-- ---------- Índices ----------

create index if not exists document_records_doc_key_idx
  on public.document_records (doc_key);

create index if not exists document_records_client_name_idx
  on public.document_records (client_name);

create index if not exists document_records_cedula_idx
  on public.document_records (cedula);

create index if not exists document_records_created_at_idx
  on public.document_records (created_at desc);
