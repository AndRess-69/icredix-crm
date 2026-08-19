-- 20260819_credit_approval_workflow.sql
-- Agrega estados en_proceso y negado, crea RPCs de aprobación/negación

-- 1. Agregar nuevos valores al enum credit_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'credit_status' AND e.enumlabel = 'en_proceso'
  ) THEN
    ALTER TYPE public.credit_status ADD VALUE 'en_proceso';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'credit_status' AND e.enumlabel = 'negado'
  ) THEN
    ALTER TYPE public.credit_status ADD VALUE 'negado';
  END IF;
END
$$;

-- 2. Modificar create_credit para que inicie como 'en_proceso'
CREATE OR REPLACE FUNCTION public.create_credit(
  p_client_id            uuid,
  p_device_id            uuid,
  p_imei                 text,
  p_financed_amount      numeric,
  p_initial_payment      numeric,
  p_installments_count   integer,
  p_start_date           date,
  p_interest_rate        numeric DEFAULT 0,
  p_device_value         numeric DEFAULT 0,
  p_device_reference_id  uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
  DECLARE
    v_credit_id uuid;
    v_number    text;
    v_base      numeric;
  BEGIN
    v_number := public.next_credit_number();
    v_base   := floor(p_financed_amount / p_installments_count);

    INSERT INTO public.credits (
      credit_number, client_id, device_id, device_reference_id, imei,
      financed_amount, initial_payment, balance,
      installments_count, installment_amount, start_date, end_date,
      status, interest_rate, device_value
    )
    VALUES (
      v_number, p_client_id, p_device_id, p_device_reference_id, p_imei,
      p_financed_amount, p_initial_payment,
      p_financed_amount,
      p_installments_count, v_base, p_start_date,
      (p_start_date + (p_installments_count || ' months')::interval)::date - 1,
      'en_proceso',
      coalesce(p_interest_rate, 0),
      coalesce(p_device_value, 0)
    )
    RETURNING id INTO v_credit_id;

    PERFORM public.generate_installments(
      v_credit_id, p_financed_amount, p_installments_count, p_start_date
    );
  END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_credit(
  uuid, uuid, text, numeric, numeric, integer, date, numeric, numeric, uuid
) TO authenticated;

-- 3. Actualizar recompute_credit_status para ignorar en_proceso y negado
CREATE OR REPLACE FUNCTION public.recompute_credit_status(p_credit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending int;
  v_overdue int;
  v_status  public.credit_status;
BEGIN
  SELECT status INTO v_status FROM public.credits WHERE id = p_credit_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- No tocar estados manuales
  IF v_status IN ('bloqueado', 'desbloqueado', 'finalizado', 'en_proceso', 'negado') THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_pending
    FROM public.installments
   WHERE credit_id = p_credit_id
     AND status IN ('pendiente', 'vencida');

  SELECT count(*) INTO v_overdue
    FROM public.installments
   WHERE credit_id = p_credit_id
     AND status = 'vencida';

  IF v_pending = 0 THEN
    UPDATE public.credits SET status = 'finalizado', updated_at = now() WHERE id = p_credit_id;
  ELSIF v_overdue > 0 THEN
    UPDATE public.credits SET status = 'en_mora', updated_at = now() WHERE id = p_credit_id;
  ELSE
    UPDATE public.credits SET status = 'activo', updated_at = now() WHERE id = p_credit_id;
  END IF;
END;
$$;

-- 4. RPC: Cambiar estado del crédito (genérico)
CREATE OR REPLACE FUNCTION public.change_credit_status(
  p_credit_id   uuid,
  p_new_status  public.credit_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.credit_status;
BEGIN
  SELECT status INTO v_current FROM public.credits WHERE id = p_credit_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crédito no encontrado';
  END IF;

  -- Validar transiciones permitidas
  IF v_current = 'en_proceso' AND p_new_status NOT IN ('activo', 'negado') THEN
    RAISE EXCEPTION 'Desde "en proceso" solo se puede aprobar o negar';
  END IF;

  IF v_current = 'negado' AND p_new_status != 'en_proceso' THEN
    RAISE EXCEPTION 'Desde "negado" solo se puede volver a "en proceso"';
  END IF;

  IF v_current = 'activo' AND p_new_status != 'en_proceso' THEN
    RAISE EXCEPTION 'Desde "activo" solo se puede volver a "en proceso"';
  END IF;

  IF v_current IN ('finalizado', 'bloqueado', 'desbloqueado') THEN
    RAISE EXCEPTION 'No se puede cambiar el estado de un crédito %', v_current;
  END IF;

  UPDATE public.credits
     SET status = p_new_status,
         approval_date = CASE
           WHEN p_new_status = 'negado' THEN NULL
           ELSE approval_date
         END,
         updated_at = now()
   WHERE id = p_credit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_credit_status(uuid, public.credit_status) TO authenticated;

-- 5. RPC: Aprobar crédito (setea approval_date, actualiza start_date, regenera cuotas)
CREATE OR REPLACE FUNCTION public.approve_credit(
  p_credit_id      uuid,
  p_approval_date  date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current        public.credit_status;
  v_financed       numeric;
  v_installments   int;
BEGIN
  SELECT status, financed_amount, installments_count
    INTO v_current, v_financed, v_installments
    FROM public.credits
   WHERE id = p_credit_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crédito no encontrado';
  END IF;

  IF v_current != 'en_proceso' THEN
    RAISE EXCEPTION 'Solo se pueden aprobar créditos en proceso';
  END IF;

  -- Actualizar crédito: estado, fecha de aprobación, start_date y end_date
  UPDATE public.credits
     SET status        = 'activo',
         approval_date = p_approval_date,
         start_date    = p_approval_date,
         end_date      = (p_approval_date + (v_installments || ' months')::interval)::date - 1,
         updated_at    = now()
   WHERE id = p_credit_id;

  -- Eliminar cuotas anteriores y regenerar desde la nueva fecha
  DELETE FROM public.installments WHERE credit_id = p_credit_id;

  PERFORM public.generate_installments(
    p_credit_id, v_financed, v_installments, p_approval_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_credit(uuid, date) TO authenticated;

-- 6. RPC: Actualizar fecha de aprobación de un crédito ya activo
--    Cambia approval_date, start_date, end_date y regenera cuotas
CREATE OR REPLACE FUNCTION public.update_approval_date(
  p_credit_id      uuid,
  p_approval_date  date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_financed     numeric;
  v_installments int;
BEGIN
  SELECT financed_amount, installments_count
    INTO v_financed, v_installments
    FROM public.credits
   WHERE id = p_credit_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crédito no encontrado';
  END IF;

  UPDATE public.credits
     SET approval_date = p_approval_date,
         start_date    = p_approval_date,
         end_date      = (p_approval_date + (v_installments || ' months')::interval)::date - 1,
         updated_at    = now()
   WHERE id = p_credit_id;

  DELETE FROM public.installments WHERE credit_id = p_credit_id;

  PERFORM public.generate_installments(
    p_credit_id, v_financed, v_installments, p_approval_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_approval_date(uuid, date) TO authenticated;
