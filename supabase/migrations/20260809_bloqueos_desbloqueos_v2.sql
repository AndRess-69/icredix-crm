-- ============================================================================
-- 20260809_bloqueos_desbloqueos_v2.sql
-- Bloqueos/Desbloqueos v2:
--   1. Nuevas columnas tipadas en blocks y unblocks: phone_line, diagnoses,
--      unblock_reason, credit_id (FK), device_id (FK), blocked_by (FK).
--   2. encargo_bloqueos_json: único campo JSON con los datos del encargo de
--      bloqueo (comisión/orden enviada al proveedor).
--   3. unblock_responses: tabla de respuestas de desbloqueo (BD BRAND/carrier)
--      con RLS por rol, + índices de relación.
--   4. Restaurar en vez de borrar: al confirmar un desbloqueo el equipo se
--      restaura (status 'desbloqueado', deleted_at = null) aunque hubiera sido
--      marcado como eliminado.
--   5. Unicidad: una única solicitud de bloqueo activa (pendiente/enviado) por
--      IMEI, validada dentro de create_block/create_unblock.
--   6. Los créditos conservan su estado financiero: YA NO se toca
--      credits.status en bloqueo/desbloqueo.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Columnas adicionales en blocks
-- ---------------------------------------------------------------------------
alter table public.blocks
  add column if not exists phone_line text,
  add column if not exists diagnoses text,
  add column if not exists credit_id uuid references public.credits(id) on delete set null,
  add column if not exists device_id uuid references public.devices(id) on delete set null,
  add column if not exists blocked_by uuid references public.profiles(id) on delete set null,
  add column if not exists encargo_bloqueos_json jsonb;

-- ---------------------------------------------------------------------------
-- 2) Columnas adicionales en unblocks
-- ---------------------------------------------------------------------------
alter table public.unblocks
  add column if not exists unblock_reason text,
  add column if not exists phone_line text,
  add column if not exists diagnoses text,
  add column if not exists credit_id uuid references public.credits(id) on delete set null,
  add column if not exists device_id uuid references public.devices(id) on delete set null,
  add column if not exists blocked_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_blocks_credit_id on public.blocks(credit_id);
create index if not exists idx_blocks_device_id on public.blocks(device_id);
create index if not exists idx_unblocks_credit_id on public.unblocks(credit_id);
create index if not exists idx_unblocks_device_id on public.unblocks(device_id);

-- ---------------------------------------------------------------------------
-- 3) Respuestas de desbloqueo (tabla tipada, RLS por rol)
-- ---------------------------------------------------------------------------
create table if not exists public.unblock_responses (
  id uuid primary key default gen_random_uuid(),
  unblock_id uuid not null references public.unblocks(id) on delete cascade,
  response_type text not null check (response_type in ('brand', 'carrier', 'internal')),
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.unblock_responses enable row level security;

drop policy if exists unblock_responses_select_auth on public.unblock_responses;
create policy unblock_responses_select_auth on public.unblock_responses
  for select to authenticated using (true);
drop policy if exists unblock_responses_insert_auth on public.unblock_responses;
create policy unblock_responses_insert_auth on public.unblock_responses
  for insert to authenticated with check (true);
drop policy if exists unblock_responses_update_auth on public.unblock_responses;
create policy unblock_responses_update_auth on public.unblock_responses
  for update to authenticated using (true) with check (true);
drop policy if exists unblock_responses_delete_admin on public.unblock_responses;
create policy unblock_responses_delete_admin on public.unblock_responses
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4) RPC create_block v2
--    Acepta las nuevas columnas; mantiene compatibilidad con los 3 parámetros
--    originales mediante DEFAULT. Rechaza solicitudes duplicadas activas por
--    IMEI (encargo único). NO modifica credits.status (estado financiero).
-- ---------------------------------------------------------------------------
create or replace function public.create_block(
  p_client_id uuid,
  p_imei text,
  p_reason text,
  p_phone_line text default null,
  p_diagnoses text default null,
  p_credit_id uuid default null,
  p_device_id uuid default null,
  p_encargo_bloqueos_json jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
  DECLARE
    v_block_id UUID;
  BEGIN
    IF exists (
      select 1 from public.blocks
       where imei = p_imei and status in ('pendiente', 'enviado')
    ) then
      RAISE EXCEPTION 'Ya existe una solicitud de bloqueo activa para este IMEI';
    END IF;

    INSERT INTO public.blocks (
      client_id, imei, reason, phone_line, diagnoses,
      credit_id, device_id, user_id, blocked_by, status, encargo_bloqueos_json
    )
    VALUES (
      p_client_id, p_imei, p_reason, p_phone_line, p_diagnoses,
      p_credit_id, p_device_id, auth.uid(), auth.uid(), 'pendiente',
      p_encargo_bloqueos_json
    )
    RETURNING id INTO v_block_id;

    RETURN v_block_id;
  END;
$function$;

-- ---------------------------------------------------------------------------
-- 5) RPC create_unblock v2
-- ---------------------------------------------------------------------------
create or replace function public.create_unblock(
  p_client_id uuid,
  p_imei text,
  p_payment_id uuid default null,
  p_unblock_reason text default null,
  p_phone_line text default null,
  p_diagnoses text default null,
  p_credit_id uuid default null,
  p_device_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
  DECLARE
    v_unblock_id UUID;
  BEGIN
    IF exists (
      select 1 from public.unblocks
       where imei = p_imei and status in ('pendiente', 'enviado')
    ) then
      RAISE EXCEPTION 'Ya existe una solicitud de desbloqueo activa para este IMEI';
    END IF;

    INSERT INTO public.unblocks (
      client_id, imei, payment_id, unblock_reason, phone_line,
      diagnoses, credit_id, device_id, user_id, blocked_by, status
    )
    VALUES (
      p_client_id, p_imei, p_payment_id, p_unblock_reason, p_phone_line,
      p_diagnoses, p_credit_id, p_device_id, auth.uid(), auth.uid(), 'pendiente'
    )
    RETURNING id INTO v_unblock_id;

    RETURN v_unblock_id;
  END;
$function$;

-- ---------------------------------------------------------------------------
-- 6) update_block_status v2
--    Al confirmar: el equipo pasa a 'bloqueado' (operativo). El crédito
--    CONSERVA su estado financiero (no se modifica credits.status).
--    Se registra blocked_by con el usuario que ejecutó la confirmación.
-- ---------------------------------------------------------------------------
create or replace function public.update_block_status(
  p_block_id uuid,
  p_status block_status
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
  DECLARE
    v_current block_status;
    v_imei TEXT;
  BEGIN
    SELECT status, imei INTO v_current, v_imei FROM public.blocks WHERE id = p_block_id;

    IF v_current IS NULL THEN
      RAISE EXCEPTION 'Solicitud de bloqueo no encontrada';
    END IF;

    IF v_current = 'confirmado' THEN
      RAISE EXCEPTION 'La solicitud ya fue confirmada';
    END IF;

    UPDATE public.blocks
       SET status = p_status,
           blocked_by = auth.uid(),
           updated_at = now()
     WHERE id = p_block_id;

    IF p_status = 'confirmado' THEN
      UPDATE public.devices
         SET status = 'bloqueado', updated_at = now()
       WHERE imei = v_imei AND deleted_at IS NULL;
    END IF;

    RETURN p_block_id;
  END;
$function$;

-- ---------------------------------------------------------------------------
-- 7) update_unblock_status v2
--    Al confirmar: el equipo se RESTAURA (status 'desbloqueado', deleted_at=null)
--    en lugar de borrarse físicamente. Se registra la respuesta en la BD BRAND
--    (unblock_responses) con los diagnósticos. El crédito CONSERVA su estado
--    financiero (no se modifica credits.status).
-- ---------------------------------------------------------------------------
create or replace function public.update_unblock_status(
  p_unblock_id uuid,
  p_status block_status
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
  DECLARE
    v_current block_status;
    v_imei TEXT;
    v_diagnoses text;
    v_id UUID;
  BEGIN
    SELECT status, imei, diagnoses INTO v_current, v_imei, v_diagnoses
      FROM public.unblocks WHERE id = p_unblock_id;

    IF v_current IS NULL THEN
      RAISE EXCEPTION 'Solicitud de desbloqueo no encontrada';
    END IF;

    IF v_current = 'confirmado' THEN
      RAISE EXCEPTION 'La solicitud ya fue confirmada';
    END IF;

    UPDATE public.unblocks
       SET status = p_status,
           blocked_by = auth.uid(),
           updated_at = now()
     WHERE id = p_unblock_id;

    IF p_status = 'confirmado' THEN
      UPDATE public.devices
         SET status = 'desbloqueado', deleted_at = null, updated_at = now()
       WHERE imei = v_imei;

      INSERT INTO public.unblock_responses (unblock_id, response_type, message)
      VALUES (
        p_unblock_id,
        'brand',
        'Desbloqueo confirmado; diagnósticos registrados en BD BRAND'
      ) RETURNING id INTO v_id;

      IF v_diagnoses is not null and v_diagnoses <> '' THEN
        INSERT INTO public.unblock_responses (unblock_id, response_type, message)
        VALUES (p_unblock_id, 'brand', v_diagnoses);
      END IF;
    END IF;

    RETURN p_unblock_id;
  END;
$function$;

-- ---------------------------------------------------------------------------
-- 8) Permisos de ejecución (firmas completas con los nuevos parámetros)
-- ---------------------------------------------------------------------------
revoke all on function public.create_block(uuid, text, text, text, text, uuid, uuid, jsonb) from public, anon;
revoke all on function public.update_block_status(uuid, block_status) from public, anon;
revoke all on function public.create_unblock(uuid, text, uuid, text, text, text, uuid, uuid) from public, anon;
revoke all on function public.update_unblock_status(uuid, block_status) from public, anon;

grant execute on function public.create_block(uuid, text, text, text, text, uuid, uuid, jsonb) to authenticated;
grant execute on function public.update_block_status(uuid, block_status) to authenticated;
grant execute on function public.create_unblock(uuid, text, uuid, text, text, text, uuid, uuid) to authenticated;
grant execute on function public.update_unblock_status(uuid, block_status) to authenticated;

commit;