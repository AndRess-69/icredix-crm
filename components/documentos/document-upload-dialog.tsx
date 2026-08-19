"use client";

import * as React from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { createDocumentAction } from "@/lib/actions/documents";
import { sanitizeFileName } from "@/lib/utils/storage";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
];

export function DocumentUploadDialog({
  open,
  onOpenChange,
}: DocumentUploadDialogProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFile(null);
  };

  React.useEffect(() => {
    if (open) resetForm();
  }, [open]);

  const handleUpload = async () => {
    if (!title.trim()) {
      toast.error("El título es requerido");
      return;
    }
    if (!file) {
      toast.error("Selecciona un archivo");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const path = `documents/${crypto.randomUUID()}-${sanitizeFileName(
        file.name
      )}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const result = await createDocumentAction({
        title: title.trim(),
        description,
        file_url: path,
        file_type: file.type,
      });

      if (!result.success) throw new Error(result.error ?? "Error al guardar");

      toast.success("Documento subido");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al subir el documento"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>
            Formatos de autorización de bloqueo, políticas de privacidad y otros
            documentos administrativos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doc_title">Título</Label>
            <Input
              id="doc_title"
              placeholder="Formato de autorización de bloqueo"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc_description">Descripción (opcional)</Label>
            <Textarea
              id="doc_description"
              placeholder="Versión, alcance o notas del documento"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc_file">Archivo</Label>
            <Input
              id="doc_file"
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              PDF, Word, Excel, texto o imagen.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleUpload} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            Subir documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
