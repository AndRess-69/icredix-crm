"use client";

import { Download, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { isImageType, isPdfType } from "@/lib/utils/storage";
import type { AdminDocumentWithUrl } from "@/types";

interface DocumentPreviewDialogProps {
  doc: AdminDocumentWithUrl | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentPreviewDialog({
  doc,
  open,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  if (!doc) return null;

  const handleDownload = async () => {
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
  };

  const handlePrint = () => {
    window.open(doc.signed_url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{doc.title}</DialogTitle>
          <DialogDescription>{doc.description || " "}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-auto rounded-lg border bg-muted/30 p-2">
          {isImageType(doc.file_type) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.signed_url}
              alt={doc.title}
              className="mx-auto max-h-[62vh] w-auto rounded-md"
            />
          ) : isPdfType(doc.file_type) ? (
            <iframe
              src={doc.signed_url}
              title={doc.title}
              className="h-[62vh] w-full rounded-md"
            />
          ) : (
            <p className="flex h-40 items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Este tipo de archivo no tiene vista previa. Descárgalo para abrirlo.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="size-4" />
            Imprimir
          </Button>
          <Button onClick={handleDownload}>
            <Download className="size-4" />
            Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
