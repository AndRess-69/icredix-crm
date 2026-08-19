/**
 * Formatea un valor numérico como moneda colombiana (COP).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Obtiene el nombre completo de un cliente.
 */
export function getClientFullName(
  firstName: string,
  lastName: string
): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Formatea una fecha ISO a formato legible.
 */
export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Formatea fecha y hora.
 */
export function formatDateTime(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
