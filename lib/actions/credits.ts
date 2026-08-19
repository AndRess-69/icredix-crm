"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/cache";
import { sendTelegramMessage } from "@/lib/telegram";
import { escapeHtml } from "@/lib/telegram";
import { creditFormSchema, type CreditFormValues } from "@/lib/validators/credits";
import { syncApprovedCreditToSheet } from "@/lib/google/sync";
import { requireRole, requireUser } from "@/lib/auth-guard";
import type { Installment } from "@/types";
export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Obtiene las cuotas de un crédito (para el diálogo de consulta).
 */
export async function getCreditInstallmentsAction(
  creditId: string
): Promise<Installment[]> {
  if (!(await requireUser())) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("installments")
    .select("*")
    .eq("credit_id", creditId)
    .order("number", { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function createCreditAction(
  values: CreditFormValues
): Promise<ActionResult> {
  const parsed = creditFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const { data: settings } = await supabase.rpc("get_company_settings_public");

  const interestRate =
    ((settings as unknown as { interest_rate?: number | null } | null)
      ?.interest_rate) ?? 0;
  const total =
    interestRate > 0
      ? Math.round(data.financed_amount * (1 + interestRate / 100))
      : data.financed_amount;

  if (total <= data.initial_payment) {
    return {
      success: false,
      error:
        "La cuota inicial no puede ser mayor o igual al total a financiar (valor del equipo menos cuota inicial, más el interés)",
    };
  }

  const { error } = await supabase.rpc("create_credit", {
    p_client_id: data.client_id,
    p_device_id: data.device_id && data.device_id !== "none" ? data.device_id : null,
    p_imei: data.imei || null,
    p_financed_amount: total,
    p_initial_payment: data.initial_payment,
    p_installments_count: data.installments_count,
    p_start_date: data.start_date,
    p_interest_rate: interestRate,
    p_device_value: data.device_value,
    p_device_reference_id:
      data.device_reference_id && data.device_reference_id !== "none"
        ? data.device_reference_id
        : null,
  });

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/creditos");
  return { success: true };
}

export async function updateCreditAction(
  id: string,
  values: CreditFormValues
): Promise<ActionResult> {
  const parsed = creditFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const { data: credit } = await supabase
    .from("credits")
    .select("interest_rate")
    .eq("id", id)
    .maybeSingle();

  const interestRate = credit?.interest_rate ?? 0;

  const total =
    interestRate > 0
      ? Math.round(data.financed_amount * (1 + interestRate / 100))
      : data.financed_amount;

  if (total <= data.initial_payment) {
    return {
      success: false,
      error:
        "La cuota inicial no puede ser mayor o igual al total a financiar (valor del equipo menos cuota inicial, más el interés)",
    };
  }

  const { error } = await supabase.rpc("update_credit", {
    p_credit_id: id,
    p_client_id: data.client_id,
    p_device_id: data.device_id && data.device_id !== "none" ? data.device_id : null,
    p_imei: data.imei || null,
    p_financed_amount: total,
    p_initial_payment: data.initial_payment,
    p_installments_count: data.installments_count,
    p_start_date: data.start_date,
    p_interest_rate: interestRate,
    p_device_value: data.device_value,
    p_device_reference_id:
      data.device_reference_id && data.device_reference_id !== "none"
        ? data.device_reference_id
        : null,
  });

  if (error) return { success: false, error: error.message };

  if (data.approval_date && data.approval_date.trim() !== "") {
    const { error: approvalError } = await supabase.rpc("update_approval_date", {
      p_credit_id: id,
      p_approval_date: data.approval_date,
    });
    if (approvalError) return { success: false, error: approvalError.message };
  }

  cacheInvalidate("svc");
  revalidatePath("/creditos");
  return { success: true };
}

export async function deleteCreditAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase
    .from("credits")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/creditos");
  return { success: true };
}

/**
 * Aprueba un crédito: cambia estado a 'activo', setea approval_date,
 * actualiza start_date y regenera cuotas desde esa fecha.
 * Notifica por Telegram y sincroniza a Google Sheets.
 */
export async function approveCreditAction(
  id: string,
  approvalDate?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const dateStr = approvalDate || new Date().toISOString().slice(0, 10);

  const { data: credit, error: fetchError } = await supabase
    .from("credits")
    .select(
      "credit_number, imei, status, client:clients(first_name, last_name, cedula)"
    )
    .eq("id", id)
    .single();

  if (fetchError || !credit) {
    return { success: false, error: "Crédito no encontrado" };
  }

  if (credit.status !== "en_proceso") {
    return { success: false, error: "Solo se pueden aprobar créditos en proceso" };
  }

  const { error: rpcError } = await supabase.rpc("approve_credit", {
    p_credit_id: id,
    p_approval_date: dateStr,
  });

  if (rpcError) return { success: false, error: rpcError.message };

  const { data: firstInstallment } = await supabase
    .from("installments")
    .select("due_date")
    .eq("credit_id", id)
    .order("number", { ascending: true })
    .limit(1)
    .maybeSingle();

  const clientName = credit.client
    ? `${credit.client.first_name} ${credit.client.last_name}`
    : "—";
  const cedula = credit.client?.cedula ?? "—";
  const firstDue = firstInstallment?.due_date
    ? format(new Date(`${firstInstallment.due_date}T00:00:00`), "dd/MM/yyyy")
    : "—";

  await sendTelegramMessage(
    `✅ <b>Crédito aprobado</b>\n👤 Cliente: ${escapeHtml(clientName)}\n🆔 CC: ${escapeHtml(cedula)}\n🧾 Referencia: ${escapeHtml(credit.credit_number)}\n📱 IMEI: ${escapeHtml(credit.imei)}\n📅 Aprobado: ${escapeHtml(dateStr)}\n📅 Primer pago: ${escapeHtml(firstDue)}`
  );

  await syncApprovedCreditToSheet(id);

  cacheInvalidate("svc");
  revalidatePath("/creditos");
  return { success: true };
}

/**
 * Niega un crédito: cambia estado a 'negado'.
 */
export async function denyCreditAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase.rpc("change_credit_status", {
    p_credit_id: id,
    p_new_status: "negado",
  });

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/creditos");
  return { success: true };
}

/**
 * Marca un crédito como "en proceso".
 */
export async function markInProgressCreditAction(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase.rpc("change_credit_status", {
    p_credit_id: id,
    p_new_status: "en_proceso",
  });

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/creditos");
  return { success: true };
}

/**
 * Registra el IMEI de un crédito cuando el equipo ya fue adquirido/asignado.
 * Actualiza credits.imei y, si el crédito tiene equipo asociado, también el
 * IMEI del registro de inventario (solo si este aún no tiene uno).
 */
export async function registerCreditImeiAction(
  creditId: string,
  imei: string
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = z
    .string()
    .trim()
    .regex(/^\d{15}$/, "El IMEI debe tener exactamente 15 dígitos")
    .safeParse(imei);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const value = parsed.data;

  const { data: credit } = await supabase
    .from("credits")
    .select("id, client_id, device_id")
    .eq("id", creditId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!credit) {
    return { success: false, error: "El crédito no existe" };
  }

  const { error } = await supabase
    .from("credits")
    .update({ imei: value, updated_at: new Date().toISOString() })
    .eq("id", creditId);

  if (error) return { success: false, error: error.message };

  if (credit.device_id) {
    await supabase
      .from("devices")
      .update({ imei: value, updated_at: new Date().toISOString() })
      .eq("id", credit.device_id)
      .is("imei", null);
  }

  cacheInvalidate("svc");
  revalidatePath(`/clientes/${credit.client_id}`);
  revalidatePath("/creditos");
  revalidatePath("/equipos");
  return { success: true };
}

/**
 * Asocia un equipo del inventario (disponible) a un crédito existente.
 * Actualiza credits.device_id y credits.imei con el IMEI del equipo y deja
 * el equipo como "asignado" para que no vuelva a ofrecerse en el inventario.
 */
export async function assignDeviceToCreditAction(
  creditId: string,
  deviceId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = z
    .object({
      creditId: z.string().uuid("Crédito inválido"),
      deviceId: z.string().uuid("Equipo inválido"),
    })
    .safeParse({ creditId, deviceId });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { creditId: parsedCreditId, deviceId: parsedDeviceId } = parsed.data;

  const { data: credit } = await supabase
    .from("credits")
    .select("id, client_id, device_id")
    .eq("id", parsedCreditId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!credit) {
    return { success: false, error: "El crédito no existe" };
  }

  const { data: device } = await supabase
    .from("devices")
    .select("id, imei, status")
    .eq("id", parsedDeviceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!device) {
    return { success: false, error: "El equipo no existe" };
  }

  if (device.status !== "disponible") {
    return { success: false, error: "El equipo no está disponible en el inventario" };
  }

  const { error } = await supabase
    .from("credits")
    .update({
      device_id: parsedDeviceId,
      imei: device.imei ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsedCreditId);

  if (error) return { success: false, error: error.message };

  await supabase
    .from("devices")
    .update({ status: "asignado", updated_at: new Date().toISOString() })
    .eq("id", parsedDeviceId);

  cacheInvalidate("svc");
  revalidatePath(`/clientes/${credit.client_id}`);
  revalidatePath("/creditos");
  revalidatePath("/equipos");
  return { success: true };
}

/**
 * Asocia una referencia de equipo a un crédito existente.
 * Actualiza credits.device_reference_id.
 */
export async function assignDeviceReferenceToCreditAction(
  creditId: string,
  deviceReferenceId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = z
    .object({
      creditId: z.string().uuid("Crédito inválido"),
      deviceReferenceId: z.string().uuid("Referencia inválida"),
    })
    .safeParse({ creditId, deviceReferenceId });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { creditId: parsedCreditId, deviceReferenceId: parsedRefId } = parsed.data;

  const { data: credit } = await supabase
    .from("credits")
    .select("id, client_id")
    .eq("id", parsedCreditId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!credit) {
    return { success: false, error: "El crédito no existe" };
  }

  const { data: ref } = await supabase
    .from("device_references")
    .select("id")
    .eq("id", parsedRefId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!ref) {
    return { success: false, error: "La referencia no existe" };
  }

  const { error } = await supabase
    .from("credits")
    .update({
      device_reference_id: parsedRefId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsedCreditId);

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath(`/clientes/${credit.client_id}`);
  revalidatePath("/creditos");
  return { success: true };
}
