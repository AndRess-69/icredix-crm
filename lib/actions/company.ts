"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/cache";
import {
  companySettingsSchema,
  googleSheetConfigSchema,
  type CompanySettingsValues,
  type GoogleSheetConfigValues,
} from "@/lib/validators/company";
import { getSheetConfig, pingSheet } from "@/lib/google/sheets";
import { syncAllToSheet, type SyncAllResult } from "@/lib/google/sync";
import { requireRole } from "@/lib/auth-guard";
import type { Database } from "@/types/database";

type CompanySettingsRow =
  Database["public"]["Tables"]["company_settings"]["Update"];

export interface ActionResult {
  success: boolean;
  error?: string;
}

function toNullable(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function updateCompanySettingsAction(
  values: CompanySettingsValues
): Promise<ActionResult> {
  const parsed = companySettingsSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const { data: rows } = await supabase
    .from("company_settings")
    .select("id")
    .limit(1);

  const settings: CompanySettingsRow = {
    name: data.name,
    address: toNullable(data.address),
    city: toNullable(data.city),
    phone: toNullable(data.phone),
    email: toNullable(data.email),
    telegram_chat_id: toNullable(data.telegram_chat_id),
    interest_rate: data.interest_rate,
  };

  const telegramToken = toNullable(data.telegram_token);
  if (telegramToken) settings.telegram_token = telegramToken;

  let error: { message: string } | null = null;

  if (rows?.[0]?.id) {
    const result = await supabase
      .from("company_settings")
      .update(settings)
      .eq("id", rows[0].id);
    error = result.error;
  } else {
    const result = await supabase.from("company_settings").insert(settings);
    error = result.error;
  }

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/configuracion");
  return { success: true };
}

function toOptional(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Guarda solo la configuración de Google Sheets (Web App de Apps Script).
 */
export async function updateGoogleSheetConfigAction(
  values: GoogleSheetConfigValues
): Promise<ActionResult> {
  const parsed = googleSheetConfigSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const { data: rows } = await supabase
    .from("company_settings")
    .select("id")
    .limit(1);

  const config: CompanySettingsRow = {
    google_script_url: toOptional(data.google_script_url),
  };

  const scriptToken = toOptional(data.google_script_token);
  if (scriptToken) config.google_script_token = scriptToken;

  if (rows?.[0]?.id) {
    const { error } = await supabase
      .from("company_settings")
      .update(config)
      .eq("id", rows[0].id);

    if (error) return { success: false, error: error.message };
  } else {
    const insertConfig: CompanySettingsRow = {
      name: "iCredix",
      google_script_url: toOptional(data.google_script_url),
    };
    if (scriptToken) insertConfig.google_script_token = scriptToken;

    const { error } = await supabase
      .from("company_settings")
      .insert(insertConfig);

    if (error) return { success: false, error: error.message };
  }

  cacheInvalidate("svc");
  revalidatePath("/configuracion");
  return { success: true };
}

/**
 * Prueba la conexión con el Web App de Google Sheets.
 */
export async function testGoogleSheetAction(): Promise<
  ActionResult & { spreadsheetTitle?: string }
> {
  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const config = await getSheetConfig();

  if (!config) {
    return {
      success: false,
      error: "Configura primero la URL del Web App de Google Sheets",
    };
  }

  try {
    const title = await pingSheet(config);
    return { success: true, spreadsheetTitle: title };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo conectar con la hoja de cálculo",
    };
  }
}

/**
 * Reconstruye las pestañas de la hoja con todo el historial.
 */
export async function syncAllToSheetAction(): Promise<SyncAllResult> {
  if (!(await requireRole(["admin"]))) {
    return { ok: false, error: "No autorizado" };
  }

  return syncAllToSheet();
}
