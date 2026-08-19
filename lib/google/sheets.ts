import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Configuración del Web App de Apps Script (Google Sheets).
 */
export interface SheetConfig {
  scriptUrl: string;
  token: string;
}

/**
 * Lee la configuración de Google Sheets guardada en company_settings.
 * Devuelve null si no está configurada.
 *
 * Prioriza el service_role (funciona para cualquier rol); si la
 * SUPABASE_SERVICE_ROLE_KEY no está configurada, cae al cliente de sesión
 * (requiere rol admin por RLS, que es quien invoca la mayoría de síncronos).
 */
export async function getSheetConfig(): Promise<SheetConfig | null> {
  let row: {
    google_script_url: string | null;
    google_script_token: string | null;
  } | null = null;

  try {
    const { data } = await createAdminClient()
      .from("company_settings")
      .select("google_script_url, google_script_token")
      .limit(1)
      .maybeSingle();
    row = data;
  } catch {
    const { data } = await (await createClient())
      .from("company_settings")
      .select("google_script_url, google_script_token")
      .limit(1)
      .maybeSingle();
    row = data;
  }

  if (!row?.google_script_url) return null;

  return {
    scriptUrl: row.google_script_url,
    token: row.google_script_token ?? "",
  };
}

/**
 * Envía un payload JSON al Web App de Apps Script y valida la respuesta.
 */
export async function postToSheet(
  config: SheetConfig,
  payload: Record<string, unknown>
): Promise<{ ok: true } & Record<string, unknown>> {
  const response = await fetch(config.scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, token: config.token }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`La hoja respondió con estado ${response.status}`);
  }

  const data = (await response.json()) as {
    ok: boolean;
    error?: string;
  } & Record<string, unknown>;

  if (!data.ok) {
    throw new Error(data.error ?? "La hoja rechazó la escritura");
  }

  return data as { ok: true } & Record<string, unknown>;
}

/**
 * Agrega filas al final de una pestaña (crea pestaña y encabezados si faltan).
 */
export async function appendRowsToTab(
  config: SheetConfig,
  tab: string,
  headers: (string | number)[],
  rows: (string | number)[][]
): Promise<void> {
  if (rows.length === 0) return;

  await postToSheet(config, { action: "append", tab, headers, rows });
}

/**
 * Reemplaza por completo una pestaña (limpia y escribe encabezados + filas).
 */
export async function overwriteTab(
  config: SheetConfig,
  tab: string,
  headers: (string | number)[],
  rows: (string | number)[][]
): Promise<void> {
  await postToSheet(config, { action: "overwrite", tab, headers, rows });
}

/**
 * Prueba la conexión con el Web App y devuelve el título de la hoja.
 */
export async function pingSheet(config: SheetConfig): Promise<string> {
  const data = await postToSheet(config, { action: "ping" });
  return (data.title as string | undefined) ?? "Sin título";
}
