"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateClientValidationAction } from "@/lib/actions/clients";
import {
  CLIENT_VALIDATION_STATUSES,
  getClientValidationStatusInfo,
} from "@/lib/utils/status";
import type { Client, ClientValidationStatus } from "@/types";

interface ClientValidationFormProps {
  client: Client;
}

export function ClientValidationForm({ client }: ClientValidationFormProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<ClientValidationStatus>(
    client.validation_status
  );
  const [requestDate, setRequestDate] = React.useState(
    client.request_date ?? ""
  );
  const [result, setResult] = React.useState(client.validation_result ?? "");
  const [notes, setNotes] = React.useState(client.validation_notes ?? "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await updateClientValidationAction(client.id, {
        status,
        request_date: requestDate,
        result,
        notes,
      });
      if (res.success) {
        toast.success("Validación actualizada");
        router.refresh();
      } else {
        toast.error(res.error ?? "Error al guardar la validación");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="validation_status">Estado</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as ClientValidationStatus)}
          >
            <SelectTrigger id="validation_status" className="w-full">
              <SelectValue>
                {getClientValidationStatusInfo(status).label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CLIENT_VALIDATION_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {getClientValidationStatusInfo(option).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="request_date">Fecha de solicitud</Label>
          <Input
            id="request_date"
            type="date"
            value={requestDate}
            onChange={(event) => setRequestDate(event.target.value)}
          />
        </div>
      </div>

      {client.approval_date && (
        <p className="text-sm text-muted-foreground">
          Fecha de aprobación:{" "}
          <span className="font-medium">
            {new Date(client.approval_date).toLocaleDateString("es-CO")}
          </span>
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="validation_result">Resultado</Label>
        <Textarea
          id="validation_result"
          placeholder="Resultado del estudio (ej. aprobado por buró, revisado el 12/08)"
          value={result}
          onChange={(event) => setResult(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="validation_notes">Observaciones</Label>
        <Textarea
          id="validation_notes"
          placeholder="Notas internas del proceso de validación"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Guardar validación
        </Button>
      </div>
    </div>
  );
}
