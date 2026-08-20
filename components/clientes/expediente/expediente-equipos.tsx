"use client";

import * as React from "react";
import { Smartphone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeviceLifecycleForm } from "@/components/clientes/expediente/device-lifecycle-form";
import { CreditDeviceForm } from "@/components/clientes/expediente/credit-device-form";
import {
  getCreditStatusInfo,
  getDeviceStatusInfo,
} from "@/lib/utils/status";
import type { ClientExpediente, Device, DeviceReferenceOption, ExpedienteCredit } from "@/types";

interface ExpedienteEquiposProps {
  expediente: ClientExpediente;
  deviceReferences: DeviceReferenceOption[];
}

type CreditEquipmentEntry = {
  credit: ExpedienteCredit;
  device: Device | null;
  deviceReference: { brand: string; model: string; capacity: string | null; color: string | null } | null;
  imei: string | null;
};

export function ExpedienteEquipos({ expediente, deviceReferences }: ExpedienteEquiposProps) {
  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null);
  const [editingCredit, setEditingCredit] = React.useState<ExpedienteCredit | null>(null);

  const equipmentEntries = React.useMemo<CreditEquipmentEntry[]>(() => {
    const list: CreditEquipmentEntry[] = [];
    for (const credit of expediente.credits) {
      const hasRef = !!credit.device_reference;
      const hasImei = !!credit.imei;
      const hasDevice = !!credit.device;
      if (hasRef || hasImei || hasDevice) {
        list.push({
          credit,
          device: credit.device ?? null,
          deviceReference: credit.device_reference ?? null,
          imei: credit.imei ?? null,
        });
      }
    }
    return list;
  }, [expediente.credits]);

  const creditsWithoutEquipment = React.useMemo(() => {
    return expediente.credits.filter(
      (c) => !c.device_reference && !c.imei && !c.device
    );
  }, [expediente.credits]);

  return (
    <div className="space-y-4">
      {equipmentEntries.length === 0 && creditsWithoutEquipment.length === 0 && (
        <p className="text-sm text-muted-foreground">
          El cliente aún no tiene créditos registrados.
        </p>
      )}

      {equipmentEntries.map(({ credit, device, deviceReference, imei }) => {
        const creditInfo = getCreditStatusInfo(credit.status);
        const deviceInfo = device ? getDeviceStatusInfo(device.status) : null;
        return (
          <Card key={credit.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Smartphone className="mt-0.5 size-5 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {credit.credit_number}
                    </p>
                    {deviceReference ? (
                      <p className="font-medium">
                        {deviceReference.brand} {deviceReference.model}
                        {[deviceReference.capacity, deviceReference.color]
                          .filter(Boolean).length > 0
                          ? ` · ${[deviceReference.capacity, deviceReference.color].filter(Boolean).join(" · ")}`
                          : ""}
                      </p>
                    ) : device ? (
                      <p className="font-medium">
                        {device.brand} {device.model}
                        {[device.capacity, device.color]
                          .filter(Boolean).length > 0
                          ? ` · ${[device.capacity, device.color].filter(Boolean).join(" · ")}`
                          : ""}
                      </p>
                    ) : (
                      <p className="font-medium text-muted-foreground">
                        Sin referencia
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      IMEI {imei ?? device?.imei ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={creditInfo.variant}>
                    Crédito: {creditInfo.label}
                  </Badge>
                  {deviceInfo && (
                    <Badge variant={deviceInfo.variant}>{deviceInfo.label}</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingCredit(credit)}
                  >
                    Asignar referencia / IMEI
                  </Button>
                  {device && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedDevice(device)}
                    >
                      Gestionar ciclo de vida
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {creditsWithoutEquipment.map((credit) => {
        const creditInfo = getCreditStatusInfo(credit.status);
        return (
          <Card key={credit.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Smartphone className="mt-0.5 size-5 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {credit.credit_number}
                    </p>
                    <p className="font-medium text-muted-foreground">
                      Este crédito todavía no tiene equipo/IMEI asignado.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={creditInfo.variant}>
                    Crédito: {creditInfo.label}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingCredit(credit)}
                  >
                    Asignar referencia / IMEI
                  </Button>
                </div>
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

      <CreditDeviceForm
        credit={editingCredit}
        deviceReferences={deviceReferences}
        open={!!editingCredit}
        onOpenChange={(open) => {
          if (!open) setEditingCredit(null);
        }}
      />
    </div>
  );
}
