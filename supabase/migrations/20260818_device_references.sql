-- =========================================================================
-- 20260818_device_references.sql
-- Tabla device_references como catálogo de referencias de equipos.
-- La tabla devices se mantiene intacta (inventario físico / trazabilidad).
-- =========================================================================

-- 1) Tabla device_references
create table if not exists public.device_references (
  id         uuid primary key default gen_random_uuid(),
  brand      text not null default 'Apple',
  model      text not null,
  capacity   text,
  color      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_device_references_model
  on public.device_references (model);

create unique index if not exists idx_device_references_unique
  on public.device_references (brand, model, capacity, color)
  where deleted_at is null;

-- 2) Columna device_reference_id en credits
alter table public.credits
  add column if not exists device_reference_id uuid
  references public.device_references(id) on delete set null;

-- 3) RLS (misma política que las demás tablas operativas)
alter table public.device_references enable row level security;

drop policy if exists device_references_select_auth on public.device_references;
drop policy if exists device_references_insert_auth on public.device_references;
drop policy if exists device_references_update_auth on public.device_references;
drop policy if exists device_references_delete_admin  on public.device_references;

create policy device_references_select_auth
  on public.device_references for select to authenticated using (true);
create policy device_references_insert_auth
  on public.device_references for insert to authenticated with check (true);
create policy device_references_update_auth
  on public.device_references for update to authenticated using (true) with check (true);
create policy device_references_delete_admin
  on public.device_references for delete to authenticated using (public.is_admin());

-- 4) RPC: crear referencia
create or replace function public.create_device_reference(
  p_brand    text,
  p_model    text,
  p_capacity text default null,
  p_color    text default null
)
returns public.device_references
language sql
security definer
set search_path = public
as $function$
  insert into public.device_references (brand, model, capacity, color)
  values (p_brand, p_model, nullif(p_capacity, ''), nullif(p_color, ''))
  returning *;
$function$;

grant execute on function public.create_device_reference(text, text, text, text) to authenticated;

-- 5) RPC: actualizar referencia
create or replace function public.update_device_reference(
  p_id       uuid,
  p_brand    text,
  p_model    text,
  p_capacity text default null,
  p_color    text default null
)
returns public.device_references
language sql
security definer
set search_path = public
as $function$
  update public.device_references
     set brand    = p_brand,
         model    = p_model,
         capacity = nullif(p_capacity, ''),
         color    = nullif(p_color, ''),
         updated_at = now()
   where id = p_id
   returning *;
$function$;

grant execute on function public.update_device_reference(uuid, text, text, text, text) to authenticated;

-- 6) RPC: eliminar referencia (soft delete)
create or replace function public.delete_device_reference(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $function$
  update public.device_references set deleted_at = now() where id = p_id;
$function$;

grant execute on function public.delete_device_reference(uuid) to authenticated;

-- 7) Datos semilla: referencias predefinidas
insert into public.device_references (brand, model) values
  ('Apple', 'iPhone 12 Pro Max'),
  ('Apple', 'iPhone 13 Pro Max'),
  ('Apple', 'iPhone 14 Pro Max'),
  ('Apple', 'iPhone 15'),
  ('Apple', 'iPhone 15 Pro'),
  ('Apple', 'iPhone 15 Pro Max'),
  ('Apple', 'iPhone 16'),
  ('Apple', 'iPhone 16 Pro'),
  ('Apple', 'iPhone 16 Pro Max'),
  ('Apple', 'iPhone 17'),
  ('Apple', 'iPhone 17 Pro'),
  ('Apple', 'iPhone 17 Pro Max')
on conflict do nothing;

-- 8) Actualizar RPCs de crédito para incluir device_reference_id
--    (reemplaza create_credit y update_credit existentes)

drop function if exists public.create_credit(
  uuid, uuid, text, numeric, numeric, integer, date, numeric, numeric
) cascade;

create or replace function public.create_credit(
  p_client_id            uuid,
  p_device_id            uuid,
  p_imei                 text,
  p_financed_amount      numeric,
  p_initial_payment      numeric,
  p_installments_count   integer,
  p_start_date           date,
  p_interest_rate        numeric default 0,
  p_device_value         numeric default 0,
  p_device_reference_id  uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
  declare
    v_credit_id uuid;
    v_number    text;
    v_base      numeric;
  begin
    v_number := public.next_credit_number();
    v_base   := floor(p_financed_amount / p_installments_count);

    insert into public.credits (
      credit_number, client_id, device_id, device_reference_id, imei,
      financed_amount, initial_payment, balance,
      installments_count, installment_amount, start_date, end_date,
      status, interest_rate, device_value
    )
    values (
      v_number, p_client_id, p_device_id, p_device_reference_id, p_imei,
      p_financed_amount, p_initial_payment,
      p_financed_amount,
      p_installments_count, v_base, p_start_date,
      (p_start_date + (p_installments_count || ' months')::interval)::date - 1,
      'activo',
      coalesce(p_interest_rate, 0),
      coalesce(p_device_value, 0)
    )
    returning id into v_credit_id;

    perform public.generate_installments(
      v_credit_id, p_financed_amount, p_installments_count, p_start_date
    );
  end;
$function$;

grant execute on function public.create_credit(
  uuid, uuid, text, numeric, numeric, integer, date, numeric, numeric, uuid
) to authenticated;

drop function if exists public.update_credit(
  uuid, uuid, uuid, text, numeric, numeric, integer, date, numeric, numeric
) cascade;

create or replace function public.update_credit(
  p_credit_id            uuid,
  p_client_id            uuid,
  p_device_id            uuid,
  p_imei                 text,
  p_financed_amount      numeric,
  p_initial_payment      numeric,
  p_installments_count   integer,
  p_start_date           date,
  p_interest_rate        numeric default 0,
  p_device_value         numeric default 0,
  p_device_reference_id  uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
  declare
    v_has_payments boolean;
  begin
    select exists(
      select 1 from public.payments
       where credit_id = p_credit_id and deleted_at is null
    ) into v_has_payments;

    if v_has_payments then
      raise exception 'No se puede editar un crédito con pagos registrados';
    end if;

    update public.credits
       set client_id          = p_client_id,
           device_id          = p_device_id,
           device_reference_id = p_device_reference_id,
           imei               = p_imei,
           financed_amount    = p_financed_amount,
           initial_payment    = p_initial_payment,
           balance            = p_financed_amount,
           installments_count = p_installments_count,
           start_date         = p_start_date,
           interest_rate      = coalesce(p_interest_rate, interest_rate),
           device_value       = coalesce(p_device_value, device_value),
           updated_at         = now()
     where id = p_credit_id;

    delete from public.installments where credit_id = p_credit_id;

    perform public.generate_installments(
      p_credit_id, p_financed_amount, p_installments_count, p_start_date
    );
  end;
$function$;

grant execute on function public.update_credit(
  uuid, uuid, uuid, text, numeric, numeric, integer, date, numeric, numeric, uuid
) to authenticated;
