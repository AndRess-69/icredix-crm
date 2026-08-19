"use client";

import * as React from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DeviceReferenceFormDialog } from "@/components/equipos/device-reference-form-dialog";
import { deleteDeviceReferenceAction } from "@/lib/actions/deviceReferences";
import type { DeviceReference } from "@/types";

interface DeviceReferencesTableProps {
  references: DeviceReference[];
}

export function DeviceReferencesTable({
  references,
}: DeviceReferencesTableProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DeviceReference | null>(null);
  const [deleting, setDeleting] = React.useState<DeviceReference | null>(null);

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteDeviceReferenceAction(deleting.id);
    if (result.success) {
      toast.success("Referencia eliminada");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar la referencia");
    }
  };

  const columns = React.useMemo<LegacyColumnDef<DeviceReference, unknown>[]>(
    () => [
      {
        accessorKey: "model",
        header: "Referencia",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{`${row.original.brand} ${row.original.model}`}</p>
            <p className="text-xs text-muted-foreground">
              {[row.original.capacity, row.original.color]
                .filter(Boolean)
                .join(" · ") || "Sin especificar"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "brand",
        header: "Marca",
      },
      {
        accessorKey: "created_at",
        header: "Creado",
        cell: ({ row }) =>
          new Date(row.original.created_at).toLocaleDateString("es-CO"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditing(row.original);
                setFormOpen(true);
              }}
              aria-label="Editar referencia"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleting(row.original)}
              aria-label="Eliminar referencia"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {references.length} referencia(s) registrada(s)
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus />
          Nueva referencia
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={references}
        searchable
        searchPlaceholder="Buscar por modelo..."
      />

      <DeviceReferenceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        reference={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Eliminar referencia"
        description={`Seguro que quieres eliminar la referencia ${deleting ? `${deleting.brand} ${deleting.model}` : ""}? Esta acción es reversible.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </div>
  );
}
