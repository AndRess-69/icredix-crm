import {
  AlertTriangle,
  Ban,
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentPaymentsTable } from "@/components/dashboard/recent-payments-table";
import { UpcomingInstallmentsTable } from "@/components/dashboard/upcoming-installments-table";
import { RecentClientsTable } from "@/components/dashboard/recent-clients-table";
import { PaymentsChart } from "@/components/dashboard/payments-chart";
import { formatCurrency } from "@/lib/utils/format";
import {
  getDashboardStats,
  getRecentPayments,
  getUpcomingInstallments,
  getRecentClients,
  getMonthlyPaymentsChart,
} from "@/services/dashboardService";

export default async function DashboardPage() {
  const [stats, recentPayments, upcomingInstallments, recentClients, chartData] =
    await Promise.all([
      getDashboardStats(),
      getRecentPayments(),
      getUpcomingInstallments(),
      getRecentClients(),
      getMonthlyPaymentsChart(),
    ]);

  return (
    <>
      <PageTitle title="Dashboard" description="Resumen general de iCredix CRM" />
      <div className="space-y-6">
        {/* Tarjetas de estadísticas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Clientes activos"
            value={stats.activeClients}
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Créditos activos"
            value={stats.activeCredits}
            icon={CreditCard}
          />
          <StatCard
            title="Pagos recibidos hoy"
            value={formatCurrency(stats.paymentsTodayAmount)}
            description={`${stats.paymentsToday} pago(s)`}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Pagos pendientes"
            value={stats.pendingPayments}
            icon={Wallet}
            variant="warning"
          />
          <StatCard
            title="Clientes en mora"
            value={stats.overdueClients}
            icon={AlertTriangle}
            variant="danger"
          />
          <StatCard
            title="Equipos bloqueados"
            value={stats.blockedDevices}
            icon={Ban}
            variant="danger"
          />
          <StatCard
            title="Saldo por cobrar"
            value={formatCurrency(stats.balanceToCollect)}
            icon={Wallet}
            variant="primary"
          />
          <StatCard
            title="Ingresos del mes"
            value={formatCurrency(stats.monthlyIncome)}
            icon={TrendingUp}
            variant="success"
          />
        </div>

        {/* Gráfico y tablas */}
        <div className="grid gap-4 lg:grid-cols-2">
          <PaymentsChart data={chartData} />
          <RecentPaymentsTable payments={recentPayments} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <UpcomingInstallmentsTable installments={upcomingInstallments} />
          <RecentClientsTable clients={recentClients} />
        </div>
      </div>
    </>
  );
}
