"use client";

import * as React from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { Check, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { UnblockCandidatesPanel } from "@/components/bloqueos/unblock-candidates-panel";
import { UnblockFormDialog, type UnblockFormPrefill } from "@/components/bloqueos/unblock-form-dialog";
import { updateUnblockStatusAction } from "@/lib/actions/blocks";
import { getBlockStatusInfo } from "@/lib/utils/status";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type {
  BlockStatus,
  ClientOption,
  PaymentWithRelations,
  UnblockCandidate,
  UnblockWithRelations,
} from "@/types";

interface UnblocksTableProps {
  unblocks: UnblockWithRelations[];
  clients: ClientOption[];
  payments: PaymentWithRelations[];
  candidates: UnblockCandidate[];
}

export function UnblocksTable({
  unblocks,
  clients,
  payments,
  candidates,
}: UnblocksTableProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [prefill, setPrefill] = React.useState<UnblockFormPrefill | null>(null);

  const openPrefilled = React.useCallback(
    (clientId: string, imei: string | null, creditId: string | null, deviceId: string | null) => {
      setPrefill({ client_id: clientId, imei, credit_id: creditId, device_id: deviceId });
      setFormOpen(true);
    },
    []
  );

  const handleRequestUnblock = React.useCallback(
    (candidate: UnblockCandidate) => {
      openPrefilled(
        candidate.client?.id ?? "",
        candidate.device.imei,
        candidate.credit?.id ?? null,
        candidate.device.id
      );
    },
    [openPrefilled]
  );

  const handleNewUnblock = React.useCallback(() => {
    setPrefill(null);
    setFormOpen(true);
  }, []);

  const advanceStatus = React.useCallback(
    async (unblock: UnblockWithRelations, status: BlockStatus) => {
      const result = await updateUnblockStatusAction(unblock.id, status);
      if (result.success) {
        toast.success(
          status === "confirmado"
            ? "Desbloqueo confirmado: equipo y crédito restaurados"
            : "Solicitud marcada como enviada"
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al actualizar la solicitud");
      }
    },
    [router]
  );

  const columns = React.useMemo<LegacyColumnDef<UnblockWithRelations, unknown>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "Fecha",
        cell: ({ row }) => formatDateTime(row.original.created_at),
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
        header: "IMEI",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.imei}</span>,
      },
      {
        accessorKey: "phone_line",
        header: "Línea",
        cell: ({ row }) => (
          row.original.phone_line ? (
            <span className="font-mono text-sm">{row.original.phone_line}</span>
          ) : (
            "—"
          )
        ),
      },
      {
        accessorKey: "unblock_reason",
        header: "Motivo",
        cell: ({ row }) => (
          row.original.unblock_reason ? (
            <span className="line-clamp-2 max-w-64">{row.original.unblock_reason}</span>
          ) : (
            "—"
          )
        ),
      },
      {
        id: "payment",
        header: "Pago asociado",
        cell: ({ row }) =>
          row.original.payment ? (
            <div>
              <p className="font-medium">{formatCurrency(row.original.payment.amount)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(row.original.payment.created_at)}
              </p>
            </div>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
          const info = getBlockStatusInfo(row.original.status);
          return <Badge variant={info.variant}>{info.label}</Badge>;
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const status = row.original.status;
          if (status === "confirmado") return null;
          return (
            <div className="flex items-center justify-end gap-1">
              {status === "pendiente" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => advanceStatus(row.original, "enviado")}
                >
                  <Send className="size-3.5" />
                  Enviar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-500/60 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                onClick={() => advanceStatus(row.original, "confirmado")}
              >
                <Check className="size-3.5" />
                Confirmar
              </Button>
            </div>
          );
        },
      },
    ],
    [advanceStatus]
  );

  return (
    <div className="space-y-4">
      <UnblockCandidatesPanel
        candidates={candidates}
        onRequestUnblock={handleRequestUnblock}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unblocks.length} solicitud(es) de desbloqueo
        </p>
        <Button onClick={handleNewUnblock}>
          <Plus />
          Nuevo desbloqueo
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={unblocks}
        searchable
        searchPlaceholder="Buscar por cliente o IMEI..."
      />

      <UnblockFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        clients={clients}
        payments={payments}
        prefill={prefill}
      />
    </div>
  );
}
