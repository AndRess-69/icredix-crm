"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  Smartphone,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExpedienteResumen } from "@/components/clientes/expediente/expediente-resumen";
import { ExpedienteInformacion } from "@/components/clientes/expediente/expediente-informacion";
import { ExpedienteCreditos } from "@/components/clientes/expediente/expediente-creditos";
import { ExpedienteEquipos } from "@/components/clientes/expediente/expediente-equipos";
import { ExpedienteDocumentos } from "@/components/clientes/expediente/expediente-documentos";
import { ExpedienteHistorial } from "@/components/clientes/expediente/expediente-historial";
import {
  getClientValidationStatusInfo,
  getCreditStatusInfo,
} from "@/lib/utils/status";
import type { ClientExpediente, DeviceReferenceOption } from "@/types";

interface ExpedienteTabsProps {
  expediente: ClientExpediente;
  deviceReferences: DeviceReferenceOption[];
  interestRate: number;
}

const TABS = [
  { value: "resumen", label: "Resumen", icon: LayoutDashboard },
  { value: "informacion", label: "Información", icon: User },
  { value: "creditos", label: "Créditos", icon: FileText },
  { value: "equipos", label: "Equipos", icon: Smartphone },
  { value: "documentos", label: "Documentos", icon: FolderOpen },
  { value: "historial", label: "Historial", icon: History },
] as const;

export function ExpedienteTabs({
  expediente,
  deviceReferences,
  interestRate,
}: ExpedienteTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") ?? "resumen";

  const setTab = (value: string) => {
    router.push(`/clientes/${expediente.client.id}?tab=${value}`, {
      scroll: false,
    });
  };

  const client = expediente.client;
  const validation = getClientValidationStatusInfo(client.validation_status);
  const activeCredits = expediente.credits.filter(
    (credit) => credit.status !== "finalizado"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0052FF]/10 text-lg font-semibold text-[#0052FF]">
            {`${client.first_name[0] ?? ""}${client.last_name[0] ?? ""}`.toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">
                {`${client.first_name} ${client.last_name}`.trim()}
              </h2>
              <span className="text-xs text-muted-foreground">Validación:</span>
              <Badge variant={validation.variant}>{validation.label}</Badge>
              {activeCredits.map((credit) => {
                const creditInfo = getCreditStatusInfo(credit.status);
                return (
                  <span key={credit.id} className="inline-flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Crédito:</span>
                    <Badge variant={creditInfo.variant}>
                      {credit.credit_number} · {creditInfo.label}
                    </Badge>
                  </span>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              CC {client.cedula} · {client.city ?? "Sin ciudad"} · Registrado{" "}
              {new Date(client.created_at).toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/clientes")}>
          ← Volver a clientes
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setTab(tab.value)}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {active === "resumen" && <ExpedienteResumen expediente={expediente} />}
      {active === "informacion" && (
        <ExpedienteInformacion expediente={expediente} />
      )}
      {active === "creditos" && (
        <ExpedienteCreditos
          expediente={expediente}
          deviceReferences={deviceReferences}
          interestRate={interestRate}
        />
      )}
      {active === "equipos" && <ExpedienteEquipos expediente={expediente} deviceReferences={deviceReferences} />}
      {active === "documentos" && (
        <ExpedienteDocumentos expediente={expediente} />
      )}
      {active === "historial" && <ExpedienteHistorial expediente={expediente} />}
    </div>
  );
}
