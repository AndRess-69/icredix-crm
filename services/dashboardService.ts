import { format, startOfDay, startOfMonth, endOfMonth } from "date-fns";
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
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return withCache("svc:dashboard-stats", async () => {
    const supabase = await createClient();
    const today = startOfDay(new Date()).toISOString();
    const monthStart = startOfMonth(new Date()).toISOString();
    const monthEnd = endOfMonth(new Date()).toISOString();

    const [
      clientsResult,
      creditsResult,
      paymentsTodayResult,
      pendingInstallmentsResult,
      overdueCreditsResult,
      blockedDevicesResult,
      balanceResult,
      monthlyPaymentsResult,
    ] = await Promise.all([
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase
        .from("credits")
        .select("id", { count: "exact", head: true })
        .eq("status", "activo")
        .is("deleted_at", null),
      supabase
        .from("payments")
        .select("amount")
        .gte("created_at", today)
        .is("deleted_at", null)
        .limit(10000),
      supabase
        .from("installments")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendiente"),
      supabase
        .from("credits")
        .select("client_id", { count: "exact", head: true })
        .eq("status", "en_mora")
        .is("deleted_at", null),
      supabase
        .from("devices")
        .select("id", { count: "exact", head: true })
        .eq("status", "bloqueado")
        .is("deleted_at", null),
      supabase
        .from("credits")
        .select("balance")
        .in("status", ["activo", "en_mora", "bloqueado"])
        .is("deleted_at", null)
        .limit(10000),
      supabase
        .from("payments")
        .select("amount")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd)
        .is("deleted_at", null)
        .limit(10000),
    ]);

    const paymentsToday = paymentsTodayResult.data ?? [];
    const balances = balanceResult.data ?? [];
    const monthlyPayments = monthlyPaymentsResult.data ?? [];

    return {
      activeClients: clientsResult.count ?? 0,
      activeCredits: creditsResult.count ?? 0,
      paymentsToday: paymentsToday.length,
      paymentsTodayAmount: paymentsToday.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      ),
      pendingPayments: pendingInstallmentsResult.count ?? 0,
      overdueClients: overdueCreditsResult.count ?? 0,
      blockedDevices: blockedDevicesResult.count ?? 0,
      balanceToCollect: balances.reduce((sum, c) => sum + Number(c.balance), 0),
      monthlyIncome: monthlyPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      ),
    };
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
 */
export async function getMonthlyPaymentsChart(
  months = 6
): Promise<MonthlyPaymentChartPoint[]> {
  return withCache(`svc:payments-chart:${months}`, async () => {
    const supabase = await createClient();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);

    const { data, error } = await supabase
      .from("payments")
      .select("amount, created_at")
      .gte("created_at", startDate.toISOString())
      .is("deleted_at", null)
      .limit(10000);

    if (error || !data) {
      return generateEmptyChart(months);
    }

    const grouped = new Map<string, number>();

    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - 1 - i));
      const key = format(date, "yyyy-MM");
      grouped.set(key, 0);
    }

    data.forEach((payment) => {
      const key = format(new Date(payment.created_at), "yyyy-MM");
      if (grouped.has(key)) {
        grouped.set(key, (grouped.get(key) ?? 0) + Number(payment.amount));
      }
    });

    return Array.from(grouped.entries()).map(([key, amount]) => ({
      month: format(new Date(`${key}-01`), "MMM yyyy", { locale: es }),
      amount,
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
