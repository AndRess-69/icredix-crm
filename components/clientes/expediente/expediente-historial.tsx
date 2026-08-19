"use client";

import * as React from "react";
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Lock,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Unlock,
} from "lucide-react";

import type {
  ClientExpediente,
  HistoryEvent,
  HistoryEventType,
} from "@/types";

interface ExpedienteHistorialProps {
  expediente: ClientExpediente;
}

const eventIcon: Record<HistoryEventType, React.ComponentType<{ className?: string }>> = {
  cliente_creado: UserPlus,
  validacion: ShieldCheck,
  credito_creado: CreditCard,
  credito_aprobado: CheckCircle2,
  pago: CreditCard,
  bloqueo: Lock,
  desbloqueo: Unlock,
  documento: FileText,
  equipo: Smartphone,
};

export function ExpedienteHistorial({ expediente }: ExpedienteHistorialProps) {
  if (expediente.history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay actividad registrada para este cliente.
      </p>
    );
  }

  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {expediente.history.map((event: HistoryEvent) => {
        const Icon = eventIcon[event.type];
        return (
          <li key={event.id} className="relative">
            <span className="absolute -left-[35px] flex size-5 items-center justify-center rounded-full border bg-background">
              <Icon className="size-3 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm font-medium">{event.title}</p>
              <p className="text-sm text-muted-foreground">{event.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                {formatHistoryDate(event.date)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function formatHistoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
