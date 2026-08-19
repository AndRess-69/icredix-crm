"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyPaymentChartPoint } from "@/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PaymentsChartProps {
  data: MonthlyPaymentChartPoint[];
}

export function PaymentsChart({ data }: PaymentsChartProps) {
  const chartData = {
    labels: data.map((d) => d.month),
    datasets: [
      {
        label: "Pagos recibidos",
        data: data.map((d) => d.amount),
        backgroundColor: "rgba(0, 82, 255, 0.7)",
        borderColor: "#0052FF",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            const value = context.parsed.y ?? 0;
            return formatCurrency(value);
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0,0,0,0.05)",
        },
        ticks: {
          font: { size: 11 },
          callback: (value: string | number) => {
            const num = Number(value);
            if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
            if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
            return `$${num}`;
          },
        },
      },
    },
  };

  return (
    <Card className="col-span-full border shadow-sm lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Pagos mensuales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
