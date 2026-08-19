"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { registerCreditImeiAction } from "@/lib/actions/credits";
import type { ExpedienteCredit } from "@/types";

interface CreditImeiFormProps {
  credit: ExpedienteCredit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditImeiForm({
  credit,
  open,
  onOpenChange,
}: CreditImeiFormProps) {
  const router = useRouter();
  const [imei, setImei] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) setImei("");
  }, [open]);

  const handleSubmit = async () => {
    if (!credit) return;
    setIsSubmitting(true);
    try {
      const result = await registerCreditImeiAction(credit.id, imei);
      if (result.success) {
        toast.success("IMEI registrado");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al registrar el IMEI");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar IMEI</DialogTitle>
          <DialogDescription>
            {credit ? `Crédito ${credit.credit_number}. Se registra cuando el equipo ya fue adquirido o asignado.` : " "}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="credit_imei">IMEI</Label>
          <Input
            id="credit_imei"
            placeholder="15 dígitos"
            maxLength={15}
            inputMode="numeric"
            value={imei}
            onChange={(event) => setImei(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Si el crédito tiene equipo asociado sin IMEI, se actualiza también en
            el inventario.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Guardar IMEI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
