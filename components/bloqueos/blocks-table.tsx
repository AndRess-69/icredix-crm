"use client";

import * as React from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { Check, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { BlockFormDialog } from "@/components/bloqueos/block-form-dialog";
import { updateBlockStatusAction } from "@/lib/actions/blocks";
import { getBlockStatusInfo } from "@/lib/utils/status";
import { formatDateTime } from "@/lib/utils/format";
import type { BlockStatus, BlockWithRelations, ClientOption } from "@/types";

interface BlocksTableProps {
  blocks: BlockWithRelations[];
  clients: ClientOption[];
}

export function BlocksTable({ blocks, clients }: BlocksTableProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);

  const advanceStatus = React.useCallback(
    async (block: BlockWithRelations, status: BlockStatus) => {
      const result = await updateBlockStatusAction(block.id, status);
      if (result.success) {
        toast.success(
          status === "confirmado"
            ? "Bloqueo confirmado: equipo y crédito marcados"
            : "Solicitud marcada como enviada"
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al actualizar la solicitud");
      }
    },
    [router]
  );

  const columns = React.useMemo<LegacyColumnDef<BlockWithRelations, unknown>[]>(
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
        accessorKey: "reason",
        header: "Motivo",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-64">{row.original.reason}</span>
        ),
      },
      {
        accessorKey: "diagnoses",
        header: "Diagnósticos",
        cell: ({ row }) => (
          row.original.diagnoses ? (
            <span className="line-clamp-2 max-w-48">{row.original.diagnoses}</span>
          ) : (
            "—"
          )
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
                className="border-amber-500/60 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {blocks.length} solicitud(es) de bloqueo
        </p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus />
          Nuevo bloqueo
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={blocks}
        searchable
        searchPlaceholder="Buscar por cliente, IMEI o motivo..."
      />

      <BlockFormDialog open={formOpen} onOpenChange={setFormOpen} clients={clients} />
    </div>
  );
}
