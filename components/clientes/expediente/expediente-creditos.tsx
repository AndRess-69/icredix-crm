"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, ChevronDown, ChevronRight, Pencil, Plus, RotateCcw, Smartphone, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditImeiForm } from "@/components/clientes/expediente/credit-imei-form";
import { CreditPaymentDialog } from "@/components/clientes/expediente/credit-payment-dialog";
import { CreditDeviceForm } from "@/components/clientes/expediente/credit-device-form";
import { CreditFormDialog } from "@/components/creditos/credit-form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApproveCreditDialog } from "@/components/clientes/expediente/approve-credit-dialog";
import {
  approveCreditAction,
  denyCreditAction,
  markInProgressCreditAction,
} from "@/lib/actions/credits";
import {
  getCreditStatusInfo,
  getDeviceStatusInfo,
  getInstallmentStatusInfo,
  getPaymentMethodLabel,
} from "@/lib/utils/status";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type {
  ClientExpediente,
  CreditWithRelations,
  DeviceReferenceOption,
  ExpedienteCredit,
} from "@/types";

interface ExpedienteCreditosProps {
  expediente: ClientExpediente;
  deviceReferences: DeviceReferenceOption[];
  interestRate: number;
}

export function ExpedienteCreditos({
  expediente,
  deviceReferences,
  interestRate,
}: ExpedienteCreditosProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [imeiCredit, setImeiCredit] = React.useState<ClientExpediente["credits"][number] | null>(null);
  const [creditDialogOpen, setCreditDialogOpen] = React.useState(false);
  const [paymentCredit, setPaymentCredit] = React.useState<ExpedienteCredit | null>(null);
  const [deviceCredit, setDeviceCredit] = React.useState<ExpedienteCredit | null>(null);
  const [editingCredit, setEditingCredit] = React.useState<ExpedienteCredit | null>(null);
  const [approvingCredit, setApprovingCredit] = React.useState<ExpedienteCredit | null>(null);
  const [denyingCredit, setDenyingCredit] = React.useState<ExpedienteCredit | null>(null);
  const [markingInProgressCredit, setMarkingInProgressCredit] = React.useState<ExpedienteCredit | null>(null);

  const clientOption = React.useMemo(
    () => ({
      id: expediente.client.id,
      first_name: expediente.client.first_name,
      last_name: expediente.client.last_name,
      cedula: expediente.client.cedula,
    }),
    [expediente.client]
  );

  const clientName = React.useMemo(
    () => `${expediente.client.first_name} ${expediente.client.last_name}`.trim(),
    [expediente.client]
  );

  const paymentsByCredit = React.useMemo(() => {
    const map = new Map<string, ClientExpediente["payments"]>();
    for (const payment of expediente.payments) {
      const list = map.get(payment.credit_id) ?? [];
      list.push(payment);
      map.set(payment.credit_id, list);
    }
    return map;
  }, [expediente.payments]);

  const handleApprove = async (approvalDate?: string) => {
    if (!approvingCredit) return;
    const result = await approveCreditAction(approvingCredit.id, approvalDate);
    if (result.success) {
      toast.success("Crédito aprobado");
      setApprovingCredit(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al aprobar el crédito");
    }
  };

  const handleDeny = async () => {
    if (!denyingCredit) return;
    const result = await denyCreditAction(denyingCredit.id);
    if (result.success) {
      toast.success("Crédito negado");
      setDenyingCredit(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al negar el crédito");
    }
  };

  const handleMarkInProgress = async () => {
    if (!markingInProgressCredit) return;
    const result = await markInProgressCreditAction(markingInProgressCredit.id);
    if (result.success) {
      toast.success("Crédito marcado como en proceso");
      setMarkingInProgressCredit(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al cambiar estado del crédito");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Créditos del cliente</h3>
          <p className="text-sm text-muted-foreground">
            {expediente.credits.length} crédito(s) · Saldo total{" "}
            {formatCurrency(
              expediente.credits.reduce((sum, credit) => sum + credit.balance, 0)
            )}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreditDialogOpen(true)}>
          <Plus className="size-4" />
          Nuevo crédito
        </Button>
      </div>
      {expediente.credits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          El cliente aún no tiene créditos registrados.
        </p>
      ) : (
        expediente.credits.map((credit) => {
          const info = getCreditStatusInfo(credit.status);
          const isExpanded = expandedId === credit.id;
          const creditPayments = paymentsByCredit.get(credit.id) ?? [];
          return (
            <Card key={credit.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : credit.id)
                      }
                      className="flex min-w-0 items-center gap-2 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-semibold text-primary">
                        {credit.credit_number}
                      </span>
                      <Badge variant={info.variant}>{info.label}</Badge>
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-medium">{formatCurrency(credit.balance)}</p>
                      <p className="text-xs text-muted-foreground">
                        Saldo · {credit.paid_count}/{credit.installments_count}{" "}
                        cuotas
                      </p>
                    </div>
                  <div className="flex items-center gap-2">
                    {credit.status === "en_proceso" && (
                      <>
                        <Button size="sm" onClick={() => setApprovingCredit(credit)}>
                          <BadgeCheck className="size-3.5" />
                          Aprobar
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDenyingCredit(credit)}>
                          <XCircle className="size-3.5" />
                          Negar
                        </Button>
                      </>
                    )}
                    {(credit.status === "negado" || credit.status === "activo") && (
                      <Button size="sm" variant="outline" onClick={() => setMarkingInProgressCredit(credit)}>
                        <RotateCcw className="size-3.5" />
                        En proceso
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setEditingCredit(credit); setCreditDialogOpen(true); }}>
                      <Pencil className="size-3.5" />
                    </Button>
                    {!credit.device_reference && (
                      <Button size="sm" variant="outline" onClick={() => setDeviceCredit(credit)}>
                        Asociar referencia
                      </Button>
                    )}
                    {!credit.imei && (
                      <Button size="sm" variant="outline" onClick={() => setImeiCredit(credit)}>
                        Registrar IMEI
                      </Button>
                    )}
                    {credit.pending_count > 0 && (
                      <Button size="sm" onClick={() => setPaymentCredit(credit)}>
                        Registrar pago
                      </Button>
                    )}
                  </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Valor del equipo</p>
                        <p className="font-medium">{formatCurrency(credit.device_value)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cuota inicial</p>
                        <p className="font-medium">{formatCurrency(credit.initial_payment)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor financiado</p>
                        <p className="font-medium">{formatCurrency(credit.financed_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tasa de interés</p>
                        <p className="font-medium">{credit.interest_rate}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">N° de cuotas</p>
                        <p className="font-medium">{credit.installments_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor de cuota</p>
                        <p className="font-medium">{formatCurrency(credit.installment_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fecha de inicio</p>
                        <p className="font-medium">{formatDate(credit.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fecha solicitud</p>
                        <p className="font-medium">{formatDate(credit.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fecha de aprobación</p>
                        {credit.approval_date ? (
                          <p className="font-medium text-emerald-600">{formatDate(credit.approval_date)}</p>
                        ) : (
                          <p className="font-medium text-amber-600">Sin aprobar</p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Próximo vencimiento</p>
                        <p className="font-medium">
                          {credit.next_due ? formatDate(credit.next_due) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total pagado</p>
                        <p className="font-medium">{formatCurrency(credit.total_paid)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cuotas pagadas</p>
                        <p className="font-medium">{credit.paid_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cuotas pendientes</p>
                        <p className="font-medium">{credit.pending_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Estado de cartera</p>
                        <p className="font-medium">{info.label}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Referencia / Equipo</h4>
                      {credit.device_reference ? (
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                          <Smartphone className="size-4 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="font-medium">
                              {credit.device_reference.brand} {credit.device_reference.model}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[credit.device_reference.capacity, credit.device_reference.color]
                                .filter(Boolean)
                                .join(" · ") || "Sin especificar"}{" "}
                              · IMEI {credit.imei ?? "—"}
                            </p>
                          </div>
                        </div>
                      ) : credit.device ? (
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                          <Smartphone className="size-4 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="font-medium">
                              {credit.device.brand} {credit.device.model}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[credit.device.capacity, credit.device.color]
                                .filter(Boolean)
                                .join(" · ") || "Sin especificar"}{" "}
                              · IMEI {credit.imei ?? "—"}
                            </p>
                          </div>
                          <Badge variant={getDeviceStatusInfo(credit.device.status).variant}>
                            {getDeviceStatusInfo(credit.device.status).label}
                          </Badge>
                          {credit.device.delivery_date && (
                            <span className="text-xs text-muted-foreground">
                              Entregado {formatDate(credit.device.delivery_date)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Sin referencia asociada. IMEI {credit.imei ?? "—"}.
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Cuotas</h4>
                      <div className="max-h-64 overflow-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead>#</TableHead>
                              <TableHead>Vence</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {credit.installments.map((installment) => {
                              const instInfo = getInstallmentStatusInfo(installment.status);
                              return (
                                <TableRow key={installment.id}>
                                  <TableCell>{installment.number}</TableCell>
                                  <TableCell>{formatDate(installment.due_date)}</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(installment.amount)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={instInfo.variant}>
                                      {instInfo.label}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Pagos</h4>
                      {creditPayments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Sin pagos registrados para este crédito.
                        </p>
                      ) : (
                        <div className="max-h-64 overflow-auto rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/40">
                                <TableHead>Fecha</TableHead>
                                <TableHead>Cuota</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Referencia</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {creditPayments.map((payment) => (
                                <TableRow key={payment.id}>
                                  <TableCell>{formatDate(payment.created_at)}</TableCell>
                                  <TableCell>
                                    {payment.installment_number != null
                                      ? `Cuota ${payment.installment_number}`
                                      : "Abono"}
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

                <Separator className="mt-4" />
              </CardContent>
            </Card>
          );
        })
      )}

      <CreditImeiForm
        credit={imeiCredit}
        open={!!imeiCredit}
        onOpenChange={(open) => {
          if (!open) setImeiCredit(null);
        }}
      />

      <CreditFormDialog
        open={creditDialogOpen}
        onOpenChange={(open) => {
          setCreditDialogOpen(open);
          if (!open) setEditingCredit(null);
        }}
        clients={[clientOption]}
        deviceReferences={deviceReferences}
        interestRate={interestRate}
        client={clientOption}
        credit={editingCredit as unknown as CreditWithRelations | null}
      />

      <CreditDeviceForm
        credit={deviceCredit}
        deviceReferences={deviceReferences}
        open={!!deviceCredit}
        onOpenChange={(open) => {
          if (!open) setDeviceCredit(null);
        }}
      />

      <CreditPaymentDialog
        credit={paymentCredit}
        clientName={clientName}
        open={!!paymentCredit}
        onOpenChange={(open) => {
          if (!open) setPaymentCredit(null);
        }}
      />

      <ApproveCreditDialog
        credit={approvingCredit}
        open={!!approvingCredit}
        onOpenChange={(open) => {
          if (!open) setApprovingCredit(null);
        }}
        onConfirm={handleApprove}
      />

      <ConfirmDialog
        open={!!denyingCredit}
        onOpenChange={(open) => {
          if (!open) setDenyingCredit(null);
        }}
        title="Negar crédito"
        description={`¿Confirmas que deseas negar el crédito ${denyingCredit?.credit_number ?? ""}? El estado cambiará a "Negado".`}
        confirmLabel="Negar"
        onConfirm={handleDeny}
      />

      <ConfirmDialog
        open={!!markingInProgressCredit}
        onOpenChange={(open) => {
          if (!open) setMarkingInProgressCredit(null);
        }}
        title="Marcar en proceso"
        description={`¿Confirmas que deseas volver a "En proceso" el crédito ${markingInProgressCredit?.credit_number ?? ""}?`}
        confirmLabel="Confirmar"
        onConfirm={handleMarkInProgress}
      />
    </div>
  );
}
