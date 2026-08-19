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
import { createBlockAction, getClientCreditsAction } from "@/lib/actions/blocks";
import { blockFormSchema, type BlockFormValues } from "@/lib/validators/blocks";
import type { ClientOption } from "@/types";

interface BlockFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
}

export function BlockFormDialog({
  open,
  onOpenChange,
  clients,
}: BlockFormDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BlockFormValues>({
    resolver: zodResolver(blockFormSchema),
    defaultValues: { client_id: "", imei: "", reason: "", phone_line: "", diagnoses: "", credit_id: "" },
  });

  React.useEffect(() => {
    if (open) {
      reset({ client_id: "", imei: "", reason: "", phone_line: "", diagnoses: "", credit_id: "" });
    }
  }, [open, reset]);

  const clientId = watch("client_id") ?? "";
  const [credits, setCredits] = React.useState<
    Awaited<ReturnType<typeof getClientCreditsAction>>
  >([]);

  const handleClientChange = async (value: string | null) => {
    if (!value) return;
    setValue("client_id", value, { shouldValidate: true });
    setCredits([]);
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

  const onSubmit = async (values: BlockFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createBlockAction(values);
      if (result.success) {
        toast.success("Solicitud de bloqueo creada");
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
          <DialogTitle>Nueva solicitud de bloqueo</DialogTitle>
          <DialogDescription>
            Registra una solicitud de bloqueo de equipo. El equipo se marca como
            bloqueado cuando la solicitud sea confirmada.
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
            <Select value={watch("credit_id") ?? ""} onValueChange={handleCreditChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {watch("credit_id")
                    ? `${credits.find((c) => c.id === watch("credit_id"))?.credit_number ?? "Crédito"} · ${credits.find((c) => c.id === watch("credit_id"))?.device_label ?? ""}`
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
            <Label htmlFor="diagnoses">Diagnósticos</Label>
            <Textarea
              id="diagnoses"
              placeholder="Diagnósticos del equipo / información para el proveedor"
              {...register("diagnoses")}
              aria-invalid={!!errors.diagnoses}
            />
            {errors.diagnoses && (
              <p className="text-xs text-destructive">{errors.diagnoses.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea
              id="reason"
              placeholder="Describe el motivo del bloqueo"
              {...register("reason")}
              aria-invalid={!!errors.reason}
            />
            {errors.reason && (
              <p className="text-xs text-destructive">{errors.reason.message}</p>
            )}
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
