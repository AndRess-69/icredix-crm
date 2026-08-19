"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
import { createPaymentAction, getPendingInstallmentsAction } from "@/lib/actions/payments";
import { paymentFormSchema, type PaymentFormValues } from "@/lib/validators/payments";
import { getPaymentMethodLabel, getCreditStatusInfo, PAYMENT_METHODS } from "@/lib/utils/status";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { CreditPaymentOption, PendingInstallmentOption } from "@/types";

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credits: CreditPaymentOption[];
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  credits,
}: PaymentFormDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingInstallments, setIsLoadingInstallments] = React.useState(false);
  const [installments, setInstallments] = React.useState<PendingInstallmentOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      credit_id: "",
      installment_id: "",
      method: "efectivo",
      reference: "",
      notes: "",
      amount: undefined,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        credit_id: "",
        installment_id: "",
        method: "efectivo",
        reference: "",
        notes: "",
        amount: undefined,
      });
      setInstallments([]);
    }
  }, [open, reset]);

  const values = watch();
  const creditId = values.credit_id ?? "";
  const installmentId = values.installment_id ?? "";

  const selectedCredit = credits.find((credit) => credit.id === creditId);
  const selectedInstallment = installments.find(
    (installment) => installment.id === installmentId
  );

  const customAmount = Number(values.amount);
  const effectiveAmount =
    Number.isFinite(customAmount) && customAmount > 0
      ? customAmount
      : (selectedInstallment?.amount ?? 0);
  const isPartial =
    !!selectedInstallment &&
    Number.isFinite(customAmount) &&
    customAmount > 0 &&
    customAmount < selectedInstallment.amount;

  const handleCreditChange = async (value: string | null) => {
    if (!value) return;
    setValue("credit_id", value, { shouldValidate: true });
    setValue("installment_id", "", { shouldValidate: true });
    setInstallments([]);
    setIsLoadingInstallments(true);
    try {
      const list = await getPendingInstallmentsAction(value);
      setInstallments(list);
    } finally {
      setIsLoadingInstallments(false);
    }
  };

  const onSubmit = async (formValues: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createPaymentAction(formValues);
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
            Selecciona el crédito y la cuota que se está pagando. Usa «Otro
            valor» para un pago parcial o negociado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Crédito</Label>
            <Select value={creditId} onValueChange={handleCreditChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedCredit
                    ? `${selectedCredit.credit_number} · ${selectedCredit.client_first_name} ${selectedCredit.client_last_name}`
                    : "Selecciona un crédito"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-(--anchor-width)">
                {credits.length === 0 && (
                  <SelectItem value="__none" disabled>
                    No hay créditos con saldo pendiente
                  </SelectItem>
                )}
                {credits.map((credit) => (
                  <SelectItem key={credit.id} value={credit.id}>
                    {`${credit.credit_number} · ${credit.client_first_name} ${credit.client_last_name}`}{" "}
                    · saldo {formatCurrency(credit.balance)} · {credit.pending_count}{" "}
                    cuota(s)
                    {credit.status !== "activo"
                      ? ` · ${getCreditStatusInfo(credit.status).label}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.credit_id && (
              <p className="text-xs text-destructive">{errors.credit_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cuota a pagar</Label>
            <Select
              value={installmentId}
              onValueChange={(value) =>
                value && setValue("installment_id", value, { shouldValidate: true })
              }
              disabled={!creditId}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {isLoadingInstallments
                    ? "Cargando cuotas..."
                    : selectedInstallment
                      ? `Cuota ${selectedInstallment.number} · ${formatDate(selectedInstallment.due_date)}`
                      : "Selecciona una cuota"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-(--anchor-width)">
                {installments.length === 0 && (
                  <SelectItem value="__none" disabled>
                    {creditId ? "No hay cuotas pendientes" : "Primero selecciona un crédito"}
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
            {errors.installment_id && (
              <p className="text-xs text-destructive">{errors.installment_id.message}</p>
            )}
          </div>

          {selectedInstallment && (
            <div className="space-y-3">
              <div className="grid gap-2 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Valor a pagar</p>
                  <p className="font-medium">
                    {formatCurrency(effectiveAmount)}
                    {isPartial && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        (cuota {formatCurrency(selectedInstallment.amount)})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Nuevo saldo del crédito
                  </p>
                  <p className="font-medium">
                    {formatCurrency(
                      (selectedCredit?.balance ?? 0) - effectiveAmount
                    )}
                  </p>
                </div>
              </div>

              {isPartial && (
                <p className="text-xs text-muted-foreground">
                  Es un pago parcial: la cuota se dará por negociada y el restante (
                  {formatCurrency(selectedInstallment.amount - effectiveAmount)}) se
                  trasladará a la última cuota pendiente.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Otro valor (COP, opcional)</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              placeholder="Pago parcial o negociado"
              {...register("amount", {
                setValueAs: (value) =>
                  value === "" ? undefined : Number(value),
              })}
              aria-invalid={!!errors.amount}
              disabled={!selectedInstallment}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select
              value={values.method}
              onValueChange={(value) =>
                value && setValue("method", value as PaymentFormValues["method"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>{getPaymentMethodLabel(values.method)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="w-(--anchor-width)">
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {getPaymentMethodLabel(method)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia (opcional)</Label>
            <Input
              id="reference"
              placeholder="N° de referencia o consignación"
              {...register("reference")}
            />
            {errors.reference && (
              <p className="text-xs text-destructive">{errors.reference.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Observaciones del pago"
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Registrar pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
