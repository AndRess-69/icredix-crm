import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";
import type { CreditPaymentOption, PaymentWithRelations } from "@/types";

const LIST_LIMIT = 1000;

/**
 * Obtiene los pagos registrados (sin soft delete) con cliente, crédito y cuota.
 */
export async function getPayments(): Promise<PaymentWithRelations[]> {
  return withCache("svc:payments", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payments")
      .select(
        `
      *,
      client:clients(first_name, last_name, cedula),
      credit:credits(credit_number),
      installment:installments!payments_installment_id_fkey(number)
    `
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);

    if (error || !data) return [];
    return data as PaymentWithRelations[];
  });
}

type CreditForPaymentRow = {
  id: string;
  credit_number: string;
  client_id: string;
  imei: string;
  balance: number;
  status: CreditPaymentOption["status"];
  client: { first_name: string; last_name: string; cedula: string } | null;
};

/**
 * Obtiene los créditos cobrables (con saldo > 0) para el formulario de pago,
 * junto con la cantidad de cuotas pendientes. Incluye créditos bloqueados:
 * primero se reportan los pagos y el desbloqueo se solicita al saldar.
 */
export async function getCreditsForPayment(): Promise<CreditPaymentOption[]> {
  return withCache("svc:credits-for-payment", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("credits")
      .select(
        `
      id, credit_number, client_id, imei, balance, status,
      client:clients(first_name, last_name, cedula)
    `
      )
      .is("deleted_at", null)
      .neq("status", "finalizado")
      .gt("balance", 0)
      .order("credit_number", { ascending: true })
      .limit(LIST_LIMIT);

    if (error || !data) return [];

    const credits = data as unknown as CreditForPaymentRow[];

    const pendingCounts: Record<string, number> = {};
    if (credits.length > 0) {
      const { data: counts } = await supabase
        .from("installments")
        .select("credit_id")
        .in("credit_id", credits.map((credit) => credit.id))
        .in("status", ["pendiente", "vencida"]);

      for (const row of counts ?? []) {
        pendingCounts[row.credit_id] = (pendingCounts[row.credit_id] ?? 0) + 1;
      }
    }

    return credits.map((credit) => ({
      id: credit.id,
      credit_number: credit.credit_number,
      client_id: credit.client_id,
      client_first_name: credit.client?.first_name ?? "",
      client_last_name: credit.client?.last_name ?? "",
      client_cedula: credit.client?.cedula ?? "",
      imei: credit.imei,
      balance: credit.balance,
      status: credit.status,
      pending_count: pendingCounts[credit.id] ?? 0,
    }));
  });
}
