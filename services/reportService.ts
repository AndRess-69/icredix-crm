import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";
import type { CreditStatusSummary, PaymentMethodSummary } from "@/types";

/**
 * Agrupa los pagos registrados por método de pago.
 * Usa RPC server-side para que Postgres agrupe, no JS.
 */
export async function getPaymentsByMethod(): Promise<PaymentMethodSummary[]> {
  return withCache("svc:payments-by-method", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_payments_by_method");
    if (error || !data) return [];
    return data as unknown as PaymentMethodSummary[];
  });
}

/**
 * Resumen de créditos agrupados por estado.
 * Usa RPC server-side para que Postgres agrupe, no JS.
 */
export async function getCreditStatusSummary(): Promise<CreditStatusSummary[]> {
  return withCache("svc:credit-status-summary", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_credit_status_summary");
    if (error || !data) return [];
    return data as unknown as CreditStatusSummary[];
  });
}
