"use client";

import { Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getPaymentMethodLabel } from "@/lib/utils/status";
import type { PaymentWithRelations } from "@/types";

interface PaymentsExportButtonProps {
  payments: PaymentWithRelations[];
}

function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function PaymentsExportButton({ payments }: PaymentsExportButtonProps) {
  const handleExport = () => {
    if (payments.length === 0) {
      toast.error("No hay pagos para exportar");
      return;
    }

    const headers = [
      "Fecha",
      "Cliente",
      "Cédula",
      "Crédito",
      "Cuota",
      "Monto",
      "Método",
      "Referencia",
      "Notas",
    ];

    const rows = payments.map((payment) => [
      payment.created_at,
      payment.client
        ? `${payment.client.first_name} ${payment.client.last_name}`
        : "",
      payment.client?.cedula ?? "",
      payment.credit?.credit_number ?? "",
      payment.installment ? `Cuota ${payment.installment.number}` : "",
      String(payment.amount),
      getPaymentMethodLabel(payment.method),
      payment.reference ?? "",
      payment.notes ?? "",
    ]);

    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map(escapeCell).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pagos-icredix-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exportados ${payments.length} pago(s)`);
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="size-4" />
      Exportar pagos (CSV)
    </Button>
  );
}
