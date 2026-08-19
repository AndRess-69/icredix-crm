-- =============================================================================
-- Expediente del cliente (fase 2: Clientes + Créditos + Equipos + Documentos)
-- SOLO cambios aditivos. No borra ni altera datos existentes.
-- No se tocan RPC de créditos/pagos (create_credit/update_credit insertan
-- imei = p_imei; con la columna nullable aceptan NULL sin cambiar su cuerpo).
-- =============================================================================

-- 1) IMEI/capacidad/color opcionales (se registran cuando el equipo existe)
alter table public.credits alter column imei drop not null;
alter table public.devices alter column imei drop not null;
alter table public.devices alter column capacity drop not null;
alter table public.devices alter column color drop not null;

-- 2) Equipo: fechas de ciclo de vida e IMEI secundario
alter table public.devices add column if not exists imei2 text;
alter table public.devices add column if not exists purchase_date date;
alter table public.devices add column if not exists delivery_date date;

-- 3) Estados de equipo ampliados (aditivo al enum device_status actual)
alter type public.device_status add value if not exists 'pendiente_asignacion';
alter type public.device_status add value if not exists 'comprado';
alter type public.device_status add value if not exists 'asignado';
alter type public.device_status add value if not exists 'devuelto';

-- 4) Solicitud / validación del cliente (estudio)
create type public.client_validation_status as enum (
  'pendiente', 'en_estudio', 'aprobado', 'rechazado'
);

alter table public.clients
  add column if not exists validation_status public.client_validation_status
    not null default 'pendiente',
  add column if not exists request_date date,
  add column if not exists approval_date timestamptz,
  add column if not exists validation_result text,
  add column if not exists validation_notes text;

-- 5) Documentos del cliente organizados (extiende client_documents existente)
alter table public.client_documents
  add column if not exists doc_type text,
  add column if not exists notes text,
  add column if not exists created_by uuid references public.profiles (id),
  add column if not exists credit_id uuid references public.credits (id);
