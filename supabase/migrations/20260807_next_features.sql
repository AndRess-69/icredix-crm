-- =============================================================
-- iCredix · Siguientes features (ejecutar en SQL Editor, una sola vez)
-- 1. interest_rate en company_settings (configurable) y credits
-- 2. create_payment / delete_payment con soporte de pago parcial
--    (el restante se traslada a la última cuota pendiente)
-- 3. create_credit / update_credit con interest_rate
-- =============================================================

-- ---------- Columnas nuevas ----------

alter table public.company_settings
  add column if not exists interest_rate numeric(5, 2) not null default 10;

alter table public.credits
  add column if not exists interest_rate numeric(5, 2) not null default 0;

-- ---------- Helpers ----------

drop function if exists public.refresh_overdue_installments() cascade;

create or replace function public.refresh_overdue_installments()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.installments
     set days_overdue = greatest(0, (current_date - due_date))
   where status in ('pendiente', 'vencida');

  update public.installments
     set status = 'vencida',
         days_overdue = greatest(0, (current_date - due_date))
   where status = 'pendiente'
     and due_date < current_date;
end;
$$;

-- Recalcula el estado del crédito SOLO entre activo/en_mora/finalizado.
-- No toca bloqueado/desbloqueado.
drop function if exists public.recompute_credit_status(uuid) cascade;

create or replace function public.recompute_credit_status(p_credit_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pending int;
  v_overdue int;
  v_status public.credit_status;
begin
  select status into v_status from public.credits where id = p_credit_id;
  if not found then
    return;
  end if;

  if v_status in ('bloqueado', 'desbloqueado', 'finalizado') then
    return;
  end if;

  select count(*) into v_pending
    from public.installments
   where credit_id = p_credit_id
     and status in ('pendiente', 'vencida');

  select count(*) into v_overdue
    from public.installments
   where credit_id = p_credit_id
     and status = 'vencida';

  if v_pending = 0 then
    update public.credits set status = 'finalizado', updated_at = now() where id = p_credit_id;
  elsif v_overdue > 0 then
    update public.credits set status = 'en_mora', updated_at = now() where id = p_credit_id;
  else
    update public.credits set status = 'activo', updated_at = now() where id = p_credit_id;
  end if;
end;
$$;

-- Genera las cuotas de un crédito (la última absorbe el residuo).
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
begin
  v_base := floor(p_total / p_count);
  v_last := p_total - v_base * (p_count - 1);

  for i in 1..p_count loop
    v_amount := case when i = p_count then v_last else v_base end;
    v_due := (p_start_date + (i || ' months')::interval)::date - 1;
    insert into public.installments (credit_id, number, due_date, amount, status)
    values (p_credit_id, i, v_due, v_amount, 'pendiente');
  end loop;

  update public.credits
     set installment_amount = v_base,
         end_date = (p_start_date + (p_count || ' months')::interval)::date - 1,
         updated_at = now()
   where id = p_credit_id;
end;
$$;

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
  p_interest_rate numeric default 0
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
begin
  select count(*) + 1
    into v_seq
    from public.credits
   where deleted_at is null
     and to_char(created_at, 'YYYY') = to_char(now(), 'YYYY');

  v_number := 'CR-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 4, '0');

  insert into public.credits (
    credit_number, client_id, device_id, imei,
    financed_amount, initial_payment, balance,
    installments_count, start_date, status, interest_rate
  )
  values (
    v_number, p_client_id, p_device_id, p_imei,
    p_financed_amount, p_initial_payment,
    p_financed_amount,
    p_installments_count, p_start_date, 'activo',
    coalesce(p_interest_rate, 0)
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
  p_interest_rate numeric default 0
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
         updated_at = now()
   where id = p_credit_id;

  delete from public.installments where credit_id = p_credit_id;

  perform public.generate_installments(
    p_credit_id, p_financed_amount, p_installments_count, p_start_date
  );
end;
$$;

-- ---------- create_payment (con pago parcial) ----------
-- Si p_amount es null o >= al valor de la cuota: pago completo.
-- Si p_amount < valor de la cuota: la cuota se da por negociada (pagada)
-- y el restante se traslada a la última cuota pendiente. Si es la propia
-- última cuota, se reduce y queda pendiente por el restante.

drop function if exists public.create_payment(uuid, uuid, text, text, text, numeric) cascade;

create or replace function public.create_payment(
  p_credit_id uuid,
  p_installment_id uuid,
  p_method text,
  p_reference text default null,
  p_notes text default null,
  p_amount numeric default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_inst record;
  v_credit record;
  v_paid numeric;
  v_remainder numeric;
  v_target record;
begin
  select * into v_inst
    from public.installments
   where id = p_installment_id
   for update;

  if not found then
    raise exception 'Cuota no encontrada';
  end if;

  if v_inst.status = 'pagada' then
    raise exception 'La cuota ya está pagada';
  end if;

  select * into v_credit
    from public.credits
   where id = p_credit_id
   for update;

  if not found then
    raise exception 'Crédito no encontrado';
  end if;

  v_paid := coalesce(p_amount, v_inst.amount);

  if v_paid <= 0 then
    raise exception 'El valor del pago debe ser mayor a 0';
  end if;

  insert into public.payments (
    client_id, credit_id, installment_id, amount,
    method, reference, notes, created_by
  )
  values (
    v_credit.client_id, p_credit_id, p_installment_id,
    least(v_paid, v_inst.amount),
    p_method::public.payment_method, p_reference, p_notes,
    auth.uid()
  );

  if v_paid >= v_inst.amount then
    update public.installments
       set status = 'pagada', paid_at = now(), updated_at = now()
     where id = p_installment_id;

    update public.credits
       set balance = balance - v_inst.amount, updated_at = now()
     where id = p_credit_id;
  else
    v_remainder := v_inst.amount - v_paid;

    select * into v_target
      from public.installments
     where credit_id = p_credit_id
       and status in ('pendiente', 'vencida')
     order by number desc
     limit 1
     for update;

    if v_target.id = p_installment_id then
      update public.installments
         set amount = v_remainder, updated_at = now()
       where id = p_installment_id;
    else
      update public.installments
         set status = 'pagada', paid_at = now(), updated_at = now()
       where id = p_installment_id;

      update public.installments
         set amount = amount + v_remainder, updated_at = now()
       where id = v_target.id;
    end if;

    update public.credits
       set balance = balance - v_paid, updated_at = now()
     where id = p_credit_id;
  end if;

  perform public.refresh_overdue_installments();
  perform public.recompute_credit_status(p_credit_id);
end;
$$;

-- ---------- delete_payment (revierte también pagos parciales) ----------

drop function if exists public.delete_payment(uuid) cascade;

create or replace function public.delete_payment(p_payment_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment record;
  v_inst record;
  v_target record;
begin
  select * into v_payment
    from public.payments
   where id = p_payment_id and deleted_at is null
   for update;

  if not found then
    return;
  end if;

  select * into v_inst
    from public.installments
   where id = v_payment.installment_id;

  -- Pago parcial: si la cuota quedó 'pagada', el restante se trasladó a la
  -- última cuota pendiente (caso B). Si quedó 'pendiente'/'vencida', el
  -- restante se redujo en la propia última cuota (caso A).
  if v_inst.amount > v_payment.amount and v_inst.status = 'pagada' then
    select * into v_target
      from public.installments
     where credit_id = v_payment.credit_id
       and id <> v_inst.id
     order by number desc
     limit 1;

    if found then
      update public.installments
         set amount = amount - (v_inst.amount - v_payment.amount), updated_at = now()
       where id = v_target.id;
    end if;
  elsif v_inst.amount > v_payment.amount then
    update public.installments
       set amount = v_inst.amount + v_payment.amount, updated_at = now()
     where id = v_inst.id;
  end if;

  update public.installments
     set status = 'pendiente', paid_at = null, updated_at = now()
   where id = v_inst.id;

  update public.credits
     set balance = balance + v_payment.amount, updated_at = now()
   where id = v_payment.credit_id;

  update public.payments
     set deleted_at = now(), updated_at = now()
   where id = p_payment_id;

  perform public.refresh_overdue_installments();
  perform public.recompute_credit_status(v_payment.credit_id);
end;
$$;

-- ---------- Permisos ----------

grant execute on function public.create_credit(uuid, uuid, text, numeric, numeric, int, date, numeric) to authenticated;
grant execute on function public.update_credit(uuid, uuid, uuid, text, numeric, numeric, int, date, numeric) to authenticated;
grant execute on function public.create_payment(uuid, uuid, text, text, text, numeric) to authenticated;
grant execute on function public.delete_payment(uuid) to authenticated;
grant execute on function public.refresh_overdue_installments() to authenticated;
grant execute on function public.recompute_credit_status(uuid) to authenticated;
grant execute on function public.generate_installments(uuid, numeric, int, date) to authenticated;
