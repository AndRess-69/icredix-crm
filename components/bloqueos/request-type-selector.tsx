"use client";

import * as React from "react";
import { Lock, Unlock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BlockFormDialog } from "@/components/bloqueos/block-form-dialog";
import {
  UnblockFormDialog,
  type UnblockFormPrefill,
} from "@/components/bloqueos/unblock-form-dialog";
import type {
  ClientOption,
  PaymentWithRelations,
} from "@/types";

type Step = "select" | "block" | "unblock";

interface RequestTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  payments: PaymentWithRelations[];
  prefill?: UnblockFormPrefill | null;
}

export function RequestTypeSelector({
  open,
  onOpenChange,
  clients,
  payments,
  prefill,
}: RequestTypeSelectorProps) {
  const [step, setStep] = React.useState<Step>("select");

  React.useEffect(() => {
    if (!open) {
      // Reset to select step when dialog closes
      const timer = setTimeout(() => setStep("select"), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSelectType = (type: Step) => {
    setStep(type);
  };

  const handleFormClose = () => {
    onOpenChange(false);
  };

  return (
    <>
      {/* Step 1: Type selector */}
      <Dialog open={open && step === "select"} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva solicitud</DialogTitle>
            <DialogDescription>
              ¿Qué deseas hacer?
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleSelectType("block")}
              className="flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/60"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-destructive/10">
                <Lock className="size-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium">Bloquear equipo</p>
                <p className="text-sm text-muted-foreground">
                  Solicitar bloqueo de equipo por mora u otra causa
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectType("unblock")}
              className="flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/60"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
                <Unlock className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium">Desbloquear equipo</p>
                <p className="text-sm text-muted-foreground">
                  Solicitar desbloqueo de equipo bloqueado
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2a: Block form */}
      <BlockFormDialog
        open={open && step === "block"}
        onOpenChange={(o) => {
          if (!o) handleFormClose();
        }}
        clients={clients}
      />

      {/* Step 2b: Unblock form */}
      <UnblockFormDialog
        open={open && step === "unblock"}
        onOpenChange={(o) => {
          if (!o) handleFormClose();
        }}
        clients={clients}
        payments={payments}
        prefill={prefill}
      />
    </>
  );
}
