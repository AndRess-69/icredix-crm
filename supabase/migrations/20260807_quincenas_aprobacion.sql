-- =============================================================
-- iCredix · Cuotas quincenales (2 y 17 de cada mes) + aprobación
-- (ejecutar en SQL Editor, una sola vez)
-- 1. Columna approval_date en credits (fecha de aprobación)
-- 2. next_payment_date: próxima fecha de pago quincenal
-- 3. generate_installments: cuotas en 2/17, la primera cae en el
--    segundo vencimiento próximo (ej. equipo el 7/08 -> 1ª cuota 2/09,
--    contando desde el 17/08)
-- 4. create_credit: end_date calculado quincenal
-- =============================================================

alter table public.credits
  add column if not exists approval_date timestamptz;

-- ---------- next_payment_date ----------
-- Próximo 2 o 17 estrictamente después de p_date.

create or replace function public.next_payment_date(p_date date)
returns date
language sql
immutable
set search_path = public
as $$
  select case
    when extract(day from p_date) < 2  then date_trunc('month', p_date)::date + 1
    when extract(day from p_date) < 17 then date_trunc('month', p_date)::date + 16
    else date_trunc('month', p_date + interval '1 month')::date + 1
  end;
$$;

-- ---------- generate_installments (quincenal) ----------

drop function if exists public.generate_installments(uuid, numeric, int, date) cascade;

create or replace function public.generate_installments(
  p_credit_id uuid,
  p_total numeric,
  p_count int,
  p_start_date date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  i int;
  v_base numeric;
  v_last numeric;
  v_amount numeric;
  v_due date;
  v_end date;
begin
  v_base := floor(p_total / p_count);
  v_last := p_total - v_base * (p_count - 1);

  v_due := public.next_payment_date(p_start_date);
  v_due := public.next_payment_date(v_due);

  for i in 1..p_count loop
    v_amount := case when i = p_count then v_last else v_base end;
    insert into public.installments (credit_id, number, due_date, amount, status)
    values (p_credit_id, i, v_due, v_amount, 'pendiente');
    v_end := v_due;
    v_due := public.next_payment_date(v_due);
  end loop;

  update public.credits
     set installment_amount = v_base,
         end_date = v_end,
         updated_at = now()
   where id = p_credit_id;
end;
$$;

-- ---------- create_credit (end_date quincenal) ----------

drop function if exists public.create_credit(uuid, uuid, text, numeric, numeric, int, date, numeric, numeric) cascade;

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
  v_end date;
  i int;
begin
  select count(*) + 1
    into v_seq
    from public.credits
   where deleted_at is null
     and to_char(created_at, 'YYYY') = to_char(now(), 'YYYY');

  v_number := 'CR-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 4, '0');
  v_base := floor(p_financed_amount / p_installments_count);

  v_end := public.next_payment_date(p_start_date);
  v_end := public.next_payment_date(v_end);
  for i in 2..p_installments_count loop
    v_end := public.next_payment_date(v_end);
  end loop;

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
    p_installments_count, v_base, p_start_date, v_end,
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

-- ---------- Permisos ----------

grant execute on function public.next_payment_date(date) to authenticated;
grant execute on function public.generate_installments(uuid, numeric, int, date) to authenticated;
grant execute on function public.create_credit(uuid, uuid, text, numeric, numeric, int, date, numeric, numeric) to authenticated;
