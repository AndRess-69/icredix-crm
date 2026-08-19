"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/cache";
import { clientSchema, type ClientFormValues } from "@/lib/validators/clients";
import {
  clientValidationSchema,
  type ClientValidationFormValues,
} from "@/lib/validators/clients";
import { syncClientToSheet } from "@/lib/google/sync";
import { requireRole, requireUser } from "@/lib/auth-guard";
import type { ClientDetail } from "@/types";

export interface ActionResult {
  success: boolean;
  error?: string;
}

function toNullable(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapInsertError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    return "Ya existe un cliente con esa cédula";
  }
  return error.message;
}

export async function createClientAction(
  values: ClientFormValues
): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(values);

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

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      first_name: data.first_name,
      last_name: data.last_name,
      cedula: data.cedula,
      phone: data.phone,
      email: toNullable(data.email),
      address: toNullable(data.address),
      city: toNullable(data.city),
      birth_date: toNullable(data.birth_date),
      notes: toNullable(data.notes),
      request_date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (error) return { success: false, error: mapInsertError(error) };

  await syncClientToSheet(created.id);

  cacheInvalidate("svc");
  revalidatePath("/clientes");
  return { success: true };
}

export async function updateClientAction(
  id: string,
  values: ClientFormValues
): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(values);

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

  const { error } = await supabase
    .from("clients")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      cedula: data.cedula,
      phone: data.phone,
      email: toNullable(data.email),
      address: toNullable(data.address),
      city: toNullable(data.city),
      birth_date: toNullable(data.birth_date),
      notes: toNullable(data.notes),
    })
    .eq("id", id);

  if (error) return { success: false, error: mapInsertError(error) };

  cacheInvalidate("svc");
  revalidatePath("/clientes");
  return { success: true };
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/clientes");
  return { success: true };
}

/**
 * Actualiza la solicitud / validación (estudio) de un cliente.
 * Al aprobar se registra la fecha de aprobación automáticamente.
 */
export async function updateClientValidationAction(
  id: string,
  values: ClientValidationFormValues
): Promise<ActionResult> {
  const parsed = clientValidationSchema.safeParse(values);

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

  const { error } = await supabase
    .from("clients")
    .update({
      validation_status: data.status,
      request_date: toNullable(data.request_date),
      validation_result: toNullable(data.result),
      validation_notes: toNullable(data.notes),
      approval_date:
        data.status === "aprobado" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  return { success: true };
}

/**
 * Obtiene el detalle completo de un cliente: datos, créditos, cuotas
 * pendientes y pagos realizados.
 */
export async function getClientDetailAction(
  clientId: string
): Promise<ClientDetail | null> {
  if (!(await requireUser())) return null;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!client) return null;

  const [creditsRes, paymentsRes] = await Promise.all([
    supabase
      .from("credits")
      .select(
        "id, credit_number, imei, balance, status, device:devices(brand, model, capacity, color)"
      )
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("payments")
      .select("id, amount, method, reference, created_at, credit_id")
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const credits = creditsRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const creditById = new Map(credits.map((credit) => [credit.id, credit]));

  const creditsDetail = credits.map((credit) => ({
    id: credit.id,
    credit_number: credit.credit_number,
    imei: credit.imei,
    balance: credit.balance,
    status: credit.status,
    device_label:
      credit.device && "brand" in credit.device
        ? `${credit.device.brand} ${credit.device.model}`.trim()
        : null,
    pending_count: 0,
  }));

  const pendingInstallments: ClientDetail["pendingInstallments"] = [];
  if (credits.length > 0) {
    const { data: installments } = await supabase
      .from("installments")
      .select("id, credit_id, number, due_date, amount, status")
      .in(
        "credit_id",
        credits.map((credit) => credit.id)
      )
      .in("status", ["pendiente", "vencida"])
      .order("number", { ascending: true });

    for (const installment of installments ?? []) {
      const credit = creditById.get(installment.credit_id);
      if (!credit) continue;
      pendingInstallments.push({
        id: installment.id,
        credit_number: credit.credit_number,
        number: installment.number,
        due_date: installment.due_date,
        amount: installment.amount,
        status: installment.status,
      });
    }

    const pendingByCredit = new Map<string, number>();
    for (const installment of installments ?? []) {
      pendingByCredit.set(
        installment.credit_id,
        (pendingByCredit.get(installment.credit_id) ?? 0) + 1
      );
    }
    for (const detail of creditsDetail) {
      detail.pending_count = pendingByCredit.get(detail.id) ?? 0;
    }
  }

  const paymentsDetail: ClientDetail["payments"] = payments.map((payment) => {
    const credit = creditById.get(payment.credit_id);
    return {
      id: payment.id,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      created_at: payment.created_at,
      credit_number: credit?.credit_number ?? null,
    };
  });

  const { data: photos } = await supabase
    .from("credit_documents")
    .select("*")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const deliveryPhotos: ClientDetail["deliveryPhotos"] = [];
  for (const photo of photos ?? []) {
    const { data: signed } = await supabase.storage
      .from("delivery-photos")
      .createSignedUrl(photo.file_url, 3600);
    const credit = creditById.get(photo.credit_id);
    deliveryPhotos.push({
      id: photo.id,
      credit_number: credit?.credit_number ?? "—",
      name: photo.name,
      file_type: photo.file_type,
      signed_url: signed?.signedUrl ?? "",
    });
  }

  return {
    client,
    credits: creditsDetail,
    pendingInstallments,
    payments: paymentsDetail,
    deliveryPhotos,
  };
}
