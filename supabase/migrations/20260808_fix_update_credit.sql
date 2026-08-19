-- =============================================================
-- iCredix · Fix update_credit (firma canónica de 10 parámetros)
-- ------------------------------------------------------------
-- Problema:
--   La migración final del repo (20260807_next_features.sql) recreó
--   update_credit SIN el parámetro p_device_value (9 parámetros) y su
--   body dejó de persistir la columna device_value. El caller JS
--   (lib/actions/credits.ts) la invoca SIEMPRE con p_device_value, por
--   lo que la firma del repo divergía del código (editar fallaba o
--   perdía device_value según el estado real de la BD).
--
-- Solución:
--   - Restaurar la firma de 10 parámetros (incluye p_device_value).
--   - Persistir device_value.
--   - El interés se aplica de forma consistente en el caller JS tanto en
--     crear como en editar (p_financed_amount llega ya calculado con
--     interés cuando corresponda); la RPC persiste el valor recibido,
--     igual que create_credit.
-- ------------------------------------------------------------
-- No sobrescribe otras funciones: solo redefine update_credit.
-- =============================================================

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

grant execute on function public.update_credit(uuid, uuid, uuid, text, numeric, numeric, int, date, numeric, numeric) to authenticated;
