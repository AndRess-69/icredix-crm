"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ShieldCheck } from "lucide-react";

import type { EditableDocKey } from "@/types";

/* ---------------------------------------------------------------
   SHARED TYPES & CONSTANTS
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

const PAPER = {
  paper: "#FFFFFF",
  ink: "#1A1A2E",
  inkDim: "#5A5E78",
  indigo: "#2B2E8C",
  violet: "#7C4DFF",
  line: "#D9D9E3",
  labelBg: "#F2F2F7",
};

const FIXED_ALLY = {
  razonSocial: "PADLOCK S.A.S.",
  nit: "901675632-1",
};

/* ---------------------------------------------------------------
   DOCUMENT DEFINITIONS
---------------------------------------------------------------*/
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
    icon: ShieldCheck,
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

export { DocumentPaper, PaperRow, DOCS, FIXED_ALLY, PAPER, type DocDef, type DocSection, type DocField };
