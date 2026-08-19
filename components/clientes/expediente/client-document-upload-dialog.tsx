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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { createClientDocumentAction } from "@/lib/actions/client-documents";
import { sanitizeFileName } from "@/lib/utils/storage";
import { DOCUMENT_TYPES, getDocumentTypeLabel } from "@/lib/constants/documents";
import type { DocumentTypeValue } from "@/lib/constants/documents";

interface ClientDocumentUploadDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function ClientDocumentUploadDialog({
  clientId,
  open,
  onOpenChange,
}: ClientDocumentUploadDialogProps) {
  const router = useRouter();
  const [docType, setDocType] = React.useState<DocumentTypeValue>("otro");
  const [name, setName] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const resetForm = () => {
    setDocType("otro");
    setName("");
    setNotes("");
    setFile(null);
  };

  React.useEffect(() => {
    if (open) resetForm();
  }, [open]);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecciona un archivo");
      return;
    }
    if (!name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const path = `client-documents/${crypto.randomUUID()}-${sanitizeFileName(
        file.name
      )}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const result = await createClientDocumentAction(clientId, {
        doc_type: docType,
        name: name.trim(),
        file_url: path,
        file_type: file.type,
        notes,
        credit_id: "",
      });

      if (!result.success) throw new Error(result.error ?? "Error al guardar");

      toast.success("Documento subido al expediente");
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
          <DialogTitle>Subir documento al expediente</DialogTitle>
          <DialogDescription>
            Cédula, fotos, certificados y otros documentos del cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_doc_type">Tipo de documento</Label>
            <Select
              value={docType}
              onValueChange={(value) => setDocType(value as DocumentTypeValue)}
            >
              <SelectTrigger id="client_doc_type" className="w-full">
                <SelectValue>{getDocumentTypeLabel(docType)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((doc) => (
                  <SelectItem key={doc.value} value={doc.value}>
                    {doc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_doc_name">Nombre</Label>
            <Input
              id="client_doc_name"
              placeholder="Ej. Cédula frente"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_doc_file">Archivo</Label>
            <Input
              id="client_doc_file"
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              PDF o imagen (JPG, PNG, WebP).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_doc_notes">Observaciones (opcional)</Label>
            <Textarea
              id="client_doc_notes"
              placeholder="Contexto o notas del documento"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
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
