"use client";

import * as React from "react";
import { FileText, PenLine } from "lucide-react";

import { DocumentsTable } from "@/components/documentos/documents-table";
import { EditableDocuments } from "@/components/documentos/editable-documents";
import type { AdminDocumentWithUrl } from "@/types";

type Section = "uploaded" | "editable";

interface DocumentosSectionProps {
  documents: AdminDocumentWithUrl[];
}

export function DocumentosSection({ documents }: DocumentosSectionProps) {
  const [section, setSection] = React.useState<Section>("uploaded");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border bg-card p-1">
        <button
          type="button"
          onClick={() => setSection("uploaded")}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            section === "uploaded"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <FileText className="size-4" />
          Formatos subidos
        </button>
        <button
          type="button"
          onClick={() => setSection("editable")}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            section === "editable"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <PenLine className="size-4" />
          Documentos editables
        </button>
      </div>

      {section === "uploaded" ? (
        <DocumentsTable documents={documents} />
      ) : (
        <EditableDocuments />
      )}
    </div>
  );
}
