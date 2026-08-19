-- =============================================================
-- iCredix · Google Sheets como segunda base de datos (backup)
-- (ejecutar en SQL Editor, una sola vez)
-- 1. google_sheet_id: ID de la hoja de cálculo de Google
-- 2. google_service_account_json: credenciales JSON de la cuenta
--    de servicio con acceso a la hoja
-- =============================================================

alter table public.company_settings
  add column if not exists google_sheet_id text,
  add column if not exists google_service_account_json text;
