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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createDeviceReferenceAction,
  updateDeviceReferenceAction,
} from "@/lib/actions/deviceReferences";
import {
  deviceReferenceSchema,
  type DeviceReferenceFormValues,
} from "@/lib/validators/deviceReferences";
import type { DeviceReference } from "@/types";

interface DeviceReferenceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference?: DeviceReference | null;
}

const emptyValues: DeviceReferenceFormValues = {
  brand: "Apple",
  model: "",
  capacity: "",
  color: "",
};

function toFormValues(ref: DeviceReference): DeviceReferenceFormValues {
  return {
    brand: ref.brand,
    model: ref.model,
    capacity: ref.capacity ?? "",
    color: ref.color ?? "",
  };
}

export function DeviceReferenceFormDialog({
  open,
  onOpenChange,
  reference,
}: DeviceReferenceFormDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeviceReferenceFormValues>({
    resolver: zodResolver(deviceReferenceSchema),
    defaultValues: emptyValues,
  });

  React.useEffect(() => {
    if (open) {
      reset(reference ? toFormValues(reference) : emptyValues);
    }
  }, [open, reference, reset]);

  const onSubmit = async (values: DeviceReferenceFormValues) => {
    setIsSubmitting(true);
    try {
      const result = reference
        ? await updateDeviceReferenceAction(reference.id, values)
        : await createDeviceReferenceAction(values);

      if (result.success) {
        toast.success(reference ? "Referencia actualizada" : "Referencia creada");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al guardar la referencia");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {reference ? "Editar referencia" : "Nueva referencia"}
          </DialogTitle>
          <DialogDescription>
            {reference
              ? "Actualiza los datos de la referencia."
              : "Agrega una nueva referencia de equipo al catálogo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" placeholder="Apple" {...register("brand")} />
              {errors.brand && (
                <p className="text-xs text-destructive">{errors.brand.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                placeholder="iPhone 17 Pro Max"
                {...register("model")}
              />
              {errors.model && (
                <p className="text-xs text-destructive">{errors.model.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidad (opcional)</Label>
              <Input id="capacity" placeholder="256 GB" {...register("capacity")} />
              {errors.capacity && (
                <p className="text-xs text-destructive">
                  {errors.capacity.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color (opcional)</Label>
              <Input id="color" placeholder="Azul titanio" {...register("color")} />
              {errors.color && (
                <p className="text-xs text-destructive">{errors.color.message}</p>
              )}
            </div>
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
              {reference ? "Guardar cambios" : "Crear referencia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
