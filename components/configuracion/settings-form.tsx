"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateCompanySettingsAction } from "@/lib/actions/company";
import {
  companySettingsSchema,
  type CompanySettingsValues,
} from "@/lib/validators/company";
import type { CompanySettingsPublic } from "@/types";

interface SettingsFormProps {
  settings: CompanySettingsPublic | null;
}

function toFormValues(
  settings: CompanySettingsPublic | null
): CompanySettingsValues {
  return {
    name: settings?.name ?? "",
    address: settings?.address ?? "",
    city: settings?.city ?? "",
    phone: settings?.phone ?? "",
    email: settings?.email ?? "",
    telegram_token: "",
    telegram_chat_id: settings?.telegram_chat_id ?? "",
    interest_rate: settings?.interest_rate ?? 10,
  };
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingValues, setPendingValues] =
    React.useState<CompanySettingsValues | null>(null);

  const originalInterest = settings?.interest_rate ?? 10;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanySettingsValues>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: toFormValues(settings),
  });

  const doSave = async (values: CompanySettingsValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateCompanySettingsAction(values);
      if (result.success) {
        toast.success("Configuración guardada");
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al guardar la configuración");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (values: CompanySettingsValues) => {
    if (values.interest_rate !== originalInterest) {
      setPendingValues(values);
      setConfirmOpen(true);
      return;
    }
    doSave(values);
  };

  const confirmSave = async () => {
    setConfirmOpen(false);
    if (pendingValues) {
      const values = pendingValues;
      setPendingValues(null);
      await doSave(values);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0052FF]/10 text-[#0052FF]">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Datos de la empresa
            </CardTitle>
            <CardDescription>
              Información general y configuración de Telegram para notificaciones.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="iCredix"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                placeholder="300 000 0000"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                placeholder="contacto@icredix.com"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" placeholder="Bogotá" {...register("city")} />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                placeholder="Calle 123 # 45-67"
                {...register("address")}
              />
              {errors.address && (
                <p className="text-xs text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram_token">Token de Telegram</Label>
              <Input
                id="telegram_token"
                type="password"
                autoComplete="off"
                placeholder={
                  settings?.has_telegram_token
                    ? "Token ya configurado"
                    : "123456:ABC-DEF..."
                }
                {...register("telegram_token")}
              />
              {settings?.has_telegram_token && (
                <p className="text-xs text-muted-foreground">
                  Ya hay un token configurado. Déjalo en blanco para
                  conservarlo.
                </p>
              )}
              {errors.telegram_token && (
                <p className="text-xs text-destructive">
                  {errors.telegram_token.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram_chat_id">Chat ID de Telegram</Label>
              <Input
                id="telegram_chat_id"
                placeholder="-1001234567890"
                {...register("telegram_chat_id")}
              />
              {errors.telegram_chat_id && (
                <p className="text-xs text-destructive">
                  {errors.telegram_chat_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="interest_rate">
                Porcentaje de interés (%)
              </Label>
              <Input
                id="interest_rate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                placeholder="10"
                {...register("interest_rate", { valueAsNumber: true })}
                aria-invalid={!!errors.interest_rate}
              />
              {errors.interest_rate && (
                <p className="text-xs text-destructive">
                  {errors.interest_rate.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Se suma sobre el valor a financiar al crear un crédito. Este
                cambio requiere confirmación.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar cambios
            </Button>
          </div>
        </form>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmOpen(false);
        }}
        title="Cambiar porcentaje de interés"
        description={`¿Seguro que quieres cambiar el porcentaje de interés de ${originalInterest}% a ${pendingValues?.interest_rate ?? ""}%? Este cambio afectará los créditos nuevos que se creen.`}
        confirmLabel="Confirmar cambio"
        onConfirm={confirmSave}
      />
    </Card>
  );
}
