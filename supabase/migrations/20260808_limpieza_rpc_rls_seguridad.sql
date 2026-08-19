-- ============================================================================
-- 20260808_limpieza_rpc_rls_seguridad.sql
-- Correcciones post-auditoría (BD real):
--   1. Eliminar RPC obsoletas (create_credit/update_credit/create_payment viejas
--      y refresh_overdue_installments(uuid)).
--   2. Recrear las RPC canónicas con UTF-8 correcto y SECURITY DEFINER,
--      conservando exactamente la lógica funcional actual.
--   3. Versionar las RPC de bloqueos (create_block, update_block_status,
--      create_unblock, update_unblock_status) con su SQL real extraído.
--   4. RLS por rol: agentes operan, admin para administrativas/borrados.
--      company_settings exclusivo para admin.
--   5. Revocar EXECUTE de PUBLIC/anon; dejar authenticated solo en las 8 RPC
--      que usa la aplicación.
--   7. Numeración unificada: create_credit usa next_credit_number()
--      (credit_number_seq), eliminando el count(*)+1. Se sincroniza la
--      secuencia con el máximo credit_number existente.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) Helper de rol admin (evita duplicar la subconsulta en cada policy)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) Eliminar RPC obsoletas (sin dependientes; verificado en auditoría)
-- ---------------------------------------------------------------------------
drop function if exists public.create_credit(
  uuid, uuid, text, numeric, numeric, integer, date
);

drop function if exists public.update_credit(
  uuid, uuid, uuid, text, numeric, numeric, integer, date
);

drop function if exists public.create_payment(
  uuid, uuid, public.payment_method, text, text
);

drop function if exists public.refresh_overdue_installments(uuid);

-- ---------------------------------------------------------------------------
-- 2) RPC canónicas recreadas con UTF-8 correcto y SECURITY DEFINER
-- ---------------------------------------------------------------------------

-- Numeración unificada (secuencia), con search_path explícito
create or replace function public.next_credit_number()
returns text
language plpgsql
set search_path = public
as $function$
  DECLARE
    seq_id BIGINT;
  BEGIN
    seq_id := nextval('credit_number_seq');
    RETURN 'CR-' || to_char(now(), 'YYYY') || '-' || lpad(seq_id::text, 4, '0');
  END;
$function$;

create or replace function public.create_credit(
  p_client_id uuid,
  p_device_id uuid,
  p_imei text,
  p_financed_amount numeric,
  p_initial_payment numeric,
  p_installments_count integer,
  p_start_date date,
  p_interest_rate numeric DEFAULT 0,
  p_device_value numeric DEFAULT 0
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
  declare
    v_credit_id uuid;
    v_number text;
    v_base numeric;
  begin
    v_number := public.next_credit_number();
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
$function$;

create or replace function public.update_credit(
  p_credit_id uuid,
  p_client_id uuid,
  p_device_id uuid,
  p_imei text,
  p_financed_amount numeric,
  p_initial_payment numeric,
  p_installments_count integer,
  p_start_date date,
  p_interest_rate numeric DEFAULT 0,
  p_device_value numeric DEFAULT 0
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
$function$;

create or replace function public.create_payment(
  p_credit_id uuid,
  p_installment_id uuid,
  p_method text,
  p_reference text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_amount numeric DEFAULT NULL::numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
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
$function$;

create or replace function public.delete_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
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
$function$;

-- ---------------------------------------------------------------------------
-- 3) RPC de bloqueos versionadas (SQL real extraído) + search_path + definer
-- ---------------------------------------------------------------------------
create or replace function public.create_block(
  p_client_id uuid,
  p_imei text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
  DECLARE
    v_block_id UUID;
  BEGIN
    INSERT INTO blocks (client_id, imei, reason, user_id, status)
    VALUES (p_client_id, p_imei, p_reason, auth.uid(), 'pendiente')
    RETURNING id INTO v_block_id;

    RETURN v_block_id;
  END;
$function$;

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
    SELECT status, imei INTO v_current, v_imei FROM blocks WHERE id = p_block_id;

    IF v_current IS NULL THEN
      RAISE EXCEPTION 'Solicitud de bloqueo no encontrada';
    END IF;

    IF v_current = 'confirmado' THEN
      RAISE EXCEPTION 'La solicitud ya fue confirmada';
    END IF;

    UPDATE blocks SET status = p_status WHERE id = p_block_id;

    IF p_status = 'confirmado' THEN
      UPDATE devices SET status = 'bloqueado'
      WHERE imei = v_imei AND deleted_at IS NULL;

      UPDATE credits SET status = 'bloqueado'
      WHERE imei = v_imei AND deleted_at IS NULL AND status IN ('activo', 'en_mora');
    END IF;

    RETURN p_block_id;
  END;
$function$;

create or replace function public.create_unblock(
  p_client_id uuid,
  p_imei text,
  p_payment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
  DECLARE
    v_unblock_id UUID;
  BEGIN
    INSERT INTO unblocks (client_id, imei, payment_id, user_id, status)
    VALUES (p_client_id, p_imei, p_payment_id, auth.uid(), 'pendiente')
    RETURNING id INTO v_unblock_id;

    RETURN v_unblock_id;
  END;
$function$;

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
  BEGIN
    SELECT status, imei INTO v_current, v_imei FROM unblocks WHERE id = p_unblock_id;

    IF v_current IS NULL THEN
      RAISE EXCEPTION 'Solicitud de desbloqueo no encontrada';
    END IF;

    IF v_current = 'confirmado' THEN
      RAISE EXCEPTION 'La solicitud ya fue confirmada';
    END IF;

    UPDATE unblocks SET status = p_status WHERE id = p_unblock_id;

    IF p_status = 'confirmado' THEN
      UPDATE devices SET status = 'desbloqueado'
      WHERE imei = v_imei AND deleted_at IS NULL;

      UPDATE credits SET status = 'desbloqueado'
      WHERE imei = v_imei AND deleted_at IS NULL AND status = 'bloqueado';
    END IF;

    RETURN p_unblock_id;
  END;
$function$;

-- ---------------------------------------------------------------------------
-- 4) RLS por rol
-- ---------------------------------------------------------------------------

-- Tablas operativas: agentes leen/insertan/actualizan; solo admin elimina
do $$
declare
  t text;
  pol record;
begin
  foreach t in array array[
    'clients', 'credits', 'installments', 'payments', 'devices',
    'blocks', 'unblocks', 'documents',
    'client_documents', 'credit_documents', 'document_records'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    for pol in
      select policyname from pg_policies
       where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;

    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select_auth', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', t || '_insert_auth', t);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', t || '_update_auth', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || '_delete_admin', t);
  end loop;
end
$$;

-- profiles: lectura para todos, administración solo admin
alter table public.profiles enable row level security;
drop policy if exists "Authenticated users full access" on public.profiles;
create policy profiles_select_auth on public.profiles
  for select to authenticated using (true);
create policy profiles_admin_insert on public.profiles
  for insert to authenticated with check (public.is_admin());
create policy profiles_admin_update on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy profiles_admin_delete on public.profiles
  for delete to authenticated using (public.is_admin());

-- company_settings: exclusivo para admin (los lectores del servidor usan
-- el rol service_role vía lib/supabase/admin.ts)
alter table public.company_settings enable row level security;
drop policy if exists "Authenticated users full access" on public.company_settings;
create policy company_settings_admin_select on public.company_settings
  for select to authenticated using (public.is_admin());
create policy company_settings_admin_insert on public.company_settings
  for insert to authenticated with check (public.is_admin());
create policy company_settings_admin_update on public.company_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy company_settings_admin_delete on public.company_settings
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5) Permisos de ejecución de funciones
-- ---------------------------------------------------------------------------

-- Solo las 8 RPC que usa la aplicación quedan ejecutables por authenticated.
-- Los helpers (generate_installments, next_payment_date, etc.) solo se
-- invocan internamente desde funciones SECURITY DEFINER.
revoke all on function public.create_credit(uuid, uuid, text, numeric, numeric, integer, date, numeric, numeric) from public, anon;
revoke all on function public.update_credit(uuid, uuid, uuid, text, numeric, numeric, integer, date, numeric, numeric) from public, anon;
revoke all on function public.create_payment(uuid, uuid, text, text, text, numeric) from public, anon;
revoke all on function public.delete_payment(uuid) from public, anon;
revoke all on function public.create_block(uuid, text, text) from public, anon;
revoke all on function public.update_block_status(uuid, block_status) from public, anon;
revoke all on function public.create_unblock(uuid, text, uuid) from public, anon;
revoke all on function public.update_unblock_status(uuid, block_status) from public, anon;

grant execute on function public.create_credit(uuid, uuid, text, numeric, numeric, integer, date, numeric, numeric) to authenticated;
grant execute on function public.update_credit(uuid, uuid, uuid, text, numeric, numeric, integer, date, numeric, numeric) to authenticated;
grant execute on function public.create_payment(uuid, uuid, text, text, text, numeric) to authenticated;
grant execute on function public.delete_payment(uuid) to authenticated;
grant execute on function public.create_block(uuid, text, text) to authenticated;
grant execute on function public.update_block_status(uuid, block_status) to authenticated;
grant execute on function public.create_unblock(uuid, text, uuid) to authenticated;
grant execute on function public.update_unblock_status(uuid, block_status) to authenticated;

-- is_admin() es invocada por las policies de RLS, por lo que el rol que
-- ejecuta el query necesita EXECUTE (devuelve solo un boolean; no expone datos).
grant execute on function public.is_admin() to authenticated;

-- Helpers no invocables por REST (solo vía definer-owner o service_role)
revoke all on function public.generate_installments(uuid, numeric, integer, date) from public, anon, authenticated;
revoke all on function public.next_payment_date(date) from public, anon, authenticated;
revoke all on function public.refresh_overdue_installments() from public, anon, authenticated;
revoke all on function public.recompute_credit_status(uuid) from public, anon, authenticated;
revoke all on function public.next_credit_number() from public, anon, authenticated;
revoke all on function public.handle_credit_created() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.update_updated_at_column() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Configuración pública de la empresa (lectura UI sin service_role).
--    company_settings quedó admin-only en RLS; esta función SECURITY DEFINER
--    devuelve SOLO los campos públicos + banderas de presencia, sin secretos.
--    La app la invoca como authenticated vía supabase.rpc().
-- ---------------------------------------------------------------------------
create or replace function public.get_company_settings_public()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
  declare
    v_row public.company_settings%rowtype;
  begin
    select * into v_row from public.company_settings order by created_at asc limit 1;

    if not found then
      return null;
    end if;

    return jsonb_build_object(
      'id', v_row.id,
      'name', v_row.name,
      'address', v_row.address,
      'city', v_row.city,
      'phone', v_row.phone,
      'email', v_row.email,
      'logo_url', v_row.logo_url,
      'telegram_chat_id', v_row.telegram_chat_id,
      'google_sheet_id', v_row.google_sheet_id,
      'google_script_url', v_row.google_script_url,
      'interest_rate', v_row.interest_rate,
      'created_at', v_row.created_at,
      'updated_at', v_row.updated_at,
      'has_telegram_token', coalesce(nullif(v_row.telegram_token, ''), '') <> '',
      'has_google_script_token', coalesce(nullif(v_row.google_script_token, ''), '') <> ''
    );
  end;
$function$;

grant execute on function public.get_company_settings_public() to authenticated;
revoke all on function public.get_company_settings_public() from public, anon;

-- ---------------------------------------------------------------------------
-- 7) Sincronizar secuencia de numeración con el máximo existente
--    (evita duplicar el número del próximo crédito)
-- ---------------------------------------------------------------------------
select setval(
  'public.credit_number_seq',
  (select coalesce(max(cast(split_part(credit_number, '-', 3) as integer)), 0)
     from public.credits
    where deleted_at is null),
  true
);

commit;
