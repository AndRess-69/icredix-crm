"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Legend,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { PieChart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPaymentMethodLabel } from "@/lib/utils/status";
import { formatCurrency } from "@/lib/utils/format";
import type { PaymentMethod, PaymentMethodSummary } from "@/types";

ChartJS.register(ArcElement, Legend, Tooltip);

const METHOD_COLORS: Record<PaymentMethod, string> = {
  efectivo: "#0052FF",
  transferencia: "#7000FF",
  nequi: "#D300C5",
  daviplata: "#FFC72C",
  otro: "#94A3B8",
};

interface MethodPaymentsChartProps {
  data: PaymentMethodSummary[];
}

export function MethodPaymentsChart({ data }: MethodPaymentsChartProps) {
  const chartData = {
    labels: data.map((d) => getPaymentMethodLabel(d.method)),
    datasets: [
      {
        data: data.map((d) => d.amount),
        backgroundColor: data.map((d) => METHOD_COLORS[d.method]),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"doughnut">) => {
            const value = context.parsed;
            const total =
              context.dataset.data.reduce<number>(
                (sum, item) => sum + (item ?? 0),
                0
              ) || 1;
            const pct = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(value)} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <PieChart className="size-4 text-[#0052FF]" />
          Pagos por método
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <Doughnut data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
