import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";
import type { CreditWithRelations, Installment } from "@/types";

const CREDIT_LIST_LIMIT = 1000;

/**
 * Obtiene los créditos activos (sin soft delete) con cliente y equipo relacionados.
 */
export async function getCredits(): Promise<CreditWithRelations[]> {
  return withCache("svc:credits", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("credits")
      .select(
        `
      *,
      client:clients(id, first_name, last_name, cedula, phone),
      device:devices(id, brand, model, capacity, color, imei),
      device_reference:device_references(id, brand, model, capacity, color)
    `
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(CREDIT_LIST_LIMIT);

    if (error || !data) return [];
    return data as CreditWithRelations[];
  });
}

/**
 * Obtiene las cuotas de un crédito ordenadas por número.
 */
export async function getInstallmentsByCreditId(
  creditId: string
): Promise<Installment[]> {
  return withCache(`svc:installments:${creditId}`, async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("installments")
      .select("*")
      .eq("credit_id", creditId)
      .order("number", { ascending: true });

    if (error || !data) return [];
    return data;
  });
}
