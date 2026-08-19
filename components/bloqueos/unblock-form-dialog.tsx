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
import { createUnblockAction, getClientCreditsAction } from "@/lib/actions/blocks";
import {
  unblockFormSchema,
  type UnblockFormValues,
} from "@/lib/validators/blocks";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { ClientOption, PaymentWithRelations } from "@/types";

export interface UnblockFormPrefill {
  client_id: string;
  imei?: string | null;
  credit_id?: string | null;
  device_id?: string | null;
  client_name?: string;
}

interface UnblockFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  payments: PaymentWithRelations[];
  prefill?: UnblockFormPrefill | null;
}

export function UnblockFormDialog({
  open,
  onOpenChange,
  clients,
  payments,
  prefill,
}: UnblockFormDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UnblockFormValues>({
    resolver: zodResolver(unblockFormSchema),
    defaultValues: {
      client_id: prefill?.client_id ?? "",
      imei: prefill?.imei ?? "",
      payment_id: "",
      unblock_reason: "",
      phone_line: "",
      credit_id: prefill?.credit_id ?? "",
      device_id: prefill?.device_id ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        client_id: prefill?.client_id ?? "",
        imei: prefill?.imei ?? "",
        payment_id: "",
        unblock_reason: "",
        phone_line: "",
        credit_id: prefill?.credit_id ?? "",
        device_id: prefill?.device_id ?? "",
      });
      setCredits([]);
      if (prefill?.client_id) {
        getClientCreditsAction(prefill.client_id).then(setCredits);
      }
    }
  }, [open, prefill, reset]);

  const values = watch();
  const clientId = values.client_id ?? "";
  const paymentId = values.payment_id ?? "";
  const [credits, setCredits] = React.useState<
    Awaited<ReturnType<typeof getClientCreditsAction>>
  >([]);

  const handleClientChange = async (value: string | null) => {
    if (!value) return;
    setValue("client_id", value, { shouldValidate: true });
    setValue("credit_id", "", { shouldValidate: true });
    const clientCredits = await getClientCreditsAction(value);
    setCredits(clientCredits);
    const imei = clientCredits[0]?.imei;
    if (imei) {
      setValue("imei", imei, { shouldValidate: true });
    }
  };

  const handleCreditChange = (value: string | null) => {
    if (!value) return;
    setValue("credit_id", value === "none" ? "" : value, { shouldValidate: true });
    const credit = credits.find((c) => c.id === value);
    if (credit) {
      setValue("imei", credit.imei ?? "", { shouldValidate: true });
    }
  };

  const onSubmit = async (formValues: UnblockFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createUnblockAction(formValues);
      if (result.success) {
        toast.success("Solicitud de desbloqueo creada");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al crear la solicitud");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva solicitud de desbloqueo</DialogTitle>
          <DialogDescription>
            Registra una solicitud de desbloqueo de equipo. El equipo se restaura como
            desbloqueado cuando la solicitud sea confirmada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={clientId}
              onValueChange={handleClientChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {clientId
                    ? clients.find((client) => client.id === clientId)
                      ? `${clients.find((client) => client.id === clientId)!.first_name} ${clients.find((client) => client.id === clientId)!.last_name}`
                      : "Selecciona un cliente"
                    : "Selecciona un cliente"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-(--anchor-width)">
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {`${client.first_name} ${client.last_name}`} · {client.cedula}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client_id && (
              <p className="text-xs text-destructive">{errors.client_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Crédito asociado (opcional)</Label>
            <Select
              value={values.credit_id ?? ""}
              onValueChange={handleCreditChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {values.credit_id
                    ? `${credits.find((c) => c.id === values.credit_id)?.credit_number ?? "Crédito"} · ${credits.find((c) => c.id === values.credit_id)?.device_label ?? ""}`
                    : "Sin crédito asociado"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-(--anchor-width)">
                <SelectItem value="none">Sin crédito asociado</SelectItem>
                {credits.map((credit) => (
                  <SelectItem key={credit.id} value={credit.id}>
                    {`${credit.credit_number} · ${credit.device_label ?? credit.imei ?? "Sin equipo"}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imei">IMEI del equipo</Label>
            <Input
              id="imei"
              placeholder="15 dígitos"
              maxLength={15}
              inputMode="numeric"
              {...register("imei")}
              aria-invalid={!!errors.imei}
            />
            {errors.imei && (
              <p className="text-xs text-destructive">{errors.imei.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_line">Línea telefónica</Label>
            <Input
              id="phone_line"
              placeholder="Ej. 3001234567"
              maxLength={60}
              inputMode="tel"
              {...register("phone_line")}
            />
            {errors.phone_line && (
              <p className="text-xs text-destructive">{errors.phone_line.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unblock_reason">Motivo del desbloqueo</Label>
            <Textarea
              id="unblock_reason"
              placeholder="Describe el motivo del desbloqueo"
              {...register("unblock_reason")}
              aria-invalid={!!errors.unblock_reason}
            />
            {errors.unblock_reason && (
              <p className="text-xs text-destructive">{errors.unblock_reason.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Pago asociado (opcional)</Label>
            <Select
              value={paymentId}
              onValueChange={(value) =>
                value &&
                setValue("payment_id", value === "none" ? "" : value, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {paymentId
                    ? payments.find((payment) => payment.id === paymentId)
                      ? `${payments.find((payment) => payment.id === paymentId)!.credit?.credit_number ?? "Crédito"} · ${formatCurrency(payments.find((payment) => payment.id === paymentId)!.amount)} · ${formatDateTime(payments.find((payment) => payment.id === paymentId)!.created_at)}`
                      : "Selecciona un pago"
                    : "Sin pago asociado"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-(--anchor-width)">
                <SelectItem value="none">Sin pago asociado</SelectItem>
                {payments.map((payment) => (
                  <SelectItem key={payment.id} value={payment.id}>
                    {`${payment.credit?.credit_number ?? "Crédito"} · ${formatCurrency(payment.amount)} · ${formatDateTime(payment.created_at)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Crear solicitud
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
