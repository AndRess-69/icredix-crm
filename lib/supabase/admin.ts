import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase con rol service_role (server-only).
 * Bypass de RLS: se usa ÚNICAMENTE para leer datos que las policies de RLS
 * restringen (p. ej. company_settings, que quedó exclusivo para admin).
 * Nunca debe exponerse al navegador ni usarse en componentes de cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está configurada. Agrega la service_role key en .env.local"
    );
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
