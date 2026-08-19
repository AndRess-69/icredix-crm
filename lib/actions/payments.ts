"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/cache";
import {
  paymentFormSchema,
  type PaymentFormValues,
} from "@/lib/validators/payments";
import { syncPaymentToSheet } from "@/lib/google/sync";
import { requireRole, requireUser } from "@/lib/auth-guard";
import type { PendingInstallmentOption } from "@/types";

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Obtiene las cuotas pendientes o vencidas de un crédito para el formulario de pago.
 */
export async function getPendingInstallmentsAction(
  creditId: string
): Promise<PendingInstallmentOption[]> {
  if (!(await requireUser())) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("installments")
    .select("id, number, due_date, amount, days_overdue")
    .eq("credit_id", creditId)
    .in("status", ["pendiente", "vencida"])
    .order("number", { ascending: true });

  if (error || !data) return [];
  return data as PendingInstallmentOption[];
}

export async function createPaymentAction(
  values: PaymentFormValues
): Promise<ActionResult> {
  const parsed = paymentFormSchema.safeParse(values);

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

  if (data.amount != null) {
    const { data: installment } = await supabase
      .from("installments")
      .select("id, amount")
      .eq("id", data.installment_id)
      .maybeSingle();

    if (installment && data.amount > installment.amount) {
      return {
        success: false,
        error: "El valor no puede ser mayor al valor de la cuota",
      };
    }
  }

  const { error } = await supabase.rpc("create_payment", {
    p_credit_id: data.credit_id,
    p_installment_id: data.installment_id,
    p_method: data.method,
    p_reference: data.reference || null,
    p_notes: data.notes || null,
    p_amount: data.amount ?? null,
  });

  if (error) return { success: false, error: error.message };

  try {
    await syncPaymentToSheet(data.credit_id, data.installment_id);
  } catch (syncError) {
    console.error("Error sincronizando pago a Google Sheets:", syncError);
  }

  cacheInvalidate("svc");
  revalidatePath("/pagos");
  revalidatePath("/creditos");
  revalidatePath("/");
  return { success: true };
}

export async function deletePaymentAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase.rpc("delete_payment", { p_payment_id: id });

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/pagos");
  revalidatePath("/creditos");
  return { success: true };
}
