"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  createCreditAction,
  updateCreditAction,
} from "@/lib/actions/credits";
import { creditFormSchema, type CreditFormValues } from "@/lib/validators/credits";
import { calculateCredit } from "@/lib/utils/credit";
import { formatCurrency } from "@/lib/utils/format";
import type {
  ClientOption,
  CreditWithRelations,
  DeviceReferenceOption,
} from "@/types";

interface CreditFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  deviceReferences: DeviceReferenceOption[];
  credit?: CreditWithRelations | null;
  interestRate?: number | null;
  /** Cliente fijo (expediente): se preselecciona y oculta el selector de cliente. */
  client?: ClientOption | null;
}

function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function toFormValues(credit: CreditWithRelations): CreditFormValues {
  const deviceValue =
    credit.device_value && credit.device_value > 0
      ? credit.device_value
      : credit.financed_amount + credit.initial_payment;

  return {
    client_id: credit.client_id,
    device_id: credit.device_id ?? "none",
    device_reference_id: credit.device_reference_id ?? "none",
    imei: credit.imei ?? "",
    device_value: deviceValue,
    financed_amount: Math.max(0, deviceValue - credit.initial_payment),
    initial_payment: credit.initial_payment,
    installments_count: credit.installments_count,
    start_date: credit.start_date,
    approval_date: credit.approval_date ?? "",
  };
}

export function CreditFormDialog({
  open,
  onOpenChange,
  clients,
  deviceReferences,
  credit,
  interestRate,
  client,
}: CreditFormDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreditFormValues>({
    resolver: zodResolver(creditFormSchema),
    defaultValues: {
      client_id: client?.id ?? "",
      device_id: "none",
      device_reference_id: "none",
      imei: "",
      device_value: 0,
      financed_amount: 0,
      initial_payment: 0,
      installments_count: 0,
      start_date: today(),
    },
  });

  React.useEffect(() => {
    if (open) {
      reset(
        credit
          ? toFormValues(credit)
          : {
              client_id: client?.id ?? "",
              device_id: "none",
              device_reference_id: "none",
              imei: "",
              device_value: 0,
              financed_amount: 0,
              initial_payment: 0,
              installments_count: 0,
              start_date: today(),
            }
      );
    }
  }, [open, credit, reset, client]);

  const values = watch();
  const clientId = values.client_id ?? "";
  const deviceReferenceId = values.device_reference_id ?? "none";

  React.useEffect(() => {
    const deviceValue = Number(values.device_value) || 0;
    const initial = Number(values.initial_payment) || 0;
    setValue("financed_amount", Math.max(0, deviceValue - initial), {
      shouldValidate: false,
    });
  }, [values.device_value, values.initial_payment, setValue]);

  const referenceOptions = React.useMemo(() => {
    if (!credit?.device_reference) return deviceReferences;
    const exists = deviceReferences.some(
      (ref) => ref.id === credit.device_reference!.id
    );
    if (exists) return deviceReferences;
    return [credit.device_reference as DeviceReferenceOption, ...deviceReferences];
  }, [deviceReferences, credit]);

  const preview = React.useMemo(() => {
    const financed = Number(values.financed_amount);
    const count = Number(values.installments_count);
    if (!financed || !count || !values.start_date) return null;

    const rate = credit?.interest_rate ?? interestRate ?? 0;
    const total =
      rate > 0 ? Math.round(financed * (1 + rate / 100)) : financed;

    const calc = calculateCredit(total, count, values.start_date);

    return {
      ...calc,
      total,
      rate,
      interestAmount: total - financed,
    };
  }, [
    values.financed_amount,
    values.installments_count,
    values.start_date,
    credit,
    interestRate,
  ]);

  const handleReferenceChange = (value: string | null) => {
    if (!value) return;
    setValue("device_reference_id", value, { shouldValidate: true });
  };

  const onSubmit = async (formValues: CreditFormValues) => {
    setIsSubmitting(true);
    try {
      const result = credit
        ? await updateCreditAction(credit.id, formValues)
        : await createCreditAction(formValues);

      if (result.success) {
        toast.success(credit ? "Crédito actualizado" : "Crédito creado y cuotas generadas");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al guardar el crédito");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{credit ? "Editar crédito" : "Nuevo crédito"}</DialogTitle>
          <DialogDescription>
            {credit
              ? "Actualiza el crédito. Si tiene pagos registrados no se podrá editar."
              : "Selecciona el cliente, la referencia del equipo y las condiciones del financiamiento. Las cuotas quincenales (2 y 17 de cada mes) se generan automáticamente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {client ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>Cliente</Label>
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">
                    {`${client.first_name} ${client.last_name}`.trim()}
                  </span>
                  <span className="text-muted-foreground">
                    CC {client.cedula}
                  </span>
                </div>
                <input type="hidden" {...register("client_id")} />
              </div>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <Label>Cliente</Label>
                <Select
                  value={clientId}
                  onValueChange={(value) =>
                    value && setValue("client_id", value, { shouldValidate: true })
                  }
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
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label>Referencia del equipo (opcional)</Label>
              <Select
                value={deviceReferenceId}
                onValueChange={handleReferenceChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {deviceReferenceId !== "none" && deviceReferenceId
                      ? referenceOptions.find((ref) => ref.id === deviceReferenceId)
                        ? `${referenceOptions.find((ref) => ref.id === deviceReferenceId)!.brand} ${referenceOptions.find((ref) => ref.id === deviceReferenceId)!.model}`
                        : "Selecciona una referencia"
                      : "Sin referencia"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-(--anchor-width)">
                  <SelectItem value="none">Sin referencia</SelectItem>
                  {referenceOptions.map((ref) => (
                    <SelectItem key={ref.id} value={ref.id}>
                      {`${ref.brand} ${ref.model}`}
                      {[ref.capacity, ref.color].filter(Boolean).length > 0
                        ? ` · ${[ref.capacity, ref.color].filter(Boolean).join(" · ")}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imei">IMEI (opcional)</Label>
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
              <p className="text-xs text-muted-foreground">
                Se registra cuando el equipo sea comprado/recibido.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha de inicio</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
              <p className="text-xs text-muted-foreground">
                La primera cuota vence en el segundo 2 o 17 posterior a esta fecha.
              </p>
              {errors.start_date && (
                <p className="text-xs text-destructive">{errors.start_date.message}</p>
              )}
            </div>

            {credit && (
              <div className="space-y-2">
                <Label htmlFor="approval_date">Fecha de aprobación</Label>
                <Input id="approval_date" type="date" {...register("approval_date")} />
                <p className="text-xs text-muted-foreground">
                  Define cuándo se aprobó el crédito. La fecha de inicio se actualizará automáticamente.
                </p>
                {errors.approval_date && (
                  <p className="text-xs text-destructive">{errors.approval_date.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="device_value">Valor del equipo (COP)</Label>
              <Input
                id="device_value"
                type="number"
                min={0}
                placeholder="3.500.000"
                {...register("device_value", { valueAsNumber: true })}
                aria-invalid={!!errors.device_value}
              />
              {errors.device_value && (
                <p className="text-xs text-destructive">{errors.device_value.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="initial_payment">Cuota inicial (COP)</Label>
              <Input
                id="initial_payment"
                type="number"
                min={0}
                placeholder="500.000"
                {...register("initial_payment", { valueAsNumber: true })}
                aria-invalid={!!errors.initial_payment}
              />
              {errors.initial_payment && (
                <p className="text-xs text-destructive">{errors.initial_payment.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="financed_amount">Valor a financiar (COP)</Label>
              <Input
                id="financed_amount"
                type="number"
                min={0}
                readOnly
                tabIndex={-1}
                className="bg-muted/40"
                placeholder="0"
                {...register("financed_amount", { valueAsNumber: true })}
                aria-invalid={!!errors.financed_amount}
              />
              {errors.financed_amount && (
                <p className="text-xs text-destructive">{errors.financed_amount.message}</p>
              )}
              {!credit && (interestRate ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Valor del equipo menos la cuota inicial. Se le sumará el{" "}
                  {interestRate}% de interés automáticamente.
                </p>
              )}
              {credit && (credit.interest_rate ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Las cuotas se generan sobre el valor a financiar.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="installments_count">Número de cuotas</Label>
              <Input
                id="installments_count"
                type="number"
                min={1}
                max={60}
                placeholder="12"
                {...register("installments_count", { valueAsNumber: true })}
                aria-invalid={!!errors.installments_count}
              />
              {errors.installments_count && (
                <p className="text-xs text-destructive">{errors.installments_count.message}</p>
              )}
            </div>
          </div>

          {preview && (
            <div className="grid gap-2 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {preview.interestAmount > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Interés ({preview.rate}%)
                  </p>
                  <p className="font-medium text-primary">
                    + {formatCurrency(preview.interestAmount)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">
                  Total a financiar
                </p>
                <p className="font-medium">
                  {formatCurrency(preview.total)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor cuota</p>
                <p className="font-medium">{formatCurrency(preview.installmentAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Última cuota</p>
                <p className="font-medium">{formatCurrency(preview.lastInstallmentAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo por cobrar</p>
                <p className="font-medium">{formatCurrency(preview.balance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha final</p>
                <p className="font-medium">{preview.endDate}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {credit ? "Guardar cambios" : "Crear crédito"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
