"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Clock,
  Download,
  FileText,
  Loader2,
  Printer,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteEditableDocumentAction,
  getEditableDocumentsAction,
  saveEditableDocumentAction,
} from "@/lib/actions/editable-documents";
import { formatDate } from "@/lib/utils/format";
import type { EditableDocKey, EditableDocument } from "@/types";

/* ---------------------------------------------------------------
   DOCUMENT DEFINITIONS
   Each field id must be unique within its document — it doubles as
   the storage key and the placeholder token used in the preview.
---------------------------------------------------------------*/
interface DocField {
  id: string;
  label: string;
  w?: 2;
  type?: "bool";
}

interface DocSection {
  title: string;
  fields: DocField[];
}

interface DocDef {
  key: EditableDocKey;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  sections: DocSection[];
}

const DOCS: Record<EditableDocKey, DocDef> = {
  autorizacion: {
    key: "autorizacion",
    title: "Autorización de Bloqueo de Equipo",
    subtitle:
      "Autoriza a Padlock S.A.S. a inhabilitar el equipo en caso de mora",
    icon: ShieldCheck,
    sections: [
      {
        title: "Datos del cliente",
        fields: [
          { id: "nombre", label: "Nombre completo", w: 2 },
          { id: "cedula", label: "Cédula de ciudadanía" },
          { id: "expedida", label: "Expedida en" },
          { id: "direccion", label: "Dirección", w: 2 },
          { id: "telefono", label: "Teléfono" },
          { id: "correo", label: "Correo electrónico" },
        ],
      },
    ],
  },
  ficha: {
    key: "ficha",
    title: "Ficha de Estudio de Crédito",
    subtitle: "Vinculación y verificación del cliente",
    icon: FileText,
    sections: [
      {
        title: "1. Datos personales",
        fields: [
          { id: "nombre", label: "Nombre" },
          { id: "apellidos", label: "Apellidos" },
          { id: "cedula", label: "N.° Cédula" },
          { id: "direccion", label: "Dirección", w: 2 },
          { id: "celular", label: "Celular" },
          { id: "correo", label: "Correo electrónico" },
        ],
      },
      {
        title: "2. Verificación documental",
        fields: [
          { id: "foto_cedula", label: "Foto de cédula (ambos lados)", type: "bool" },
          { id: "foto_selfie", label: "Foto con cédula tipo selfie", type: "bool" },
          { id: "foto_factura", label: "Foto de factura del predio", type: "bool" },
        ],
      },
      {
        title: "3. Información laboral",
        fields: [
          { id: "ocupacion", label: "Ocupación" },
          { id: "empresa", label: "Nombre de la empresa" },
          { id: "empresa_direccion", label: "Dirección de la empresa", w: 2 },
          { id: "salario", label: "Salario" },
          { id: "contrato", label: "Tipo de contrato" },
          { id: "celular_jefe", label: "Celular de jefe inmediato" },
        ],
      },
      {
        title: "4. Referencias familiares",
        fields: [
          { id: "ref1_nombre", label: "Referencia 1 — nombre y parentesco", w: 2 },
          { id: "ref1_celular", label: "Celular" },
          { id: "ref2_nombre", label: "Referencia 2 — nombre y parentesco", w: 2 },
          { id: "ref2_celular", label: "Celular" },
        ],
      },
      {
        title: "5. Producto y condiciones",
        fields: [
          { id: "producto", label: "Producto a financiar", w: 2 },
          { id: "cuota_inicial", label: "Cuota inicial (30%)" },
          { id: "valor_financiar", label: "Valor a financiar" },
          { id: "cuotas", label: "N.° de cuotas y valor" },
          { id: "fecha_inicio", label: "Fecha de inicio" },
        ],
      },
      {
        title: "6. Entrega y seguimiento",
        fields: [
          { id: "parche", label: "Información de parche del equipo", type: "bool" },
          { id: "foto_entrega", label: "Foto a la entrega del producto", type: "bool" },
        ],
      },
    ],
  },
};

// Datos fijos del aliado que presta el servicio de bloqueo/seguridad.
const FIXED_ALLY = {
  razonSocial: "PADLOCK S.A.S.",
  nit: "901675632-1",
};

const PAPER = {
  paper: "#FFFFFF",
  ink: "#1A1A2E",
  inkDim: "#5A5E78",
  indigo: "#2B2E8C",
  violet: "#7C4DFF",
  line: "#D9D9E3",
  labelBg: "#F2F2F7",
};

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
   FIELD INPUT
---------------------------------------------------------------*/
function EditableField({
  field,
  value,
  onChange,
}: {
  field: DocField;
  value: string;
  onChange: (value: string) => void;
}) {
  const span = field.w === 2 ? "sm:col-span-2" : "";

  if (field.type === "bool") {
    return (
      <div className={`flex flex-col gap-1.5 ${span}`}>
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <div className="flex gap-2">
          {["Sí", "No"].map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${span}`}>
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
      />
    </div>
  );
}

/* ---------------------------------------------------------------
   PREVIEW — mirrors the Word documents' layout
---------------------------------------------------------------*/
function PaperRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td
        style={{
          fontWeight: 700,
          fontSize: 11.5,
          color: PAPER.ink,
          background: PAPER.labelBg,
          border: `1px solid ${PAPER.line}`,
          padding: "6px 10px",
          width: "38%",
        }}
      >
        {label}
      </td>
      <td
        style={{
          fontSize: 11.5,
          color: value ? PAPER.ink : "#C3C3CE",
          border: `1px solid ${PAPER.line}`,
          padding: "6px 10px",
        }}
      >
        {value || " "}
      </td>
    </tr>
  );
}

function DocumentPaper({
  docKey,
  data,
  printRef,
}: {
  docKey: EditableDocKey;
  data: Record<string, string>;
  printRef: React.RefObject<HTMLDivElement | null>;
}) {
  const doc = DOCS[docKey];

  return (
    <div
      ref={printRef}
      id="printable-paper"
      style={{
        background: PAPER.paper,
        color: PAPER.ink,
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "40px 44px",
        borderRadius: 4,
        boxShadow: "0 20px 40px -20px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 800,
            fontSize: 20,
            color: PAPER.indigo,
          }}
        >
          <ShieldCheck size={22} color={PAPER.violet} strokeWidth={2.4} />
          iCredix
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: PAPER.inkDim,
            fontStyle: "italic",
          }}
        >
          Crédito iPhone para ti
        </div>
      </div>
      <div style={{ borderBottom: `2px solid ${PAPER.indigo}`, marginBottom: 18 }} />

      <h1
        style={{
          fontWeight: 700,
          fontSize: 17,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: 0.3,
          marginBottom: 3,
        }}
      >
        {doc.title}
      </h1>
      <p
        style={{
          fontSize: 11,
          textAlign: "center",
          color: PAPER.inkDim,
          fontStyle: "italic",
          marginBottom: 22,
        }}
      >
        {doc.subtitle}
      </p>

      {docKey === "autorizacion" ? (
        <>
          <p style={{ fontWeight: 700, fontSize: 11.5, marginBottom: 10 }}>
            SEÑORES: {FIXED_ALLY.razonSocial}
          </p>

          <p style={{ fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            Yo, <b>{data.nombre || "________________________________________________"}</b>,
            identificado(a) con la cédula de ciudadanía número{" "}
            <b>{data.cedula || "____________________"}</b> expedida en{" "}
            <b>{data.expedida || "________________"}</b>, por medio de la presente hago constar
            que <b>AUTORIZO</b> a la sociedad <b>{FIXED_ALLY.razonSocial}</b>, identificada con
            NIT <b>{FIXED_ALLY.nit}</b>, para realizar el bloqueo del equipo electrónico que más
            adelante se detalla, en caso de presentarse mora en una o más cuotas de la
            financiación por la compra de dicho bien.
          </p>

          <p style={{ fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            Certifico que el asesor comercial de <b>iCREDIX S.A.</b> me suministró información
            completa y detallada de las características del bloqueo del equipo, el cual consiste
            en implantar un software o aplicación al equipo, para que, ante cualquier evento de
            mora en el pago de mis obligaciones, en cualquier momento durante el plazo del
            crédito, el terminal pueda ser inhabilitado para su uso de manera remota y temporal,
            hasta tanto no me ponga al día y cumpla con el pago de por lo menos una (1) cuota
            periódica vencida, momento en el cual el terminal se habilitará nuevamente.
          </p>

          <p style={{ fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            Por medio del presente documento autorizo expresa e irrevocablemente a{" "}
            <b>iCREDIX S.A.</b> a inhabilitar el terminal ante cualquier caso de mora en el pago
            de las cuotas periódicas. <b>iCREDIX S.A.</b> deberá habilitar nuevamente el terminal
            en un período que no podrá exceder veinticuatro (24) horas desde el momento en que se
            acredite el recibo de pago de la cuota periódica vencida.
          </p>

          <p style={{ fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            Autorizo que, por medio de la aplicación o software instalado en el equipo, se me
            realicen notificaciones de mora en el pago de la financiación, así como recordatorios
            de cuotas vencidas y gestiones de cobranza.
          </p>

          <p style={{ fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            EL CLIENTE manifiesta de manera libre, expresa e informada que adquiere una licencia
            de uso del referido software, con un valor equivalente al diez por ciento (10%) del
            precio del bien mueble financiado. Dicho valor será incluido dentro del monto total
            de la operación de crédito y hará parte de las cuotas periódicas pactadas.
          </p>

          <p style={{ fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            Es mi voluntad dejar como garantía, sin tenencia, a favor de <b>iCREDIX S.A.</b> el
            equipo financiado, por lo que autorizo el bloqueo de este en las condiciones y
            términos aquí establecidos.
          </p>

          <p style={{ fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 20 }}>
            Esta autorización hace parte integral del estudio de financiación.
          </p>

          <div style={{ fontSize: 11.5, lineHeight: 2 }}>
            <div><b>DIRECCIÓN:</b> {data.direccion || "________________________________"}</div>
            <div><b>NOMBRE:</b> {data.nombre || "________________________________"}</div>
            <div><b>TELÉFONO:</b> {data.telefono || "________________________________"}</div>
            <div><b>CC. O NIT:</b> {data.cedula || "________________________________"}</div>
            <div><b>E-MAIL:</b> {data.correo || "________________________________"}</div>
          </div>
        </>
      ) : null}

      {docKey !== "autorizacion" &&
        doc.sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 11.5,
                color: PAPER.indigo,
                borderBottom: `1px solid ${PAPER.indigo}`,
                paddingBottom: 3,
                marginBottom: 6,
              }}
            >
              {section.title.toUpperCase()}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {section.fields.map((f) => (
                  <PaperRow key={f.id} label={f.label} value={data[f.id]} />
                ))}
              </tbody>
            </table>
          </div>
        ))}

      <div style={{ display: "flex", gap: 40, marginTop: 46 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ borderTop: `1px solid ${PAPER.ink}`, marginBottom: 6 }} />
          <span style={{ fontWeight: 700, fontSize: 10.5 }}>FIRMA CLIENTE</span>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ borderTop: `1px solid ${PAPER.ink}`, marginBottom: 6 }} />
          <span style={{ fontWeight: 700, fontSize: 10.5 }}>
            {docKey === "autorizacion" ? "HUELLA" : "FECHA"}
          </span>
        </div>
      </div>
    </div>
  );
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
