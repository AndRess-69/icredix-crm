"use client";

import * as React from "react";
import { Mail, MapPin, Pencil, Phone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "@/components/clientes/client-form-dialog";
import { ClientValidationForm } from "@/components/clientes/expediente/client-validation-form";
import { getClientValidationStatusInfo } from "@/lib/utils/status";
import { formatDate } from "@/lib/utils/format";
import type { ClientExpediente } from "@/types";

interface ExpedienteInformacionProps {
  expediente: ClientExpediente;
}

export function ExpedienteInformacion({ expediente }: ExpedienteInformacionProps) {
  const client = expediente.client;
  const [editOpen, setEditOpen] = React.useState(false);
  const validation = getClientValidationStatusInfo(client.validation_status);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Información personal</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Nombre completo</p>
              <p className="font-medium">{`${client.first_name} ${client.last_name}`.trim()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cédula</p>
              <p className="font-medium">{client.cedula}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Teléfono</p>
              <p className="flex items-center gap-1.5 font-medium">
                <Phone className="size-3.5 text-muted-foreground" />
                {client.phone || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Correo</p>
              <p className="flex items-center gap-1.5 font-medium">
                <Mail className="size-3.5 text-muted-foreground" />
                {client.email || "—"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Dirección</p>
              <p className="flex items-center gap-1.5 font-medium">
                <MapPin className="size-3.5 text-muted-foreground" />
                {[client.city, client.address].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Fecha de nacimiento</p>
              <p className="font-medium">{formatDate(client.birth_date)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Registrado</p>
              <p className="font-medium">{formatDate(client.created_at)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Notas</p>
              <p className="font-medium">{client.notes || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            Solicitud / Validación
            <Badge variant={validation.variant}>{validation.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientValidationForm client={client} />
        </CardContent>
      </Card>

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
      />
    </div>
  );
}
