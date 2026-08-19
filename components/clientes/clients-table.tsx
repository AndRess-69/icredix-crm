"use client";

import * as React from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClientFormDialog } from "@/components/clientes/client-form-dialog";
import { ClientDetailDialog } from "@/components/clientes/client-detail-dialog";
import { deleteClientAction } from "@/lib/actions/clients";
import { formatDate } from "@/lib/utils/format";
import type { Client } from "@/types";

interface ClientsTableProps {
  clients: Client[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Client | null>(null);
  const [deleting, setDeleting] = React.useState<Client | null>(null);
  const [viewingId, setViewingId] = React.useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteClientAction(deleting.id);
    if (result.success) {
      toast.success("Cliente eliminado");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar el cliente");
    }
  };

  const columns = React.useMemo<LegacyColumnDef<Client, unknown>[]>(
    () => [
      {
        accessorFn: (row) => `${row.first_name} ${row.last_name}`.trim(),
        id: "full_name",
        header: "Nombre",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => router.push(`/clientes/${row.original.id}?tab=resumen`)}
            className="text-left font-medium text-primary underline-offset-4 hover:underline"
            aria-label="Abrir expediente del cliente"
          >
            {`${row.original.first_name} ${row.original.last_name}`.trim()}
          </button>
        ),
      },
      {
        accessorKey: "cedula",
        header: "Cédula",
      },
      {
        accessorKey: "phone",
        header: "Celular",
      },
      {
        accessorKey: "email",
        header: "Correo",
        cell: ({ row }) => row.original.email ?? "—",
      },
      {
        accessorKey: "city",
        header: "Ciudad",
        cell: ({ row }) => row.original.city ?? "—",
      },
      {
        accessorKey: "created_at",
        header: "Registrado",
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewingId(row.original.id)}
              aria-label="Ver detalle del cliente"
            >
              <Eye className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditing(row.original);
                setFormOpen(true);
              }}
              aria-label="Editar cliente"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleting(row.original)}
              aria-label="Eliminar cliente"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [router]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {clients.length} cliente(s) registrado(s)
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus />
          Nuevo cliente
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={clients}
        searchable
        searchPlaceholder="Buscar por nombre, cédula o teléfono..."
      />

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editing}
      />

      <ClientDetailDialog
        open={!!viewingId}
        onOpenChange={(open) => {
          if (!open) setViewingId(null);
        }}
        clientId={viewingId}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Eliminar cliente"
        description={`¿Seguro que quieres eliminar a ${deleting ? `${deleting.first_name} ${deleting.last_name}`.trim() : ""}? Esta acción es reversible.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </div>
  );
}
