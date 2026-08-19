"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPaymentAction,
  getPendingInstallmentsAction,
} from "@/lib/actions/payments";
import { getPaymentMethodLabel, PAYMENT_METHODS } from "@/lib/utils/status";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type {
  ExpedienteCredit,
  PaymentMethod,
  PendingInstallmentOption,
} from "@/types";

interface CreditPaymentDialogProps {
  credit: ExpedienteCredit | null;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditPaymentDialog({
  credit,
  clientName,
  open,
  onOpenChange,
}: CreditPaymentDialogProps) {
  const router = useRouter();
  const [installments, setInstallments] = React.useState<
    PendingInstallmentOption[]
  >([]);
  const [installmentId, setInstallmentId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<PaymentMethod>("efectivo");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    if (open && credit) {
      setAmount("");
      setMethod("efectivo");
      setReference("");
      setNotes("");
      setConfirming(false);
      setInstallments([]);
      setInstallmentId("");
      setIsLoading(true);
      getPendingInstallmentsAction(credit.id)
        .then((list) => {
          setInstallments(list);
          if (list[0]) {
            setInstallmentId(list[0].id);
            setAmount(String(list[0].amount));
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [open, credit]);

  const selectedInstallment =
    installments.find((installment) => installment.id === installmentId) ?? null;

  const customAmount = Number(amount);
  const effectiveAmount =
    Number.isFinite(customAmount) && customAmount > 0
      ? customAmount
      : (selectedInstallment?.amount ?? 0);
  const isPartial =
    !!selectedInstallment &&
    Number.isFinite(customAmount) &&
    customAmount > 0 &&
    customAmount < selectedInstallment.amount;

  const handleContinue = () => {
    if (!selectedInstallment) {
      toast.error("Selecciona la cuota a pagar");
      return;
    }
    if (!Number.isFinite(customAmount) || customAmount <= 0) {
      toast.error("Ingresa un monto de pago válido");
      return;
    }
    if (customAmount > selectedInstallment.amount) {
      toast.error("El valor no puede ser mayor al valor de la cuota");
      return;
    }
    setConfirming(true);
  };

  const handleConfirm = async () => {
    if (!credit || !selectedInstallment) return;
    setIsSubmitting(true);
    try {
      const result = await createPaymentAction({
        credit_id: credit.id,
        installment_id: selectedInstallment.id,
        method,
        reference,
        notes,
        amount: effectiveAmount,
      });
      if (result.success) {
        toast.success("Pago registrado");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al registrar el pago");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {credit ? `Crédito ${credit.credit_number} · ${clientName}` : " "}
          </DialogDescription>
        </DialogHeader>

        {confirming ? (
          <div className="space-y-4">
            <div className="grid gap-2 rounded-lg border p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{clientName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Crédito</span>
                <span className="font-medium">
                  {credit?.credit_number ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saldo actual</span>
                <span className="font-medium">
                  {formatCurrency(credit?.balance ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pago</span>
                <span className="font-medium">
                  {formatCurrency(effectiveAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Método</span>
                <span className="font-medium">
                  {getPaymentMethodLabel(method)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">Saldo después</span>
                <span className="font-semibold">
                  {formatCurrency((credit?.balance ?? 0) - effectiveAmount)}
                </span>
              </div>
            </div>

            {isPartial && selectedInstallment && (
              <p className="text-xs text-muted-foreground">
                Es un pago parcial: la cuota {selectedInstallment.number} se
                dará por negociada y el restante (
                {formatCurrency(selectedInstallment.amount - effectiveAmount)}) se
                trasladará a la última cuota pendiente.
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={isSubmitting}
              >
                Volver
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Confirmar pago
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {credit && (
              <div className="grid gap-2 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Crédito</p>
                  <p className="font-medium">{credit.credit_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="font-medium">{formatCurrency(credit.balance)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Próxima cuota</p>
                  <p className="font-medium">
                    {installments[0] ? `#${installments[0].number}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor cuota</p>
                  <p className="font-medium">
                    {formatCurrency(installments[0]?.amount ?? 0)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Cuota a pagar</Label>
              <Select
                value={installmentId}
                onValueChange={(value) => {
                  if (!value) return;
                  setInstallmentId(value);
                  const installment = installments.find((item) => item.id === value);
                  if (installment) setAmount(String(installment.amount));
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {isLoading
                      ? "Cargando cuotas..."
                      : selectedInstallment
                        ? `Cuota ${selectedInstallment.number} · ${formatDate(selectedInstallment.due_date)}`
                        : "Selecciona una cuota"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-(--anchor-width)">
                  {installments.length === 0 && (
                    <SelectItem value="__none" disabled>
                      No hay cuotas pendientes
                    </SelectItem>
                  )}
                  {installments.map((installment) => (
                    <SelectItem key={installment.id} value={installment.id}>
                      {`Cuota ${installment.number} · vence ${formatDate(installment.due_date)} · ${formatCurrency(installment.amount)}`}
                      {installment.days_overdue > 0
                        ? ` · ${installment.days_overdue} día(s) mora`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_amount">Monto del pago (COP)</Label>
              <Input
                id="payment_amount"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Valor a pagar"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={!selectedInstallment}
              />
              {selectedInstallment && isPartial && (
                <p className="text-xs text-muted-foreground">
                  Pago parcial: el restante se traslada a la última cuota
                  pendiente.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                value={method}
                onValueChange={(value) => setMethod(value as PaymentMethod)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{getPaymentMethodLabel(method)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="w-(--anchor-width)">
                  {PAYMENT_METHODS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {getPaymentMethodLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_reference">Referencia (opcional)</Label>
              <Input
                id="payment_reference"
                placeholder="N° de referencia o consignación"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_notes">Notas (opcional)</Label>
              <Textarea
                id="payment_notes"
                placeholder="Observaciones del pago"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleContinue}>
                Continuar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
