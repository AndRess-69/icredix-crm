import { AlertTriangle, CreditCard, DollarSign, Wallet } from "lucide-react";

import { PageTitle } from "@/components/layout/page-title";
import { StatCard } from "@/components/dashboard/stat-card";
import { PaymentsChart } from "@/components/dashboard/payments-chart";
import { MethodPaymentsChart } from "@/components/reportes/method-payments-chart";
import { CreditsSummaryTable } from "@/components/reportes/credits-summary-table";
import { PaymentsExportButton } from "@/components/reportes/payments-export-button";
import { getMonthlyPaymentsChart } from "@/services/dashboardService";
import {
  getCreditStatusSummary,
  getPaymentsByMethod,
} from "@/services/reportService";
import { getPayments } from "@/services/paymentService";
import { formatCurrency } from "@/lib/utils/format";

export default async function ReportesPage() {
  const [chartData, methods, creditsSummary, payments] = await Promise.all([
    getMonthlyPaymentsChart(12),
    getPaymentsByMethod(),
    getCreditStatusSummary(),
    getPayments(),
  ]);

  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalBalance = creditsSummary.reduce((sum, item) => sum + item.balance, 0);
  const totalFinanced = creditsSummary.reduce((sum, item) => sum + item.financed, 0);
  const totalCredits = creditsSummary.reduce((sum, item) => sum + item.count, 0);
  const overdueCredits = creditsSummary.find((item) => item.status === "en_mora");

  return (
    <>
      <PageTitle title="Reportes" description="Indicadores y exportación de datos" />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Ingresos registrados"
            value={formatCurrency(totalPayments)}
            description={`${payments.length} pago(s)`}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Saldo por cobrar"
            value={formatCurrency(totalBalance)}
            icon={Wallet}
            variant="primary"
          />
          <StatCard
            title="Créditos financiados"
            value={formatCurrency(totalFinanced)}
            description={`${totalCredits} crédito(s)`}
            icon={CreditCard}
          />
          <StatCard
            title="Créditos en mora"
            value={overdueCredits?.count ?? 0}
            description={
              overdueCredits ? formatCurrency(overdueCredits.balance) : undefined
            }
            icon={AlertTriangle}
            variant="danger"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <PaymentsChart data={chartData} />
          <MethodPaymentsChart data={methods} />
        </div>

        <CreditsSummaryTable data={creditsSummary} />

        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Exportar pagos</p>
            <p className="text-sm text-muted-foreground">
              Descarga el historial de pagos como CSV (compatible con Excel).
            </p>
          </div>
          <PaymentsExportButton payments={payments} />
        </div>
      </div>
    </>
  );
}
