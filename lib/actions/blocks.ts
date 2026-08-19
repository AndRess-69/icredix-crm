"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/cache";
import {
  blockFormSchema,
  unblockFormSchema,
  type BlockFormValues,
  type UnblockFormValues,
} from "@/lib/validators/blocks";
import { sendTelegramMessage } from "@/lib/telegram";
import { escapeHtml } from "@/lib/telegram";
import { syncBlockToSheet, syncUnblockToSheet } from "@/lib/google/sync";
import { requireUser } from "@/lib/auth-guard";
import { getClientCredits } from "@/services/blockService";
import type { BlockStatus, ClientCreditDetail } from "@/types";
import type { Json } from "@/types/database";

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Obtiene el IMEI del crédito activo más reciente del cliente (para
 * autocompletar el campo IMEI en los formularios de bloqueo/desbloqueo).
 */
export async function getClientActiveImeiAction(
  clientId: string
): Promise<string | null> {
  if (!(await requireUser())) return null;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("credits")
    .select("imei")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .neq("status", "finalizado")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.imei;
}

async function notifyBlockConfirmed(blockId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("imei, reason, client:clients(first_name, last_name, cedula)")
    .eq("id", blockId)
    .single();

  if (!data) return;

  const clientName = data.client
    ? `${data.client.first_name} ${data.client.last_name}`
    : "—";

  await sendTelegramMessage(
    `🔒 <b>Bloqueo confirmado</b>\n👤 Cliente: ${escapeHtml(clientName)}\n📱 IMEI: ${escapeHtml(data.imei)}\n📝 Motivo: ${escapeHtml(data.reason)}`
  );
}

export async function getClientCreditsAction(
  clientId: string
): Promise<ClientCreditDetail[]> {
  if (!(await requireUser())) return [];
  return getClientCredits(clientId);
}

async function notifyUnblockConfirmed(unblockId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("unblocks")
    .select("imei, client:clients(first_name, last_name, cedula)")
    .eq("id", unblockId)
    .single();

  if (!data) return;

  const clientName = data.client
    ? `${data.client.first_name} ${data.client.last_name}`
    : "—";

  await sendTelegramMessage(
    `🔓 <b>Desbloqueo confirmado</b>\n👤 Cliente: ${escapeHtml(clientName)}\n📱 IMEI: ${escapeHtml(data.imei)}`
  );
}

export async function createBlockAction(
  values: BlockFormValues
): Promise<ActionResult> {
  const parsed = blockFormSchema.safeParse(values);

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

  const creditId = data.credit_id ? data.credit_id : null;

  const { error } = await supabase.rpc("create_block", {
    p_client_id: data.client_id,
    p_imei: data.imei,
    p_reason: data.reason,
    p_phone_line: data.phone_line ? data.phone_line : null,
    p_diagnoses: data.diagnoses ? data.diagnoses : null,
    p_credit_id: creditId,
    p_device_id: data.device_id ? data.device_id : null,
    p_encargo_bloqueos_json: data.encargo_bloqueos_json
      ? (data.encargo_bloqueos_json as unknown as Json)
      : null,
  });

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/bloqueos");
  return { success: true };
}

export async function updateBlockStatusAction(
  id: string,
  status: BlockStatus
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase.rpc("update_block_status", {
    p_block_id: id,
    p_status: status,
  });

  if (error) return { success: false, error: error.message };

  if (status === "confirmado") {
    await notifyBlockConfirmed(id);
    await syncBlockToSheet(id);
  }

  cacheInvalidate("svc");
  revalidatePath("/bloqueos");
  revalidatePath("/equipos");
  revalidatePath("/creditos");
  return { success: true };
}

export async function createUnblockAction(
  values: UnblockFormValues
): Promise<ActionResult> {
  const parsed = unblockFormSchema.safeParse(values);

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

  const { error } = await supabase.rpc("create_unblock", {
    p_client_id: data.client_id,
    p_imei: data.imei,
    p_payment_id: data.payment_id ? data.payment_id : null,
    p_unblock_reason: data.unblock_reason ? data.unblock_reason : null,
    p_phone_line: data.phone_line ? data.phone_line : null,
    p_diagnoses: data.diagnoses ? data.diagnoses : null,
    p_credit_id: data.credit_id ? data.credit_id : null,
    p_device_id: data.device_id ? data.device_id : null,
  });

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/bloqueos");
  return { success: true };
}

export async function updateUnblockStatusAction(
  id: string,
  status: BlockStatus
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase.rpc("update_unblock_status", {
    p_unblock_id: id,
    p_status: status,
  });

  if (error) return { success: false, error: error.message };

  if (status === "confirmado") {
    await notifyUnblockConfirmed(id);
    await syncUnblockToSheet(id);
  }

  cacheInvalidate("svc");
  revalidatePath("/bloqueos");
  revalidatePath("/equipos");
  revalidatePath("/creditos");
  return { success: true };
}
