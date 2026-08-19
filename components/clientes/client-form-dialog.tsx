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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createClientAction,
  updateClientAction,
} from "@/lib/actions/clients";
import { clientSchema, type ClientFormValues } from "@/lib/validators/clients";
import type { Client } from "@/types";

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

const emptyValues: ClientFormValues = {
  first_name: "",
  last_name: "",
  cedula: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  birth_date: "",
  notes: "",
};

function toFormValues(client: Client): ClientFormValues {
  return {
    first_name: client.first_name,
    last_name: client.last_name,
    cedula: client.cedula,
    phone: client.phone,
    email: client.email ?? "",
    address: client.address ?? "",
    city: client.city ?? "",
    birth_date: client.birth_date ?? "",
    notes: client.notes ?? "",
  };
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
}: ClientFormDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: emptyValues,
  });

  React.useEffect(() => {
    if (open) {
      reset(client ? toFormValues(client) : emptyValues);
    }
  }, [open, client, reset]);

  const onSubmit = async (values: ClientFormValues) => {
    setIsSubmitting(true);
    try {
      const result = client
        ? await updateClientAction(client.id, values)
        : await createClientAction(values);

      if (result.success) {
        toast.success(client ? "Cliente actualizado" : "Cliente creado");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al guardar el cliente");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {client
              ? "Actualiza los datos del cliente."
              : "Registra un nuevo cliente en el sistema."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                placeholder="Juan"
                {...register("first_name")}
                aria-invalid={!!errors.first_name}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellidos</Label>
              <Input
                id="last_name"
                placeholder="Pérez Gómez"
                {...register("last_name")}
                aria-invalid={!!errors.last_name}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cedula">Cédula</Label>
              <Input
                id="cedula"
                placeholder="1023456789"
                {...register("cedula")}
                aria-invalid={!!errors.cedula}
              />
              {errors.cedula && (
                <p className="text-xs text-destructive">{errors.cedula.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Celular</Label>
              <Input
                id="phone"
                placeholder="3001234567"
                {...register("phone")}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@correo.com"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Fecha de nacimiento (opcional)</Label>
              <Input id="birth_date" type="date" {...register("birth_date")} />
              {errors.birth_date && (
                <p className="text-xs text-destructive">{errors.birth_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad (opcional)</Label>
              <Input id="city" placeholder="Medellín" {...register("city")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección (opcional)</Label>
              <Input id="address" placeholder="Calle 1 # 2-3" {...register("address")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observaciones (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas internas del cliente"
              {...register("notes")}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {client ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
