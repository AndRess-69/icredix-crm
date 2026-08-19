"use client";

import * as React from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import {
  Download,
  Eye,
  FileText,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DocumentUploadDialog } from "@/components/documentos/document-upload-dialog";
import { DocumentPreviewDialog } from "@/components/documentos/document-preview-dialog";
import { createClient } from "@/lib/supabase/client";
import { deleteDocumentAction } from "@/lib/actions/documents";
import { formatDate } from "@/lib/utils/format";
import { isImageType, isPdfType } from "@/lib/utils/storage";
import type { AdminDocumentWithUrl } from "@/types";

interface DocumentsTableProps {
  documents: AdminDocumentWithUrl[];
}

function getDocumentBadge(doc: AdminDocumentWithUrl): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  if (isPdfType(doc.file_type)) return { label: "PDF", variant: "default" };
  if (isImageType(doc.file_type)) return { label: "Imagen", variant: "secondary" };
  if (doc.file_type?.startsWith("text/")) return { label: "Texto", variant: "secondary" };
  return { label: "Archivo", variant: "outline" };
}

export function DocumentsTable({ documents }: DocumentsTableProps) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [preview, setPreview] = React.useState<AdminDocumentWithUrl | null>(null);
  const [deleting, setDeleting] = React.useState<AdminDocumentWithUrl | null>(null);

  const handleDownload = async (doc: AdminDocumentWithUrl) => {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("documents")
      .download(doc.file_url);

    if (error || !data) {
      toast.error("No se pudo descargar el documento");
      return;
    }

    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = doc.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Descarga iniciada");
  };

  const handlePrint = (doc: AdminDocumentWithUrl) => {
    window.open(doc.signed_url, "_blank");
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteDocumentAction(deleting.id);
    if (result.success) {
      toast.success("Documento eliminado");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar el documento");
    }
  };

  const columns = React.useMemo<LegacyColumnDef<AdminDocumentWithUrl, unknown>[]>(
    () => [
      {
        id: "title",
        header: "Documento",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium">{row.original.title}</p>
              {row.original.description && (
                <p className="truncate text-xs text-muted-foreground">
                  {row.original.description}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "type",
        header: "Tipo",
        cell: ({ row }) => {
          const info = getDocumentBadge(row.original);
          return <Badge variant={info.variant}>{info.label}</Badge>;
        },
      },
      {
        accessorKey: "created_at",
        header: "Subido",
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
              onClick={() => setPreview(row.original)}
              aria-label="Ver documento"
            >
              <Eye className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDownload(row.original)}
              aria-label="Descargar documento"
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handlePrint(row.original)}
              aria-label="Imprimir documento"
            >
              <Printer className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleting(row.original)}
              aria-label="Eliminar documento"
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
          {documents.length} documento(s) disponible(s)
        </p>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus />
          Subir documento
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={documents}
        searchable
        searchPlaceholder="Buscar por título o descripción..."
        emptyMessage="Aún no hay documentos. Sube formatos como la autorización de bloqueo o políticas."
      />

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />

      <DocumentPreviewDialog
        doc={preview}
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Eliminar documento"
        description={`¿Seguro que quieres eliminar "${deleting?.title ?? ""}"? Esta acción es reversible.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </div>
  );
}
