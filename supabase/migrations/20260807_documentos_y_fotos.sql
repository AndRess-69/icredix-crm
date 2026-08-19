-- =============================================================
-- iCredix · Documentos administrativos + Fotos de entrega
-- Ejecutar en SQL Editor (una sola vez)
-- 1. Buckets de Storage: documents y delivery-photos (privados)
-- 2. Tabla documents (formatos administrativos)
-- 3. Tabla credit_documents (fotos de entrega por crédito)
-- =============================================================

-- ---------- Buckets de Storage ----------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false),
       ('delivery-photos', 'delivery-photos', false)
on conflict (id) do nothing;

-- ---------- Políticas de Storage ----------

drop policy if exists "storage_documents_read" on storage.objects;
create policy "storage_documents_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents');

drop policy if exists "storage_documents_insert" on storage.objects;
create policy "storage_documents_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents');

drop policy if exists "storage_documents_update" on storage.objects;
create policy "storage_documents_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents');

drop policy if exists "storage_documents_delete" on storage.objects;
create policy "storage_documents_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents');

drop policy if exists "storage_delivery_read" on storage.objects;
create policy "storage_delivery_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'delivery-photos');

drop policy if exists "storage_delivery_insert" on storage.objects;
create policy "storage_delivery_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'delivery-photos');

drop policy if exists "storage_delivery_update" on storage.objects;
create policy "storage_delivery_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'delivery-photos');

drop policy if exists "storage_delivery_delete" on storage.objects;
create policy "storage_delivery_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'delivery-photos');

-- ---------- Tabla documents (formatos administrativos) ----------

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text not null,
  file_type text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.documents enable row level security;

drop policy if exists "documents_select_auth" on public.documents;
create policy "documents_select_auth"
  on public.documents for select to authenticated
  using (true);

drop policy if exists "documents_insert_auth" on public.documents;
create policy "documents_insert_auth"
  on public.documents for insert to authenticated
  with check (true);

drop policy if exists "documents_update_auth" on public.documents;
create policy "documents_update_auth"
  on public.documents for update to authenticated
  using (true);

-- ---------- Tabla credit_documents (fotos de entrega) ----------

create table if not exists public.credit_documents (
  id uuid primary key default gen_random_uuid(),
  credit_id uuid not null references public.credits(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.credit_documents enable row level security;

drop policy if exists "credit_documents_select_auth" on public.credit_documents;
create policy "credit_documents_select_auth"
  on public.credit_documents for select to authenticated
  using (true);

drop policy if exists "credit_documents_insert_auth" on public.credit_documents;
create policy "credit_documents_insert_auth"
  on public.credit_documents for insert to authenticated
  with check (true);

drop policy if exists "credit_documents_update_auth" on public.credit_documents;
create policy "credit_documents_update_auth"
  on public.credit_documents for update to authenticated
  using (true);

-- ---------- Índices ----------

create index if not exists credit_documents_credit_id_idx
  on public.credit_documents (credit_id);

create index if not exists credit_documents_client_id_idx
  on public.credit_documents (client_id);

create index if not exists documents_created_at_idx
  on public.documents (created_at desc);
