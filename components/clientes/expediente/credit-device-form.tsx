"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { assignDeviceReferenceToCreditAction } from "@/lib/actions/credits";
import type { DeviceReferenceOption, ExpedienteCredit } from "@/types";

interface CreditDeviceFormProps {
  credit: ExpedienteCredit | null;
  deviceReferences: DeviceReferenceOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditDeviceForm({
  credit,
  deviceReferences,
  open,
  onOpenChange,
}: CreditDeviceFormProps) {
  const router = useRouter();
  const [referenceId, setReferenceId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) setReferenceId("");
  }, [open]);

  const selectedReference =
    deviceReferences.find((ref) => ref.id === referenceId) ?? null;

  const handleSubmit = async () => {
    if (!credit || !referenceId) return;
    setIsSubmitting(true);
    try {
      const result = await assignDeviceReferenceToCreditAction(
        credit.id,
        referenceId
      );
      if (result.success) {
        toast.success("Referencia asociada al crédito");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al asociar la referencia");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asociar referencia de equipo</DialogTitle>
          <DialogDescription>
            {credit
              ? `Crédito ${credit.credit_number}. Selecciona la referencia del equipo del catálogo.`
              : " "}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Referencia del equipo</Label>
            <Select
              value={referenceId}
              onValueChange={(value) => value && setReferenceId(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedReference
                    ? `${selectedReference.brand} ${selectedReference.model}`
                    : "Selecciona una referencia"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-(--anchor-width)">
                {deviceReferences.length === 0 && (
                  <SelectItem value="__none" disabled>
                    No hay referencias disponibles
                  </SelectItem>
                )}
                {deviceReferences.map((ref) => (
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

          {selectedReference && (
            <div className="grid gap-2 rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Referencia</span>
                <span className="font-medium">
                  {selectedReference.brand} {selectedReference.model}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Detalle</span>
                <span className="font-medium">
                  {[selectedReference.capacity, selectedReference.color]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!referenceId || isSubmitting}
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Asociar referencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
