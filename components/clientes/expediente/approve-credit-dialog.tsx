"use client";

import * as React from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExpedienteCredit } from "@/types";

interface ApproveCreditDialogProps {
  credit: ExpedienteCredit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (approvalDate?: string) => void;
}

export function ApproveCreditDialog({
  credit,
  open,
  onOpenChange,
  onConfirm,
}: ApproveCreditDialogProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = React.useState(today);

  React.useEffect(() => {
    if (open) {
      setDate(today);
    }
  }, [open, today]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aprobar crédito</DialogTitle>
          <DialogDescription>
            Al aprobar, la fecha de aprobación será la nueva fecha de inicio y
            las cuotas se regresarán desde esa fecha.
          </DialogDescription>
        </DialogHeader>

        {credit && (
          <div className="space-y-4">
            <p className="text-sm">
              Crédito: <span className="font-semibold">{credit.credit_number}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="approval-date">Fecha de aprobación</Label>
              <Input
                id="approval-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={today}
              />
              <p className="text-xs text-muted-foreground">
                Esta será la nueva fecha de inicio del crédito. Las cuotas se
                recalculan desde esta fecha.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(date)}>Aprobar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
