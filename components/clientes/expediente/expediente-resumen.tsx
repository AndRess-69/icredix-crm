"use client";

import {
  CalendarClock,
  CreditCard,
  FileText,
  Smartphone,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  getBlockStatusInfo,
  getCreditStatusInfo,
  getDeviceStatusInfo,
  getPaymentMethodLabel,
} from "@/lib/utils/status";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { ClientExpediente } from "@/types";

interface ExpedienteResumenProps {
  expediente: ClientExpediente;
}

export function ExpedienteResumen({ expediente }: ExpedienteResumenProps) {
  const router = useRouter();
  const clientId = expediente.client.id;
  const credits = expediente.credits;

  const activeCredits = credits.filter((credit) => credit.status !== "finalizado");
  const totalBalance = credits.reduce((sum, credit) => sum + credit.balance, 0);
  const lastPayment = expediente.payments[0] ?? null;
  const nextDue = credits
    .map((credit) => credit.next_due)
    .filter((date): date is string => Boolean(date))
    .sort()[0];

  const latestCredit = credits[0] ?? null;
  const currentDevice = latestCredit?.device ?? null;

  const portfolioStatus = credits.some((credit) => credit.status === "en_mora")
    ? "En mora"
    : credits.some((credit) => credit.status === "bloqueado")
      ? "Bloqueado"
      : credits.some((credit) => credit.status === "desbloqueado")
        ? "Desbloqueado"
        : activeCredits.length > 0
          ? "Activo"
          : "Sin créditos";

  const pendingBlocks = expediente.blocks.filter(
    (block) => block.status !== "confirmado"
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Créditos activos</p>
            <p className="mt-1 text-2xl font-semibold">{activeCredits.length}</p>
            <p className="text-xs text-muted-foreground">
              {credits.length} en total · Cartera: {portfolioStatus}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Saldo total</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCurrency(totalBalance)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(
                credits.reduce((sum, credit) => sum + credit.total_paid, 0)
              )}{" "}
              pagado en total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Último pago</p>
            <p className="mt-1 text-2xl font-semibold">
              {lastPayment ? formatCurrency(lastPayment.amount) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {lastPayment
                ? `${getPaymentMethodLabel(lastPayment.method)} · ${formatDate(lastPayment.created_at)}`
                : "Sin pagos registrados"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Próximo vencimiento</p>
            <p className="mt-1 text-2xl font-semibold">
              {nextDue ? formatDate(nextDue) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {pendingBlocks} bloqueo(s) pendiente(s)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-muted-foreground" />
              Créditos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {credits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                El cliente aún no tiene créditos.
              </p>
            ) : (
              credits.slice(0, 5).map((credit) => {
                const info = getCreditStatusInfo(credit.status);
                return (
                  <div
                    key={credit.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-primary">
                        {credit.credit_number}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {credit.paid_count}/{credit.installments_count} cuotas
                        pagadas · Próximo:{" "}
                        {credit.next_due ? formatDate(credit.next_due) : "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className="font-medium">{formatCurrency(credit.balance)}</p>
                      <Badge variant={info.variant}>{info.label}</Badge>
                    </div>
                  </div>
                );
              })
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => router.push(`/clientes/${clientId}?tab=creditos`)}
            >
              Ver todos los créditos
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="size-4 text-muted-foreground" />
                Equipo actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentDevice ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">
                    {currentDevice.brand} {currentDevice.model}
                  </p>
                  <p className="text-muted-foreground">
                    {[currentDevice.capacity, currentDevice.color]
                      .filter(Boolean)
                      .join(" · ") || "Sin especificar"}{" "}
                    · IMEI {currentDevice.imei ?? "—"}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant={getDeviceStatusInfo(currentDevice.status).variant}>
                      {getDeviceStatusInfo(currentDevice.status).label}
                    </Badge>
                    {currentDevice.delivery_date && (
                      <span className="text-xs text-muted-foreground">
                        Entregado {formatDate(currentDevice.delivery_date)}
                      </span>
                    )}
                  </div>
                </div>
              ) : latestCredit ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">
                    {latestCredit.credit_number} · sin equipo asignado
                  </p>
                  <p className="text-muted-foreground">
                    IMEI {latestCredit.imei ?? "—"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push(`/clientes/${clientId}?tab=equipos`)}
                  >
                    Asociar equipo / registrar IMEI
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin equipo.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-muted-foreground" />
                Documentos y actividad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Documentos cargados</span>
                <span className="font-medium">{expediente.documents.length}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Bloqueos / desbloqueos</span>
                <span className="font-medium">
                  {expediente.blocks.length} / {expediente.unblocks.length}
                </span>
              </p>
              {expediente.blocks[0] && (
                <p className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Último bloqueo ({formatDate(expediente.blocks[0].block_date)})
                  </span>
                  <Badge
                    variant={getBlockStatusInfo(expediente.blocks[0].status).variant}
                  >
                    {getBlockStatusInfo(expediente.blocks[0].status).label}
                  </Badge>
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => router.push(`/clientes/${clientId}?tab=documentos`)}
                >
                  <FileText className="size-3.5" />
                  Documentos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => router.push(`/clientes/${clientId}?tab=historial`)}
                >
                  <CalendarClock className="size-3.5" />
                  Historial
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="size-4 text-muted-foreground" />
                Pagos recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {expediente.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin pagos.</p>
              ) : (
                expediente.payments.slice(0, 4).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {payment.credit_number ?? "—"}
                        {payment.installment_number != null
                          ? ` · Cuota ${payment.installment_number}`
                          : ""}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.created_at)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
