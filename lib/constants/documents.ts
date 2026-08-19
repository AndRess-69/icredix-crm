export const DOCUMENT_TYPES = [
  { value: "identidad", label: "Documento de identidad" },
  { value: "foto_cedula", label: "Foto de cédula" },
  { value: "certificado", label: "Certificado" },
  { value: "autorizacion_bloqueo", label: "Autorización de bloqueo" },
  { value: "estudio", label: "Estudio" },
  { value: "comprobante_domicilio", label: "Comprobante de domicilio" },
  { value: "foto_casa", label: "Foto de casa" },
  { value: "foto_cliente", label: "Foto del cliente" },
  { value: "foto_cliente_producto", label: "Foto del cliente con producto" },
  { value: "documento_compra", label: "Documento de compra" },
  { value: "documento_entrega", label: "Documento de entrega" },
  { value: "contrato", label: "Contrato" },
  { value: "otro", label: "Otro" },
] as const;

export type DocumentTypeValue = (typeof DOCUMENT_TYPES)[number]["value"];

export function getDocumentTypeLabel(value: string | null): string {
  if (!value) return "Sin tipo";
  const match = DOCUMENT_TYPES.find((doc) => doc.value === value);
  return match?.label ?? value;
}
