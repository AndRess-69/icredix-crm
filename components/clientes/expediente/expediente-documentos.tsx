"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  FileUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientDocumentUploadDialog } from "@/components/clientes/expediente/client-document-upload-dialog";
import { deleteClientDocumentAction } from "@/lib/actions/client-documents";
import { getDocumentTypeLabel } from "@/lib/constants/documents";
import { formatDate } from "@/lib/utils/format";
import type { ClientExpediente, ClientDocumentWithUrl } from "@/types";

interface ExpedienteDocumentosProps {
  expediente: ClientExpediente;
}

export function ExpedienteDocumentos({ expediente }: ExpedienteDocumentosProps) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDelete = async (doc: ClientDocumentWithUrl) => {
    if (!confirm(`¿Eliminar "${doc.name}" del expediente?`)) return;
    setDeletingId(doc.id);
    try {
      const result = await deleteClientDocumentAction(doc.id, doc.client_id);
      if (result.success) {
        toast.success("Documento eliminado");
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al eliminar el documento");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {expediente.documents.length} documento(s) en el expediente
        </p>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <FileUp className="size-4" />
          Subir documento
        </Button>
      </div>

      {expediente.documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay documentos. Sube el primero para construir el expediente.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {expediente.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-3 rounded-lg border p-3"
            >
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getDocumentTypeLabel(doc.doc_type)}
                  </p>
                </div>
                <Badge variant="outline">{doc.file_type ?? "Archivo"}</Badge>
              </div>

              {doc.notes && (
                <p className="text-xs text-muted-foreground">{doc.notes}</p>
              )}

              <div className="mt-auto flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {formatDate(doc.created_at)}
                  {doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ""}
                </p>
                <div className="flex items-center gap-1">
                  <a
                    href={doc.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "gap-1"
                    )}
                    aria-disabled={!doc.signed_url}
                  >
                    <Download className="size-4" />
                    Ver
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientDocumentUploadDialog
        clientId={expediente.client.id}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </div>
  );
}
