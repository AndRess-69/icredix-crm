import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";
import type {
  Client,
  DashboardStats,
  InstallmentWithRelations,
  MonthlyPaymentChartPoint,
  PaymentWithRelations,
} from "@/types";

const EMPTY_STATS: DashboardStats = {
  activeClients: 0,
  activeCredits: 0,
  paymentsToday: 0,
  paymentsTodayAmount: 0,
  pendingPayments: 0,
  overdueClients: 0,
  blockedDevices: 0,
  balanceToCollect: 0,
  monthlyIncome: 0,
};

/**
 * Obtiene las estadísticas principales del dashboard.
 * Usa RPC server-side para que Postgres sums, no JS.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return withCache("svc:dashboard-stats", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_dashboard_stats");
    if (error || !data) return EMPTY_STATS;
    return data as unknown as DashboardStats;
  });
}

/**
 * Obtiene los últimos pagos registrados.
 */
export async function getRecentPayments(
  limit = 5
): Promise<PaymentWithRelations[]> {
  return withCache(`svc:recent-payments:${limit}`, async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payments")
      .select(
        `
      *,
      client:clients(first_name, last_name, cedula),
      credit:credits(credit_number)
    `
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data as PaymentWithRelations[];
  });
}

/**
 * Obtiene las próximas cuotas por vencer.
 */
export async function getUpcomingInstallments(
  limit = 5
): Promise<InstallmentWithRelations[]> {
  return withCache(`svc:upcoming-installments:${limit}`, async () => {
    const supabase = await createClient();
    const today = format(new Date(), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("installments")
      .select(
        `
      *,
      credit:credits(credit_number, client:clients(first_name, last_name, phone))
    `
      )
      .eq("status", "pendiente")
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(limit);

    if (error || !data) return [];

    return data as InstallmentWithRelations[];
  });
}

/**
 * Obtiene los clientes registrados más recientemente.
 */
export async function getRecentClients(limit = 5): Promise<Client[]> {
  return withCache(`svc:recent-clients:${limit}`, async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data;
  });
}

/**
 * Obtiene los pagos agrupados por mes para el gráfico del dashboard.
 * Usa RPC server-side para que Postgres agrupe, no JS.
 */
export async function getMonthlyPaymentsChart(
  months = 6
): Promise<MonthlyPaymentChartPoint[]> {
  return withCache(`svc:payments-chart:${months}`, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_monthly_payments_chart", {
      months_back: months,
    });

    if (error || !data) {
      return generateEmptyChart(months);
    }

    const rows = data as unknown as Array<{ month: string; amount: number }>;
    return rows.map((r) => ({
      month: format(new Date(`${r.month}-01`), "MMM yyyy", { locale: es }),
      amount: Number(r.amount),
    }));
  });
}

function generateEmptyChart(months: number): MonthlyPaymentChartPoint[] {
  return Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (months - 1 - i));
    return {
      month: format(date, "MMM yyyy", { locale: es }),
      amount: 0,
    };
  });
}

export { EMPTY_STATS };
