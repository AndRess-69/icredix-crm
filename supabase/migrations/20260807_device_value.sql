-- =============================================================
-- iCredix · Valor del equipo en créditos (ejecutar en SQL Editor, una sola vez)
-- 1. Columna device_value en credits (valor del equipo)
-- 2. create_credit / update_credit reciben p_device_value
--    (valor a financiar = valor del equipo - cuota inicial)
-- =============================================================

alter table public.credits
  add column if not exists device_value numeric not null default 0;

-- ---------- create_credit ----------

drop function if exists public.create_credit(uuid, uuid, text, numeric, numeric, int, date, numeric) cascade;

create or replace function public.create_credit(
  p_client_id uuid,
  p_device_id uuid,
  p_imei text,
  p_financed_amount numeric,
  p_initial_payment numeric,
  p_installments_count int,
  p_start_date date,
  p_interest_rate numeric default 0,
  p_device_value numeric default 0
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_credit_id uuid;
  v_seq bigint;
  v_number text;
  v_base numeric;
begin
  select count(*) + 1
    into v_seq
    from public.credits
   where deleted_at is null
     and to_char(created_at, 'YYYY') = to_char(now(), 'YYYY');

  v_number := 'CR-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 4, '0');
  v_base := floor(p_financed_amount / p_installments_count);

  insert into public.credits (
    credit_number, client_id, device_id, imei,
    financed_amount, initial_payment, balance,
    installments_count, installment_amount, start_date, end_date,
    status, interest_rate, device_value
  )
  values (
    v_number, p_client_id, p_device_id, p_imei,
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
$$;

-- ---------- update_credit ----------

drop function if exists public.update_credit(uuid, uuid, uuid, text, numeric, numeric, int, date, numeric) cascade;

create or replace function public.update_credit(
  p_credit_id uuid,
  p_client_id uuid,
  p_device_id uuid,
  p_imei text,
  p_financed_amount numeric,
  p_initial_payment numeric,
  p_installments_count int,
  p_start_date date,
  p_interest_rate numeric default 0,
  p_device_value numeric default 0
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
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
     set client_id = p_client_id,
         device_id = p_device_id,
         imei = p_imei,
         financed_amount = p_financed_amount,
         initial_payment = p_initial_payment,
         balance = p_financed_amount,
         installments_count = p_installments_count,
         start_date = p_start_date,
         interest_rate = coalesce(p_interest_rate, interest_rate),
         device_value = coalesce(p_device_value, device_value),
         updated_at = now()
   where id = p_credit_id;

  delete from public.installments where credit_id = p_credit_id;

  perform public.generate_installments(
    p_credit_id, p_financed_amount, p_installments_count, p_start_date
  );
end;
$$;

-- ---------- Permisos ----------

grant execute on function public.create_credit(uuid, uuid, text, numeric, numeric, int, date, numeric, numeric) to authenticated;
grant execute on function public.update_credit(uuid, uuid, uuid, text, numeric, numeric, int, date, numeric, numeric) to authenticated;
