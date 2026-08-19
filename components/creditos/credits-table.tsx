"use client";

import * as React from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { BadgeCheck, Camera, Eye, Pencil, Plus, Trash2, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreditFormDialog } from "@/components/creditos/credit-form-dialog";
import { ViewInstallmentsDialog } from "@/components/creditos/view-installments-dialog";
import { CreditDocumentsDialog } from "@/components/creditos/credit-documents-dialog";
import {
  approveCreditAction,
  denyCreditAction,
  markInProgressCreditAction,
  deleteCreditAction,
} from "@/lib/actions/credits";
import { getCreditStatusInfo } from "@/lib/utils/status";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { ClientOption, CreditWithRelations, DeviceReferenceOption } from "@/types";

interface CreditsTableProps {
  credits: CreditWithRelations[];
  clients: ClientOption[];
  deviceReferences: DeviceReferenceOption[];
  interestRate?: number | null;
}

export function CreditsTable({
  credits,
  clients,
  deviceReferences,
  interestRate,
}: CreditsTableProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CreditWithRelations | null>(null);
  const [deleting, setDeleting] = React.useState<CreditWithRelations | null>(null);
  const [viewing, setViewing] = React.useState<CreditWithRelations | null>(null);
  const [documentsCredit, setDocumentsCredit] =
    React.useState<CreditWithRelations | null>(null);
  const [approving, setApproving] = React.useState<CreditWithRelations | null>(
    null
  );
  const [denying, setDenying] = React.useState<CreditWithRelations | null>(
    null
  );
  const [markingInProgress, setMarkingInProgress] =
    React.useState<CreditWithRelations | null>(null);

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteCreditAction(deleting.id);
    if (result.success) {
      toast.success("Crédito eliminado");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar el crédito");
    }
  };

  const handleApprove = async () => {
    if (!approving) return;
    const result = await approveCreditAction(approving.id);
    if (result.success) {
      toast.success("Crédito aprobado");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al aprobar el crédito");
    }
  };

  const handleDeny = async () => {
    if (!denying) return;
    const result = await denyCreditAction(denying.id);
    if (result.success) {
      toast.success("Crédito negado");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al negar el crédito");
    }
  };

  const handleMarkInProgress = async () => {
    if (!markingInProgress) return;
    const result = await markInProgressCreditAction(markingInProgress.id);
    if (result.success) {
      toast.success("Crédito marcado como en proceso");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al cambiar estado del crédito");
    }
  };

  const columns = React.useMemo<LegacyColumnDef<CreditWithRelations, unknown>[]>(
    () => [
      {
        accessorKey: "credit_number",
        header: "N° crédito",
        cell: ({ row }) => (
          <span className="font-medium text-primary">{row.original.credit_number}</span>
        ),
      },
      {
        id: "client",
        header: "Cliente",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">
              {row.original.client
                ? `${row.original.client.first_name} ${row.original.client.last_name}`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.client?.cedula ?? ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "imei",
        header: "Referencia / IMEI",
        cell: ({ row }) => (
          <div>
            <p>
              {row.original.device_reference
                ? `${row.original.device_reference.brand} ${row.original.device_reference.model}`
                : row.original.device
                  ? `${row.original.device.brand} ${row.original.device.model}`
                  : "Sin referencia"}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.imei ?? "—"}</p>
          </div>
        ),
      },
      {
        accessorKey: "financed_amount",
        header: "Financiado",
        cell: ({ row }) => formatCurrency(row.original.financed_amount),
      },
      {
        accessorKey: "balance",
        header: "Saldo",
        cell: ({ row }) => (
          <span className="font-medium">{formatCurrency(row.original.balance)}</span>
        ),
      },
      {
        id: "installments",
        header: "Cuotas",
        cell: ({ row }) => (
          <span>
            {row.original.installments_count} ·{" "}
            {formatCurrency(row.original.installment_amount)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
          const info = getCreditStatusInfo(row.original.status);
          return <Badge variant={info.variant}>{info.label}</Badge>;
        },
      },
      {
        id: "fechas",
        header: "Solicitud / Aprobación",
        cell: ({ row }) => (
          <div className="text-xs">
            <p className="text-muted-foreground">
              Solicitud: {formatDate(row.original.created_at)}
            </p>
            {row.original.approval_date ? (
              <p className="font-medium text-emerald-600">
                Aprobado: {formatDate(row.original.approval_date)}
              </p>
            ) : (
              <p className="font-medium text-amber-600">
                Pendiente de aprobación
              </p>
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const st = row.original.status;
          return (
          <div className="flex items-center justify-end gap-1">
            {st === "en_proceso" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApproving(row.original)}
                  aria-label="Aprobar crédito"
                >
                  <BadgeCheck className="size-3.5" />
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDenying(row.original)}
                  aria-label="Negar crédito"
                >
                  <XCircle className="size-3.5" />
                  Negar
                </Button>
              </>
            )}
            {(st === "negado" || st === "activo") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMarkingInProgress(row.original)}
                aria-label="Marcar en proceso"
              >
                <RotateCcw className="size-3.5" />
                En proceso
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewing(row.original)}
              aria-label="Ver cuotas"
            >
              <Eye className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDocumentsCredit(row.original)}
              aria-label="Ver fotos de entrega"
            >
              <Camera className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditing(row.original);
                setFormOpen(true);
              }}
              aria-label="Editar crédito"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleting(row.original)}
              aria-label="Eliminar crédito"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {credits.length} crédito(s) registrado(s)
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus />
          Nuevo crédito
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={credits}
        searchable
        searchPlaceholder="Buscar por cliente, N° crédito o IMEI..."
      />

      <CreditFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        clients={clients}
        deviceReferences={deviceReferences}
        credit={editing}
        interestRate={interestRate}
      />

      <ViewInstallmentsDialog
        open={!!viewing}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        creditId={viewing?.id ?? null}
        creditLabel={viewing?.credit_number ?? ""}
      />

      <CreditDocumentsDialog
        open={!!documentsCredit}
        onOpenChange={(open) => {
          if (!open) setDocumentsCredit(null);
        }}
        credit={documentsCredit}
      />

      <ConfirmDialog
        open={!!approving}
        onOpenChange={(open) => {
          if (!open) setApproving(null);
        }}
        title="Aprobar crédito"
        description={`¿Confirmas la aprobación del crédito ${approving?.credit_number ?? ""}? Se cambiará a "Activo", se actualizará la fecha de inicio y se regenerarán las cuotas.`}
        confirmLabel="Aprobar"
        onConfirm={handleApprove}
      />

      <ConfirmDialog
        open={!!denying}
        onOpenChange={(open) => {
          if (!open) setDenying(null);
        }}
        title="Negar crédito"
        description={`¿Confirmas que deseas negar el crédito ${denying?.credit_number ?? ""}? El estado cambiará a "Negado".`}
        confirmLabel="Negar"
        onConfirm={handleDeny}
      />

      <ConfirmDialog
        open={!!markingInProgress}
        onOpenChange={(open) => {
          if (!open) setMarkingInProgress(null);
        }}
        title="Marcar en proceso"
        description={`¿Confirmas que deseas volver a "En proceso" el crédito ${markingInProgress?.credit_number ?? ""}?`}
        confirmLabel="Confirmar"
        onConfirm={handleMarkInProgress}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Eliminar crédito"
        description={`¿Seguro que quieres eliminar el crédito ${deleting?.credit_number ?? ""}? Esta acción es reversible.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </div>
  );
}
