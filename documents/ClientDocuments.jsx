import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText, ShieldCheck, Printer, Download, Save, Search,
  User, CheckCircle2, Circle, ChevronRight, Trash2, X, Clock,
} from "lucide-react";

/* ---------------------------------------------------------------
   BRAND TOKENS
   iCredix: deep indigo + electric violet (from the shield/phone mark),
   warm gold for the "para ti" accent. Paper previews stay true white
   so they read as the physical document, not part of the app chrome.
----------------------------------------------------------------*/
const BRAND = {
  bg: "#0A0C1B",
  panel: "#12152C",
  panelAlt: "#171A35",
  line: "#262A4D",
  indigo: "#2B2E8C",
  violet: "#7C4DFF",
  gold: "#D4A72C",
  text: "#EEF0FB",
  textDim: "#9096C2",
  paper: "#FFFFFF",
  ink: "#1A1A2E",
  inkDim: "#5A5E78",
};

const FONT_DISPLAY = "'Sora', system-ui, sans-serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

/* ---------------------------------------------------------------
   DOCUMENT DEFINITIONS
   Each field id must be unique within its document — it doubles as
   the storage key and the placeholder token used in the preview.
----------------------------------------------------------------*/
const DOCS = {
  autorizacion: {
    key: "autorizacion",
    title: "Autorización de Bloqueo de Equipo",
    subtitle: "Autoriza a Padlock S.A.S. a inhabilitar el equipo en caso de mora",
    icon: ShieldCheck,
    // Flujo remoto (cliente en otra ciudad, se diligencia desde PC): estos
    // datos cambian por cliente. El NIT del aliado de seguridad es fijo
    // (ver FIXED_ALLY abajo) y la firma/huella quedan libres para diligenciar
    // a mano o adjuntar como firma virtual — no son campos de este formulario.
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
// No son editables desde el formulario — cámbialos aquí una sola vez si
// alguna vez cambia de aliado o de NIT.
const FIXED_ALLY = {
  razonSocial: "PADLOCK S.A.S.",
  nit: "901675632-1",
};

const emptyForm = (docKey) => {
  const out = {};
  DOCS[docKey].sections.forEach((s) => s.fields.forEach((f) => (out[f.id] = "")));
  return out;
};

/* ---------------------------------------------------------------
   STORAGE HELPERS
   In this demo, "documentación del cliente" is backed by the
   artifact's key/value storage so the flow is fully testable here.
   In your own site, swap saveRecord / listRecords / deleteRecord
   for calls to your API (see integration notes at the bottom of
   the chat response).
----------------------------------------------------------------*/
const hasStorage = typeof window !== "undefined" && !!window.storage;

async function saveRecord(record) {
  if (!hasStorage) return record;
  await window.storage.set(`doc:${record.id}`, JSON.stringify(record), false);
  return record;
}
async function listRecords() {
  if (!hasStorage) return [];
  const idx = await window.storage.list("doc:", false).catch(() => null);
  if (!idx || !idx.keys) return [];
  const records = [];
  for (const k of idx.keys) {
    try {
      const r = await window.storage.get(k.key ?? k, false);
      if (r && r.value) records.push(JSON.parse(r.value));
    } catch (e) {
      /* skip unreadable record */
    }
  }
  return records.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}
async function deleteRecord(id) {
  if (!hasStorage) return;
  await window.storage.delete(`doc:${id}`, false).catch(() => {});
}

/* ---------------------------------------------------------------
   SMALL UI PRIMITIVES
----------------------------------------------------------------*/
function Field({ field, value, onChange }) {
  const span = field.w === 2 ? "sm:col-span-2" : "";
  if (field.type === "bool") {
    return (
      <div className={`flex flex-col gap-1.5 ${span}`}>
        <label style={{ fontFamily: FONT_BODY, color: BRAND.textDim, fontSize: 12 }} className="tracking-wide uppercase">
          {field.label}
        </label>
        <div className="flex gap-2">
          {["Sí", "No"].map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
                style={{
                  fontFamily: FONT_BODY,
                  background: active ? BRAND.violet : "transparent",
                  color: active ? "#fff" : BRAND.textDim,
                  border: `1px solid ${active ? BRAND.violet : BRAND.line}`,
                }}
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
      <label style={{ fontFamily: FONT_BODY, color: BRAND.textDim, fontSize: 12 }} className="tracking-wide uppercase">
        {field.label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:ring-2"
        style={{
          fontFamily: FONT_BODY,
          background: BRAND.panelAlt,
          color: BRAND.text,
          border: `1px solid ${BRAND.line}`,
        }}
        onFocus={(e) => (e.target.style.borderColor = BRAND.violet)}
        onBlur={(e) => (e.target.style.borderColor = BRAND.line)}
      />
    </div>
  );
}

function PaperRow({ label, value }) {
  return (
    <tr>
      <td
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 700,
          fontSize: 11.5,
          color: BRAND.ink,
          background: "#F2F2F7",
          border: "1px solid #D9D9E3",
          padding: "6px 10px",
          width: "38%",
        }}
      >
        {label}
      </td>
      <td
        style={{
          fontFamily: FONT_BODY,
          fontSize: 11.5,
          color: value ? BRAND.ink : "#C3C3CE",
          border: "1px solid #D9D9E3",
          padding: "6px 10px",
        }}
      >
        {value || " "}
      </td>
    </tr>
  );
}

/* ---------------------------------------------------------------
   PREVIEW — mirrors the Word documents' layout so print/PDF output
   matches what compliance already expects to see on paper.
----------------------------------------------------------------*/
function DocumentPaper({ docKey, data, printRef }) {
  const doc = DOCS[docKey];
  return (
    <div
      ref={printRef}
      id="printable-paper"
      style={{
        background: BRAND.paper,
        color: BRAND.ink,
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "40px 44px",
        borderRadius: 4,
        boxShadow: "0 30px 60px -20px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 20,
            color: BRAND.indigo,
          }}
        >
          <ShieldCheck size={22} color={BRAND.violet} strokeWidth={2.4} />
          iCredix
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: BRAND.inkDim, fontStyle: "italic" }}>
          Crédito iPhone para ti
        </div>
      </div>
      <div style={{ borderBottom: `2px solid ${BRAND.indigo}`, marginBottom: 18 }} />

      <h1
        style={{
          fontFamily: FONT_DISPLAY,
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
      <p style={{ fontFamily: FONT_BODY, fontSize: 11, textAlign: "center", color: BRAND.inkDim, fontStyle: "italic", marginBottom: 22 }}>
        {doc.subtitle}
      </p>

      {docKey === "autorizacion" ? (
        <>
          <p style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 11.5, marginBottom: 10 }}>
            SEÑORES: {FIXED_ALLY.razonSocial}
          </p>

          <p style={{ fontFamily: FONT_BODY, fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            Yo, <b>{data.nombre || "________________________________________________"}</b>,
            identificado(a) con la cédula de ciudadanía número{" "}
            <b>{data.cedula || "____________________"}</b> expedida en{" "}
            <b>{data.expedida || "________________"}</b>, por medio de la presente hago constar
            que <b>AUTORIZO</b> a la sociedad <b>{FIXED_ALLY.razonSocial}</b>, identificada con
            NIT <b>{FIXED_ALLY.nit}</b>, para realizar el bloqueo del equipo electrónico que más
            adelante se detalla, en caso de presentarse mora en una o más cuotas de la
            financiación por la compra de dicho bien.
          </p>

          <p style={{ fontFamily: FONT_BODY, fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            Certifico que el asesor comercial de <b>iCREDIX S.A.</b> me suministró información
            completa y detallada de las características del bloqueo del equipo, el cual consiste
            en implantar un software o aplicación al equipo, para que, ante cualquier evento de
            mora en el pago de mis obligaciones, en cualquier momento durante el plazo del
            crédito, el terminal pueda ser inhabilitado para su uso de manera remota y temporal,
            hasta tanto no me ponga al día y cumpla con el pago de por lo menos una (1) cuota
            periódica vencida, momento en el cual el terminal se habilitará nuevamente.
          </p>

          <p style={{ fontFamily: FONT_BODY, fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            Por medio del presente documento autorizo expresa e irrevocablemente a{" "}
            <b>iCREDIX S.A.</b> a inhabilitar el terminal ante cualquier caso de mora en el pago
            de las cuotas periódicas. <b>iCREDIX S.A.</b> deberá habilitar nuevamente el terminal
            en un período que no podrá exceder veinticuatro (24) horas desde el momento en que se
            acredite el recibo de pago de la cuota periódica vencida.
          </p>

          <p style={{ fontFamily: FONT_BODY, fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            Autorizo que, por medio de la aplicación o software instalado en el equipo, se me
            realicen notificaciones de mora en el pago de la financiación, así como recordatorios
            de cuotas vencidas y gestiones de cobranza.
          </p>

          <p style={{ fontFamily: FONT_BODY, fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            EL CLIENTE manifiesta de manera libre, expresa e informada que adquiere una licencia
            de uso del referido software, con un valor equivalente al diez por ciento (10%) del
            precio del bien mueble financiado. Dicho valor será incluido dentro del monto total
            de la operación de crédito y hará parte de las cuotas periódicas pactadas.
          </p>

          <p style={{ fontFamily: FONT_BODY, fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 10 }}>
            Es mi voluntad dejar como garantía, sin tenencia, a favor de <b>iCREDIX S.A.</b> el
            equipo financiado, por lo que autorizo el bloqueo de este en las condiciones y
            términos aquí establecidos.
          </p>

          <p style={{ fontFamily: FONT_BODY, fontSize: 11.5, lineHeight: 1.6, textAlign: "justify", marginBottom: 20 }}>
            Esta autorización hace parte integral del estudio de financiación.
          </p>

          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, lineHeight: 2 }}>
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
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 11.5,
              color: BRAND.indigo,
              borderBottom: `1px solid ${BRAND.indigo}`,
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
          <div style={{ borderTop: `1px solid ${BRAND.ink}`, marginBottom: 6 }} />
          <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 10.5 }}>FIRMA CLIENTE</span>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ borderTop: `1px solid ${BRAND.ink}`, marginBottom: 6 }} />
          <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 10.5 }}>
            {docKey === "autorizacion" ? "HUELLA" : "FECHA"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   MAIN APP
----------------------------------------------------------------*/
export default function ClientDocuments() {
  const [docKey, setDocKey] = useState("ficha");
  const [forms, setForms] = useState({ autorizacion: emptyForm("autorizacion"), ficha: emptyForm("ficha") });
  const [saved, setSaved] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const records = await listRecords();
    setSaved(records);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const doc = DOCS[docKey];
  const data = forms[docKey];

  const setField = (id, value) =>
    setForms((prev) => ({ ...prev, [docKey]: { ...prev[docKey], [id]: value } }));

  const filledCount = useMemo(() => {
    const total = Object.keys(data).length;
    const filled = Object.values(data).filter((v) => v && v.length).length;
    return { filled, total };
  }, [data]);

  function newDocument(type) {
    setDocKey(type);
    setForms((prev) => ({ ...prev, [type]: emptyForm(type) }));
    setActiveId(null);
  }

  async function handleSave() {
    const clientName = data.nombre || "Cliente sin nombre";
    const record = {
      id: activeId || `${docKey}-${(data.cedula || "sc").replace(/\s+/g, "")}-${Date.now()}`,
      docKey,
      title: doc.title,
      clientName,
      cedula: data.cedula || "",
      data,
      savedAt: Date.now(),
    };
    await saveRecord(record);
    setActiveId(record.id);
    await refresh();
    setToast("Documento guardado en la documentación del cliente");
  }

  function openRecord(r) {
    setDocKey(r.docKey);
    setForms((prev) => ({ ...prev, [r.docKey]: { ...emptyForm(r.docKey), ...r.data } }));
    setActiveId(r.id);
  }

  async function removeRecord(id, e) {
    e.stopPropagation();
    await deleteRecord(id);
    if (activeId === id) setActiveId(null);
    await refresh();
    setToast("Documento eliminado");
  }

  function handlePrint() {
    window.print();
  }

  const filteredSaved = saved.filter((r) => {
    const q = query.toLowerCase();
    return !q || r.clientName.toLowerCase().includes(q) || (r.cedula || "").includes(q);
  });

  return (
    <div
      style={{ background: BRAND.bg, minHeight: "100%", fontFamily: FONT_BODY, color: BRAND.text }}
      className="w-full min-h-screen flex flex-col"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
        #printable-paper input::placeholder { color: transparent; }
        @media print {
          body * { visibility: hidden; }
          #printable-paper, #printable-paper * { visibility: visible; }
          #printable-paper { position: absolute; top: 0; left: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4 no-print"
        style={{ borderBottom: `1px solid ${BRAND.line}`, background: BRAND.panel }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${BRAND.indigo}, ${BRAND.violet})` }}
          >
            <ShieldCheck size={19} color="#fff" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15 }}>iCredix</div>
            <div style={{ fontSize: 11, color: BRAND.textDim }}>Documentación del cliente</div>
          </div>
        </div>
        <div className="flex gap-2">
          {Object.values(DOCS).map((d) => {
            const Icon = d.icon;
            const active = docKey === d.key;
            return (
              <button
                key={d.key}
                onClick={() => newDocument(d.key)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                style={{
                  background: active ? BRAND.violet : "transparent",
                  color: active ? "#fff" : BRAND.textDim,
                  border: `1px solid ${active ? BRAND.violet : BRAND.line}`,
                }}
              >
                <Icon size={14} />
                {d.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar: saved client documents */}
        <div
          className="no-print flex flex-col"
          style={{ width: 280, borderRight: `1px solid ${BRAND.line}`, background: BRAND.panel }}
        >
          <div className="p-4" style={{ borderBottom: `1px solid ${BRAND.line}` }}>
            <div className="relative">
              <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: BRAND.textDim }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente o cédula"
                className="w-full rounded-lg pl-8 pr-3 py-2 text-xs outline-none"
                style={{ background: BRAND.panelAlt, border: `1px solid ${BRAND.line}`, color: BRAND.text }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading && <div style={{ color: BRAND.textDim, fontSize: 12, padding: 12 }}>Cargando…</div>}
            {!loading && filteredSaved.length === 0 && (
              <div style={{ color: BRAND.textDim, fontSize: 12, padding: 12, lineHeight: 1.5 }}>
                Aún no hay documentos guardados. Completa un formulario y usa "Guardar en
                documentación del cliente".
              </div>
            )}
            {filteredSaved.map((r) => {
              const active = r.id === activeId;
              const Icon = DOCS[r.docKey].icon;
              return (
                <button
                  key={r.id}
                  onClick={() => openRecord(r)}
                  className="w-full text-left rounded-lg px-3 py-2.5 mb-1 flex items-start gap-2.5 group"
                  style={{ background: active ? BRAND.panelAlt : "transparent", border: `1px solid ${active ? BRAND.line : "transparent"}` }}
                >
                  <Icon size={15} color={BRAND.violet} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: BRAND.text }} className="truncate">
                      {r.clientName}
                    </div>
                    <div style={{ fontSize: 10.5, color: BRAND.textDim, fontFamily: FONT_MONO }}>
                      {r.cedula || "sin cédula"}
                    </div>
                    <div className="flex items-center gap-1 mt-1" style={{ fontSize: 10, color: BRAND.textDim }}>
                      <Clock size={10} />
                      {new Date(r.savedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      <span style={{ margin: "0 4px" }}>·</span>
                      {DOCS[r.docKey].title}
                    </div>
                  </div>
                  <Trash2
                    size={13}
                    onClick={(e) => removeRecord(r.id, e)}
                    style={{ color: BRAND.textDim, opacity: 0, flexShrink: 0 }}
                    className="group-hover:opacity-100 transition-opacity hover:!text-red-400"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Form column */}
        <div className="no-print flex-1 overflow-y-auto p-6" style={{ maxWidth: 480 }}>
          <div className="flex items-center justify-between mb-1">
            <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16 }}>{doc.title}</h2>
            {activeId && (
              <button
                onClick={() => newDocument(docKey)}
                className="flex items-center gap-1 text-xs"
                style={{ color: BRAND.textDim }}
              >
                <X size={12} /> nuevo
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: BRAND.panelAlt }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(filledCount.filled / filledCount.total) * 100}%`,
                  background: `linear-gradient(90deg, ${BRAND.indigo}, ${BRAND.violet})`,
                }}
              />
            </div>
            <span style={{ fontSize: 10.5, color: BRAND.textDim, fontFamily: FONT_MONO }}>
              {filledCount.filled}/{filledCount.total}
            </span>
          </div>

          <div className="flex flex-col gap-6">
            {doc.sections.map((section) => (
              <div key={section.title}>
                <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.violet, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {section.title}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {section.fields.map((f) => (
                    <Field key={f.id} field={f} value={data[f.id]} onChange={(v) => setField(f.id, v)} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-8 sticky bottom-0 pt-4" style={{ background: `linear-gradient(transparent, ${BRAND.bg} 30%)` }}>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold"
              style={{ background: `linear-gradient(135deg, ${BRAND.indigo}, ${BRAND.violet})`, color: "#fff" }}
            >
              <Save size={15} /> Guardar en documentación
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-semibold"
              style={{ border: `1px solid ${BRAND.line}`, color: BRAND.text }}
            >
              <Printer size={15} /> Imprimir
            </button>
            <button
              onClick={handlePrint}
              title="Usa 'Guardar como PDF' en el diálogo de impresión"
              className="flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-semibold"
              style={{ border: `1px solid ${BRAND.line}`, color: BRAND.text }}
            >
              <Download size={15} /> PDF
            </button>
          </div>
        </div>

        {/* Preview column */}
        <div className="flex-1 overflow-y-auto p-8" style={{ background: "#070914" }}>
          <div className="flex items-center gap-2 mb-4 no-print" style={{ color: BRAND.textDim, fontSize: 11 }}>
            <ChevronRight size={12} /> Vista previa — así se imprime y descarga
          </div>
          <DocumentPaper docKey={docKey} data={data} printRef={null} />
        </div>
      </div>

      {toast && (
        <div
          className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
          style={{ background: BRAND.panelAlt, border: `1px solid ${BRAND.violet}`, color: BRAND.text, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}
        >
          <CheckCircle2 size={15} color={BRAND.violet} />
          {toast}
        </div>
      )}
    </div>
  );
}
