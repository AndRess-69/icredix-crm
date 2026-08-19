-- =============================================================================
-- Migración: Índices de rendimiento para consultas frecuentes
-- Fecha: 2026-08-19
-- Descripción: Agrega índices en columnas consultadas frecuentemente para
--              reducir full table scans y mejorar tiempos de respuesta.
-- =============================================================================

-- ─── credits ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_credits_client_id
  ON public.credits (client_id);

CREATE INDEX IF NOT EXISTS idx_credits_status
  ON public.credits (status);

CREATE INDEX IF NOT EXISTS idx_credits_deleted_at
  ON public.credits (id) WHERE deleted_at IS NULL;

-- ─── installments ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_installments_credit_id
  ON public.installments (credit_id);

CREATE INDEX IF NOT EXISTS idx_installments_status
  ON public.installments (status);

CREATE INDEX IF NOT EXISTS idx_installments_credit_status
  ON public.installments (credit_id, status);

-- ─── payments ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_credit_id
  ON public.payments (credit_id);

CREATE INDEX IF NOT EXISTS idx_payments_installment_id
  ON public.payments (installment_id);

CREATE INDEX IF NOT EXISTS idx_payments_created_at
  ON public.payments (created_at);

CREATE INDEX IF NOT EXISTS idx_payments_deleted_at
  ON public.payments (id) WHERE deleted_at IS NULL;

-- ─── devices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_devices_status
  ON public.devices (status);

CREATE INDEX IF NOT EXISTS idx_devices_imei
  ON public.devices (imei) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_devices_deleted_at
  ON public.devices (id) WHERE deleted_at IS NULL;

-- ─── blocks ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_blocks_imei_active
  ON public.blocks (imei) WHERE status IN ('pendiente', 'enviado');

-- ─── unblocks ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_unblocks_imei_active
  ON public.unblocks (imei) WHERE status IN ('pendiente', 'enviado');

-- ─── clients ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at
  ON public.clients (id) WHERE deleted_at IS NULL;
