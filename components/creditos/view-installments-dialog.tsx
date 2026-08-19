"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCreditInstallmentsAction } from "@/lib/actions/credits";
import { getInstallmentStatusInfo } from "@/lib/utils/status";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Installment } from "@/types";

interface ViewInstallmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditId: string | null;
  creditLabel: string;
}

export function ViewInstallmentsDialog({
  open,
  onOpenChange,
  creditId,
  creditLabel,
}: ViewInstallmentsDialogProps) {
  const [installments, setInstallments] = React.useState<Installment[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !creditId) return;
    setIsLoading(true);
    getCreditInstallmentsAction(creditId)
      .then(setInstallments)
      .finally(() => setIsLoading(false));
  }, [open, creditId]);

  const totalPaid = installments
    .filter((installment) => installment.status === "pagada")
    .reduce((sum, installment) => sum + installment.amount, 0);

  const totalPending = installments
    .filter((installment) => installment.status !== "pagada")
    .reduce((sum, installment) => sum + installment.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cuotas del crédito</DialogTitle>
          <DialogDescription>{creditLabel}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm">
              <p>
                <span className="text-muted-foreground">Pagado: </span>
                <span className="font-medium text-emerald-600">
                  {formatCurrency(totalPaid)}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Pendiente: </span>
                <span className="font-medium">{formatCurrency(totalPending)}</span>
              </p>
            </div>

            <div className="max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Pagada el</TableHead>
                    <TableHead className="text-right">Días mora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No hay cuotas registradas
                      </TableCell>
                    </TableRow>
                  )}
                  {installments.map((installment) => {
                    const info = getInstallmentStatusInfo(installment.status);
                    return (
                      <TableRow key={installment.id}>
                        <TableCell>{installment.number}</TableCell>
                        <TableCell>{formatDate(installment.due_date)}</TableCell>
                        <TableCell>{formatCurrency(installment.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={info.variant}>{info.label}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(installment.paid_at)}</TableCell>
                        <TableCell className="text-right">
                          {installment.days_overdue > 0 ? installment.days_overdue : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
