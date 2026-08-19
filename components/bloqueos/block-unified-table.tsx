"use client";

import * as React from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { Check, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateBlockStatusAction,
  updateUnblockStatusAction,
} from "@/lib/actions/blocks";
import { getBlockStatusInfo } from "@/lib/utils/status";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type {
  BlockStatus,
  BlockWithRelations,
  UnblockWithRelations,
} from "@/types";

/* ---------------------------------------------------------------
   UNIFIED REQUEST TYPE
---------------------------------------------------------------*/
export interface UnifiedRequest {
  id: string;
  type: "bloqueo" | "desbloqueo";
  created_at: string;
  client_name: string;
  client_cedula: string;
  imei: string;
  phone_line: string | null;
  reason: string;
  payment_amount: number | null;
  payment_date: string | null;
  status: BlockStatus;
  original: BlockWithRelations | UnblockWithRelations;
}

function normalizeRequests(
  blocks: BlockWithRelations[],
  unblocks: UnblockWithRelations[]
): UnifiedRequest[] {
  const normalized: UnifiedRequest[] = [];

  for (const b of blocks) {
    normalized.push({
      id: b.id,
      type: "bloqueo",
      created_at: b.created_at,
      client_name: b.client
        ? `${b.client.first_name} ${b.client.last_name}`
        : "—",
      client_cedula: b.client?.cedula ?? "",
      imei: b.imei,
      phone_line: b.phone_line ?? null,
      reason: b.reason,
      payment_amount: null,
      payment_date: null,
      status: b.status,
      original: b,
    });
  }

  for (const u of unblocks) {
    normalized.push({
      id: u.id,
      type: "desbloqueo",
      created_at: u.created_at,
      client_name: u.client
        ? `${u.client.first_name} ${u.client.last_name}`
        : "—",
      client_cedula: u.client?.cedula ?? "",
      imei: u.imei,
      phone_line: u.phone_line ?? null,
      reason: u.unblock_reason ?? "—",
      payment_amount: u.payment?.amount ?? null,
      payment_date: u.payment?.created_at ?? null,
      status: u.status,
      original: u,
    });
  }

  normalized.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return normalized;
}

/* ---------------------------------------------------------------
   CONFIRMATION DIALOG
---------------------------------------------------------------*/
interface ConfirmAdvanceProps {
  open: boolean;
  request: UnifiedRequest | null;
  targetStatus: BlockStatus | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmAdvanceDialog({
  open,
  request,
  targetStatus,
  onConfirm,
  onCancel,
}: ConfirmAdvanceProps) {
  if (!request || !targetStatus) return null;

  const typeLabel = request.type === "bloqueo" ? "Bloqueo" : "Desbloqueo";
  const typeIcon = request.type === "bloqueo" ? "🔒" : "🔓";

  const actionLabel =
    targetStatus === "enviado"
      ? "enviar"
      : targetStatus === "confirmado"
        ? "confirmar"
        : targetStatus;

  const description =
    targetStatus === "confirmado"
      ? `${typeIcon} Se ${actionLabel} el ${typeLabel.toLowerCase()} del equipo con IMEI ${request.imei} del cliente ${request.client_name}. Esta acción actualiza el estado del equipo y el crédito.`
      : `¿Confirmar ${actionLabel} de la solicitud de ${typeLabel.toLowerCase()}?`;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
      title={`${typeIcon} ${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} ${typeLabel}`}
      description={description}
      confirmLabel={targetStatus === "confirmado" ? "Confirmar" : "Enviar"}
      onConfirm={onConfirm}
    />
  );
}

/* ---------------------------------------------------------------
   MAIN COMPONENT
---------------------------------------------------------------*/
interface BlockUnifiedTableProps {
  blocks: BlockWithRelations[];
  unblocks: UnblockWithRelations[];
  onCreateRequest: () => void;
}

export function BlockUnifiedTable({
  blocks,
  unblocks,
  onCreateRequest,
}: BlockUnifiedTableProps) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = React.useState<string>("todos");
  const [statusFilter, setStatusFilter] = React.useState<string>("todos");

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmRequest, setConfirmRequest] =
    React.useState<UnifiedRequest | null>(null);
  const [confirmTarget, setConfirmTarget] =
    React.useState<BlockStatus | null>(null);

  const allRequests = React.useMemo(
    () => normalizeRequests(blocks, unblocks),
    [blocks, unblocks]
  );

  const filteredRequests = React.useMemo(() => {
    return allRequests.filter((r) => {
      if (typeFilter !== "todos" && r.type !== typeFilter) return false;
      if (statusFilter !== "todos" && r.status !== statusFilter) return false;
      return true;
    });
  }, [allRequests, typeFilter, statusFilter]);

  const openConfirm = React.useCallback(
    (request: UnifiedRequest, target: BlockStatus) => {
      setConfirmRequest(request);
      setConfirmTarget(target);
      setConfirmOpen(true);
    },
    []
  );

  const executeAdvance = React.useCallback(async () => {
    if (!confirmRequest || !confirmTarget) return;

    const isBlock = confirmRequest.type === "bloqueo";
    const result = isBlock
      ? await updateBlockStatusAction(confirmRequest.id, confirmTarget)
      : await updateUnblockStatusAction(confirmRequest.id, confirmTarget);

    if (result.success) {
      const label =
        confirmTarget === "confirmado"
          ? isBlock
            ? "Bloqueo confirmado: equipo y crédito marcados"
            : "Desbloqueo confirmado: equipo y crédito restaurados"
          : `Solicitud marcada como ${confirmTarget === "enviado" ? "enviada" : confirmTarget}`;
      toast.success(label);
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al actualizar la solicitud");
    }

    setConfirmOpen(false);
    setConfirmRequest(null);
    setConfirmTarget(null);
  }, [confirmRequest, confirmTarget, router]);

  const columns =
    React.useMemo<LegacyColumnDef<UnifiedRequest, unknown>[]>(
      () => [
        {
          accessorKey: "created_at",
          header: "Fecha",
          cell: ({ row }) => formatDateTime(row.original.created_at),
        },
        {
          accessorKey: "type",
          header: "Tipo",
          cell: ({ row }) => {
            const isBlock = row.original.type === "bloqueo";
            return (
              <Badge variant={isBlock ? "destructive" : "success"}>
                {isBlock ? "🔒 Bloqueo" : "🔓 Desbloqueo"}
              </Badge>
            );
          },
        },
        {
          id: "client",
          header: "Cliente",
          cell: ({ row }) => (
            <div>
              <p className="font-medium">{row.original.client_name}</p>
              <p className="text-xs text-muted-foreground">
                {row.original.client_cedula}
              </p>
            </div>
          ),
        },
        {
          accessorKey: "imei",
          header: "IMEI",
          cell: ({ row }) => (
            <span className="font-mono text-sm">{row.original.imei}</span>
          ),
        },
        {
          accessorKey: "phone_line",
          header: "Línea",
          cell: ({ row }) =>
            row.original.phone_line ? (
              <span className="font-mono text-sm">
                {row.original.phone_line}
              </span>
            ) : (
              "—"
            ),
        },
        {
          accessorKey: "reason",
          header: "Motivo",
          cell: ({ row }) => (
            <span className="line-clamp-2 max-w-64">
              {row.original.reason}
            </span>
          ),
        },
        {
          id: "payment",
          header: "Pago asociado",
          cell: ({ row }) =>
            row.original.payment_amount != null ? (
              <div>
                <p className="font-medium">
                  {formatCurrency(row.original.payment_amount)}
                </p>
                {row.original.payment_date && (
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(row.original.payment_date)}
                  </p>
                )}
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
                    onClick={() => openConfirm(row.original, "enviado")}
                  >
                    <Send className="size-3.5" />
                    Enviar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    row.original.type === "bloqueo"
                      ? "border-amber-500/60 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                      : "border-emerald-500/60 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                  }
                  onClick={() => openConfirm(row.original, "confirmado")}
                >
                  <Check className="size-3.5" />
                  Confirmar
                </Button>
              </div>
            );
          },
        },
      ],
      [openConfirm]
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {allRequests.length} solicitud(es) ·{" "}
            {filteredRequests.length} mostrada(s)
          </p>
        </div>
        <Button onClick={onCreateRequest}>
          <Plus className="size-4" />
          Nueva solicitud
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tipo:</span>
          <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="bloqueo">🔒 Bloqueos</SelectItem>
              <SelectItem value="desbloqueo">🔓 Desbloqueos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Estado:</span>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          data={filteredRequests}
          searchable
          searchPlaceholder="Buscar por cliente, IMEI, línea o motivo..."
          emptyMessage="No hay solicitudes con los filtros seleccionados"
        />
      </div>

      {/* Confirmation dialog */}
      <ConfirmAdvanceDialog
        open={confirmOpen}
        request={confirmRequest}
        targetStatus={confirmTarget}
        onConfirm={executeAdvance}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmRequest(null);
          setConfirmTarget(null);
        }}
      />
    </div>
  );
}

/* Re-export Plus so page can use it if needed — but page imports from lucide directly */
