"use client";

import * as React from "react";
import {
  ChevronRight,
  Clock,
  Download,
  Loader2,
  Printer,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  deleteEditableDocumentAction,
  getEditableDocumentsAction,
  saveEditableDocumentAction,
} from "@/lib/actions/editable-documents";
import { formatDate } from "@/lib/utils/format";
import type { EditableDocKey, EditableDocument } from "@/types";
import { EditableField } from "./editable-field";
import { DocumentPaper, DOCS } from "./document-paper";

/* ---------------------------------------------------------------
   HELPERS
---------------------------------------------------------------*/
const emptyForm = (docKey: EditableDocKey): Record<string, string> => {
  const out: Record<string, string> = {};
  DOCS[docKey].sections.forEach((s) =>
    s.fields.forEach((f) => (out[f.id] = ""))
  );
  return out;
};

function computeClientName(
  docKey: EditableDocKey,
  data: Record<string, string>
): string {
  const nombre = data.nombre?.trim() || "";
  const apellidos = docKey === "ficha" ? data.apellidos?.trim() || "" : "";
  const full = [nombre, apellidos].filter(Boolean).join(" ");
  if (full) return full;
  if (data.cedula?.trim()) return `Cliente ${data.cedula.trim()}`;
  return "Cliente sin nombre";
}

/* ---------------------------------------------------------------
   MAIN COMPONENT
---------------------------------------------------------------*/
export function EditableDocuments() {
  const [docKey, setDocKey] = React.useState<EditableDocKey>("ficha");
  const [forms, setForms] = React.useState<
    Record<EditableDocKey, Record<string, string>>
  >({
    autorizacion: emptyForm("autorizacion"),
    ficha: emptyForm("ficha"),
  });
  const [saved, setSaved] = React.useState<EditableDocument[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<EditableDocument | null>(null);
  const printRef = React.useRef<HTMLDivElement>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setSaved(await getEditableDocumentsAction());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const doc = DOCS[docKey];
  const data = forms[docKey];

  const setField = (id: string, value: string) =>
    setForms((prev) => ({
      ...prev,
      [docKey]: { ...prev[docKey], [id]: value },
    }));

  const filledCount = React.useMemo(() => {
    const total = Object.keys(data).length;
    const filled = Object.values(data).filter((v) => v && v.length).length;
    return { filled, total };
  }, [data]);

  const newDocument = (type: EditableDocKey) => {
    setDocKey(type);
    setForms((prev) => ({ ...prev, [type]: emptyForm(type) }));
    setActiveId(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveEditableDocumentAction({
        id: activeId ?? undefined,
        doc_key: docKey,
        client_name: computeClientName(docKey, data),
        cedula: (data.cedula ?? "").trim(),
        data,
      });

      if (!result.success) throw new Error(result.error ?? "Error al guardar");

      setActiveId(result.id ?? activeId);
      await refresh();
      toast.success("Documento guardado en la documentación del cliente");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al guardar el documento"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openRecord = (r: EditableDocument) => {
    setDocKey(r.doc_key);
    setForms((prev) => ({
      ...prev,
      [r.doc_key]: { ...emptyForm(r.doc_key), ...r.data },
    }));
    setActiveId(r.id);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteEditableDocumentAction(deleting.id);
    if (result.success) {
      if (activeId === deleting.id) setActiveId(null);
      await refresh();
      toast.success("Documento eliminado");
    } else {
      toast.error(result.error ?? "Error al eliminar el documento");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredSaved = saved.filter((r) => {
    const q = query.toLowerCase();
    return (
      !q ||
      r.client_name.toLowerCase().includes(q) ||
      r.cedula.toLowerCase().includes(q)
    );
  });

  const progress = filledCount.total
    ? (filledCount.filled / filledCount.total) * 100
    : 0;

  return (
    <div className="flex min-h-0 flex-col">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-paper, #printable-paper * { visibility: visible; }
          #printable-paper {
            position: absolute;
            top: 0; left: 0;
            width: 100%;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {Object.values(DOCS).map((d) => {
            const Icon = d.icon;
            const active = docKey === d.key;
            return (
              <Button
                key={d.key}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => newDocument(d.key)}
              >
                <Icon className="size-4" />
                {d.title}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="size-4" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            title="Usa 'Guardar como PDF' en el diálogo de impresión"
          >
            <Download className="size-4" />
            PDF
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filledCount.filled}/{filledCount.total}
        </span>
      </div>

      {/* Body */}
      <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,440px)_minmax(0,1fr)]">
        {/* Saved records */}
        <div className="flex flex-col rounded-lg border bg-card">
          <div className="border-b p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente o cédula"
                className="pl-9"
              />
            </div>
          </div>
          <div className="max-h-80 flex-1 overflow-y-auto p-2 lg:max-h-none">
            {loading && (
              <p className="p-3 text-xs text-muted-foreground">Cargando…</p>
            )}
            {!loading && filteredSaved.length === 0 && (
              <p className="p-3 text-xs leading-5 text-muted-foreground">
                Aún no hay documentos guardados. Completa un formulario y usa
                «Guardar».
              </p>
            )}
            {filteredSaved.map((r) => {
              const active = r.id === activeId;
              const Icon = DOCS[r.doc_key].icon;
              return (
                <button
                  key={r.id}
                  onClick={() => openRecord(r)}
                  className={`group flex w-full items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors ${
                    active ? "bg-muted" : "hover:bg-muted/60"
                  }`}
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.client_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.cedula || "sin cédula"}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3" />
                      {formatDate(r.created_at)} · {DOCS[r.doc_key].title}
                    </p>
                  </div>
                  <Trash2
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(r);
                    }}
                    className="size-4 shrink-0 cursor-pointer text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Form column */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{doc.title}</h2>
            {activeId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => newDocument(docKey)}
              >
                <X className="size-4" />
                nuevo
              </Button>
            )}
          </div>

          {doc.sections.map((section) => (
            <div key={section.title}>
              <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-primary">
                {section.title}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {section.fields.map((f) => (
                  <EditableField
                    key={f.id}
                    field={f}
                    value={data[f.id]}
                    onChange={(v) => setField(f.id, v)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Preview column */}
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ChevronRight className="size-3.5" />
            Vista previa — así se imprime y descarga
          </div>
          <div className="flex justify-center rounded-lg bg-muted/60 p-4 sm:p-6">
            <DocumentPaper docKey={docKey} data={data} printRef={printRef} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Eliminar documento"
        description={`¿Seguro que quieres eliminar el documento de "${deleting?.client_name ?? ""}"?`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </div>
  );
}
