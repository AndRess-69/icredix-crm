-- =============================================================
-- iCredix · Google Sheets backup vía Apps Script
-- (ejecutar en SQL Editor, una sola vez)
-- 1. google_script_url: URL del Web App desplegado desde el
--    script de la hoja (Apps Script)
-- 2. google_script_token: token secreto compartido con el script
-- =============================================================

alter table public.company_settings
  add column if not exists google_script_url text,
  add column if not exists google_script_token text;
