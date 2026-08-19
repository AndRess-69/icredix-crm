"use client";

import * as React from "react";
import {
  Camera,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Smartphone,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getClientDetailAction } from "@/lib/actions/clients";
import {
  getCreditStatusInfo,
  getInstallmentStatusInfo,
  getPaymentMethodLabel,
} from "@/lib/utils/status";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { isImageType } from "@/lib/utils/storage";
import type { ClientDetail } from "@/types";

interface ClientDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
}

export function ClientDetailDialog({
  open,
  onOpenChange,
  clientId,
}: ClientDetailDialogProps) {
  const [detail, setDetail] = React.useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !clientId) return;
    setIsLoading(true);
    setDetail(null);
    getClientDetailAction(clientId)
      .then(setDetail)
      .finally(() => setIsLoading(false));
  }, [open, clientId]);

  const client = detail?.client;

  const totalPending = (detail?.pendingInstallments ?? []).reduce(
    (sum, installment) => sum + installment.amount,
    0
  );

  const totalPaid = (detail?.payments ?? []).reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {client
              ? `${client.first_name} ${client.last_name}`.trim()
              : "Detalle del cliente"}
          </DialogTitle>
          <DialogDescription>
            {client ? `C.C. ${client.cedula}` : " "}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se pudo cargar la información del cliente.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                {detail.client.phone || "—"}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                {detail.client.email || "—"}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                {[detail.client.city, detail.client.address]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
              <p className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                Registrado {formatDate(detail.client.created_at)}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Créditos y equipos</h4>
              {detail.credits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin créditos registrados.
                </p>
              ) : (
                <div className="space-y-2">
                  {detail.credits.map((credit) => {
                    const info = getCreditStatusInfo(credit.status);
                    return (
                      <div
                        key={credit.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                            <Smartphone className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-primary">
                              {credit.credit_number}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {credit.device_label ?? "Sin equipo"} · IMEI{" "}
                              {credit.imei}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(credit.balance)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {credit.pending_count} cuota(s) pendiente(s)
                            </p>
                          </div>
                          <Badge variant={info.variant}>{info.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Fotos de entrega</h4>
              {detail.deliveryPhotos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin fotos de entrega registradas.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {detail.deliveryPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group overflow-hidden rounded-lg border"
                    >
                      {isImageType(photo.file_type) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.signed_url}
                          alt={photo.name}
                          onClick={() => window.open(photo.signed_url, "_blank")}
                          className="h-20 w-full cursor-zoom-in object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center bg-muted/50 p-1 text-center text-xs text-muted-foreground">
                          <Camera className="mr-1 size-3" />
                          Adjunto
                        </div>
                      )}
                      <p className="truncate border-t bg-card px-1.5 py-1 text-[11px] text-muted-foreground">
                        {photo.credit_number}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Pagos pendientes</h4>
                <p className="text-sm font-medium">
                  {formatCurrency(totalPending)}
                </p>
              </div>
              {detail.pendingInstallments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin cuotas pendientes.
                </p>
              ) : (
                <div className="max-h-48 overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Crédito</TableHead>
                        <TableHead>Cuota</TableHead>
                        <TableHead>Vence</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.pendingInstallments.map((installment) => {
                        const info = getInstallmentStatusInfo(installment.status);
                        return (
                          <TableRow key={installment.id}>
                            <TableCell className="font-medium">
                              {installment.credit_number}
                            </TableCell>
                            <TableCell>{installment.number}</TableCell>
                            <TableCell>
                              {formatDate(installment.due_date)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(installment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={info.variant}>{info.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Pagos realizados</h4>
                <p className="text-sm font-medium">{formatCurrency(totalPaid)}</p>
              </div>
              {detail.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin pagos registrados.
                </p>
              ) : (
                <div className="max-h-48 overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Crédito</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.created_at)}</TableCell>
                          <TableCell className="font-medium">
                            {payment.credit_number ?? "—"}
                          </TableCell>
                          <TableCell>
                            {getPaymentMethodLabel(payment.method)}
                          </TableCell>
                          <TableCell>{payment.reference || "—"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
