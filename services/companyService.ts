import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";
import type { CompanySettingsPublic, Profile } from "@/types";

/**
 * Obtiene la configuración de la empresa (registro único) sin secretos.
 * Se lee vía RPC get_company_settings_public() (SECURITY DEFINER): RLS dejó
 * company_settings solo para admin, por lo que el servidor usa esta función
 * que devuelve únicamente los campos públicos + banderas de presencia.
 * Nunca devuelve telegram_token, google_script_token ni
 * google_service_account_json.
 */
export async function getCompanySettings(): Promise<CompanySettingsPublic | null> {
  return withCache("svc:company-settings", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_company_settings_public");

    if (error || !data) return null;
    return data as unknown as CompanySettingsPublic;
  });
}

/**
 * Obtiene los perfiles de usuario activos.
 */
export async function getProfiles(): Promise<Profile[]> {
  return withCache("svc:profiles", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error || !data) return [];
    return data;
  });
}
