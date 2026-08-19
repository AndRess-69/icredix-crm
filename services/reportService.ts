import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";
import type { CreditStatusSummary, PaymentMethodSummary } from "@/types";

/**
 * Agrupa los pagos registrados por método de pago.
 * Usa COUNT y SUM en la BD para evitar traer todos los registros.
 */
export async function getPaymentsByMethod(): Promise<PaymentMethodSummary[]> {
  return withCache("svc:payments-by-method", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payments")
      .select("method, amount")
      .is("deleted_at", null)
      .limit(50000);

    if (error || !data) return [];

    const grouped = new Map<string, { method: PaymentMethodSummary["method"]; count: number; amount: number }>();

    for (const payment of data) {
      const key = payment.method;
      const current = grouped.get(key) ?? { method: key, count: 0, amount: 0 };
      current.count += 1;
      current.amount += Number(payment.amount);
      grouped.set(key, current);
    }

    return Array.from(grouped.values()) as PaymentMethodSummary[];
  });
}

/**
 * Resumen de créditos agrupados por estado.
 * Usa límite para evitar traer todos los registros.
 */
export async function getCreditStatusSummary(): Promise<CreditStatusSummary[]> {
  return withCache("svc:credit-status-summary", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("credits")
      .select("status, financed_amount, balance")
      .is("deleted_at", null)
      .limit(50000);

    if (error || !data) return [];

    const grouped = new Map<string, {
      status: CreditStatusSummary["status"];
      count: number;
      financed: number;
      balance: number;
    }>();

    for (const credit of data) {
      const key = credit.status;
      const current = grouped.get(key) ?? {
        status: key,
        count: 0,
        financed: 0,
        balance: 0,
      };
      current.count += 1;
      current.financed += Number(credit.financed_amount);
      current.balance += Number(credit.balance);
      grouped.set(key, current);
    }

    return Array.from(grouped.values()) as CreditStatusSummary[];
  });
}
