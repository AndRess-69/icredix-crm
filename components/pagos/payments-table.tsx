"use client";

import * as React from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PaymentFormDialog } from "@/components/pagos/payment-form-dialog";
import { deletePaymentAction } from "@/lib/actions/payments";
import { getPaymentMethodLabel } from "@/lib/utils/status";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { CreditPaymentOption, PaymentWithRelations } from "@/types";

interface PaymentsTableProps {
  payments: PaymentWithRelations[];
  credits: CreditPaymentOption[];
}

export function PaymentsTable({ payments, credits }: PaymentsTableProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<PaymentWithRelations | null>(null);

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deletePaymentAction(deleting.id);
    if (result.success) {
      toast.success("Pago eliminado");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar el pago");
    }
  };

  const columns = React.useMemo<LegacyColumnDef<PaymentWithRelations, unknown>[]>(
    () => [
      {
        id: "client",
        header: "Cliente",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">
              {row.original.client
                ? `${row.original.client.first_name} ${row.original.client.last_name}`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.client?.cedula ?? ""}
            </p>
          </div>
        ),
      },
      {
        id: "credit",
        header: "Crédito / Cuota",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.credit?.credit_number ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.installment
                ? `Cuota ${row.original.installment.number}`
                : "Abono directo"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: "Monto",
        cell: ({ row }) => (
          <span className="font-medium">{formatCurrency(row.original.amount)}</span>
        ),
      },
      {
        accessorKey: "method",
        header: "Método",
        cell: ({ row }) => getPaymentMethodLabel(row.original.method),
      },
      {
        accessorKey: "reference",
        header: "Referencia",
        cell: ({ row }) => row.original.reference || "—",
      },
      {
        accessorKey: "created_at",
        header: "Fecha",
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleting(row.original)}
              aria-label="Eliminar pago"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {payments.length} pago(s) registrado(s)
        </p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus />
          Nuevo pago
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        searchable
        searchPlaceholder="Buscar por cliente, crédito o referencia..."
      />

      <PaymentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        credits={credits}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Eliminar pago"
        description={`¿Seguro que quieres eliminar este pago por ${deleting ? formatCurrency(deleting.amount) : ""}? La cuota volverá a estar pendiente.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </div>
  );
}
