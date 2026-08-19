"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { updateDeviceLifecycleAction } from "@/lib/actions/devices";
import {
  DEVICE_STATUSES,
  getDeviceStatusInfo,
} from "@/lib/utils/status";
import type { Device, DeviceStatus } from "@/types";

interface DeviceLifecycleFormProps {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceLifecycleForm({
  device,
  open,
  onOpenChange,
}: DeviceLifecycleFormProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<DeviceStatus>("pendiente_asignacion");
  const [imei2, setImei2] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState("");
  const [deliveryDate, setDeliveryDate] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open && device) {
      setStatus(device.status);
      setImei2(device.imei2 ?? "");
      setPurchaseDate(device.purchase_date ?? "");
      setDeliveryDate(device.delivery_date ?? "");
    }
  }, [open, device]);

  const handleSubmit = async () => {
    if (!device) return;
    setIsSubmitting(true);
    try {
      const result = await updateDeviceLifecycleAction(device.id, {
        status,
        imei2,
        purchase_date: purchaseDate,
        delivery_date: deliveryDate,
      });
      if (result.success) {
        toast.success("Ciclo de vida del equipo actualizado");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al actualizar el equipo");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ciclo de vida del equipo</DialogTitle>
          <DialogDescription>
            {device
              ? `${device.brand} ${device.model} · IMEI ${device.imei ?? "—"}`
              : " "}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device_status">Estado</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as DeviceStatus)}
            >
              <SelectTrigger id="device_status" className="w-full">
                <SelectValue>
                  {getDeviceStatusInfo(status).label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DEVICE_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {getDeviceStatusInfo(option).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="device_imei2">IMEI secundario</Label>
            <Input
              id="device_imei2"
              placeholder="15 dígitos"
              maxLength={15}
              inputMode="numeric"
              value={imei2}
              onChange={(event) => setImei2(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="device_purchase_date">Fecha de compra</Label>
              <Input
                id="device_purchase_date"
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device_delivery_date">Fecha de entrega</Label>
              <Input
                id="device_delivery_date"
                type="date"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
