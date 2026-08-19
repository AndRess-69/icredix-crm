-- =============================================================
-- iCredix · Fix reverso de pagos parciales (trazabilidad exacta)
-- ------------------------------------------------------------
-- Problema:
--   delete_payment (20260807_next_features.sql) revertía los pagos
--   parciales con heurísticas de estado/monto:
--     - Caso B (traslado a la última pendiente): buscaba la última cuota
--       por número SIN filtrar estado; si esa cuota ya estaba pagada o no
--       era la que recibió el restante, descontaba a la equivocada.
--     - Caso A (reducción de la propia última pendiente): la condición
--       `v_inst.amount > v_payment.amount` fallaba cuando el restante
--       era menor o igual al pago (ej. cuota 100, pago 60 -> restante
--       40), por lo que NUNCA restauraba el monto original.
--   Dos reversos del mismo pago podían además descontar dos veces
--   (doble reverso).
--
-- Solución (sin heurísticas, referencias exactas):
--   - payments.transferred_to_installment_id: cuota EXACTA que recibió
--     el restante en un pago parcial con traslado (caso B).
--   - payments.is_partial: bandera que indica que el pago fue parcial
--     (independiente del monto actual de la cuota).
--   - create_payment registra ambas; delete_payment revierte con ellas.
-- ------------------------------------------------------------
-- No sobrescribe otras funciones: solo create_payment y delete_payment
-- (definidas únicamente en 20260807_next_features.sql).
-- =============================================================

alter table public.payments
  add column if not exists transferred_to_installment_id uuid
    references public.installments(id),
  add column if not exists is_partial boolean not null default false;

-- ---------- create_payment (registra el destino del restante) ----------

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
  v_payment_id uuid;
  v_partial boolean;
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

  v_partial := v_paid < v_inst.amount;

  insert into public.payments (
    client_id, credit_id, installment_id, amount,
    method, reference, notes, created_by, is_partial
  )
  values (
    v_credit.client_id, p_credit_id, p_installment_id,
    least(v_paid, v_inst.amount),
    p_method::public.payment_method, p_reference, p_notes,
    auth.uid(), v_partial
  )
  returning id into v_payment_id;

  if not v_partial then
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

      update public.payments
         set transferred_to_installment_id = v_target.id
       where id = v_payment_id;
    end if;

    update public.credits
       set balance = balance - v_paid, updated_at = now()
     where id = p_credit_id;
  end if;

  perform public.refresh_overdue_installments();
  perform public.recompute_credit_status(p_credit_id);
end;
$$;

-- ---------- delete_payment (reversa exacta) ----------

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
  v_transferred record;
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

  -- Caso B: pago parcial con traslado. Se revierte EXACTAMENTE la cuota
  -- que recibió el restante (referencia guardada al crear el pago).
  if v_payment.transferred_to_installment_id is not null then
    select * into v_transferred
      from public.installments
     where id = v_payment.transferred_to_installment_id;

    if found then
      update public.installments
         set amount = amount - (v_inst.amount - v_payment.amount), updated_at = now()
       where id = v_transferred.id;
    end if;
  elsif v_payment.is_partial then
    -- Caso A: pago parcial sobre la propia última cuota pendiente
    -- (se redujo su monto). Se restaura el monto original.
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
     set deleted_at = now(),
         updated_at = now(),
         transferred_to_installment_id = null
   where id = p_payment_id;

  perform public.refresh_overdue_installments();
  perform public.recompute_credit_status(v_payment.credit_id);
end;
$$;

-- ---------- Permisos ----------

grant execute on function public.create_payment(uuid, uuid, text, text, text, numeric) to authenticated;
grant execute on function public.delete_payment(uuid) to authenticated;
