"use client";

import * as React from "react";
import { Smartphone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeviceLifecycleForm } from "@/components/clientes/expediente/device-lifecycle-form";
import { getDeviceStatusInfo } from "@/lib/utils/status";
import { formatDate } from "@/lib/utils/format";
import type { ClientExpediente, Device } from "@/types";

interface ExpedienteEquiposProps {
  expediente: ClientExpediente;
}

export function ExpedienteEquipos({ expediente }: ExpedienteEquiposProps) {
  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null);

  const devices = React.useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ device: Device; credits: string[] }> = [];
    for (const credit of expediente.credits) {
      const device = credit.device;
      if (!device) continue;
      const existing = list.find((entry) => entry.device.id === device.id);
      if (existing) {
        existing.credits.push(credit.credit_number);
      } else {
        seen.add(device.id);
        list.push({ device, credits: [credit.credit_number] });
      }
    }
    return list;
  }, [expediente.credits]);

  if (devices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        El cliente no tiene equipos asociados a sus créditos.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {devices.map(({ device, credits }) => {
        const info = getDeviceStatusInfo(device.status);
        return (
          <Card key={device.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Smartphone className="mt-0.5 size-5 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {device.brand} {device.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[device.capacity, device.color].filter(Boolean).join(" · ") ||
                        "Sin especificar"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      IMEI {device.imei ?? "—"}
                      {device.imei2 ? ` · IMEI2 ${device.imei2}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={info.variant}>{info.label}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedDevice(device)}
                  >
                    Gestionar ciclo de vida
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Compra:{" "}
                  <span className="font-medium">
                    {device.purchase_date
                      ? formatDate(device.purchase_date)
                      : "—"}
                  </span>
                </span>
                <span>
                  Entrega:{" "}
                  <span className="font-medium">
                    {device.delivery_date ? formatDate(device.delivery_date) : "—"}
                  </span>
                </span>
                <span>
                  Crédito(s):{" "}
                  <span className="font-medium">{credits.join(", ")}</span>
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <DeviceLifecycleForm
        device={selectedDevice}
        open={!!selectedDevice}
        onOpenChange={(open) => {
          if (!open) setSelectedDevice(null);
        }}
      />
    </div>
  );
}
