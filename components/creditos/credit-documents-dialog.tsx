"use client";

import * as React from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  createCreditDocumentAction,
  deleteCreditDocumentAction,
  getCreditDocumentsAction,
} from "@/lib/actions/credit-documents";
import { formatDate } from "@/lib/utils/format";
import { isImageType, sanitizeFileName } from "@/lib/utils/storage";
import type { CreditDocumentWithUrl, CreditWithRelations } from "@/types";

interface CreditDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credit: CreditWithRelations | null;
}

export function CreditDocumentsDialog({
  open,
  onOpenChange,
  credit,
}: CreditDocumentsDialogProps) {
  const router = useRouter();
  const [documents, setDocuments] = React.useState<CreditDocumentWithUrl[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [deleting, setDeleting] = React.useState<CreditDocumentWithUrl | null>(
    null
  );

  const load = React.useCallback(async (creditId: string) => {
    setIsLoading(true);
    try {
      setDocuments(await getCreditDocumentsAction(creditId));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open || !credit) return;
    setFiles([]);
    load(credit.id);
  }, [open, credit, load]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setFiles(Array.from(fileList));
  };

  const handleUpload = async () => {
    if (!credit) return;
    if (files.length === 0) {
      toast.error("Selecciona una o varias fotos");
      return;
    }

    setIsUploading(true);
    const supabase = createClient();
    try {
      for (const file of files) {
        const path = `delivery-photos/${credit.id}/${crypto.randomUUID()}-${sanitizeFileName(
          file.name
        )}`;
        const { error: uploadError } = await supabase.storage
          .from("delivery-photos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;

        const result = await createCreditDocumentAction({
          credit_id: credit.id,
          name: file.name,
          file_url: path,
          file_type: file.type,
        });
        if (!result.success) throw new Error(result.error ?? "Error al guardar");
      }
      toast.success(`${files.length} foto(s) subida(s)`);
      setFiles([]);
      await load(credit.id);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al subir las fotos"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteCreditDocumentAction(deleting.id);
    if (result.success) {
      toast.success("Foto eliminada");
      await load(deleting.credit_id);
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar la foto");
    }
  };

  const openPhoto = (doc: CreditDocumentWithUrl) => {
    window.open(doc.signed_url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fotos de entrega</DialogTitle>
          <DialogDescription>
            {credit
              ? `${credit.credit_number} · ${credit.client?.first_name ?? ""} ${credit.client?.last_name ?? ""}`.trim()
              : " "}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border p-3">
            <Label htmlFor="delivery_files">Agregar fotos del equipo entregado</Label>
            <Input
              id="delivery_files"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {files.length} archivo(s) seleccionado(s)
              </p>
            )}
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || files.length === 0}
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              Subir fotos
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay fotos de entrega registradas para este crédito.
            </p>
          ) : (
            <div className="grid max-h-80 grid-cols-2 gap-3 overflow-auto sm:grid-cols-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="group relative overflow-hidden rounded-lg border"
                >
                  {isImageType(doc.file_type) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={doc.signed_url}
                      alt={doc.name}
                      onClick={() => openPhoto(doc)}
                      className="h-28 w-full cursor-zoom-in object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center bg-muted/50 text-xs text-muted-foreground">
                      {doc.name}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1 border-t bg-card px-2 py-1.5">
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(doc)}
                      aria-label="Eliminar foto"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Eliminar foto"
        description={`¿Seguro que quieres eliminar "${deleting?.name ?? ""}"? Esta acción es reversible.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </Dialog>
  );
}
