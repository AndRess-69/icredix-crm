import { format } from "date-fns";

export interface CreditCalculation {
  installmentAmount: number;
  lastInstallmentAmount: number;
  balance: number;
  endDate: string;
}

/**
 * Próxima fecha de pago quincenal (2 o 17 del mes) estrictamente posterior
 * a la fecha dada.
 */
export function nextPaymentDate(date: Date): Date {
  const day = date.getDate();
  if (day < 2) return new Date(date.getFullYear(), date.getMonth(), 2);
  if (day < 17) return new Date(date.getFullYear(), date.getMonth(), 17);
  return new Date(date.getFullYear(), date.getMonth() + 1, 2);
}

/**
 * Calcula los valores derivados de un crédito.
 * Las cuotas suman el valor financiado (total con interés); la última
 * absorbe el residuo.
 * El saldo por cobrar = valor financiado (suma de las cuotas). La cuota
 * inicial se cobra por aparte y no reduce el saldo.
 * Vencimientos quincenales (2 y 17): la primera cuota cae en el segundo
 * vencimiento próximo, contando desde el primero posterior a la fecha de inicio.
 */
export function calculateCredit(
  financedAmount: number,
  installmentsCount: number,
  startDate: string
): CreditCalculation {
  const base = Math.floor(financedAmount / installmentsCount);
  const last = financedAmount - base * (installmentsCount - 1);
  const balance = financedAmount;

  let due = nextPaymentDate(new Date(`${startDate}T00:00:00`));
  due = nextPaymentDate(due);
  for (let i = 1; i < installmentsCount; i++) {
    due = nextPaymentDate(due);
  }

  return {
    installmentAmount: base,
    lastInstallmentAmount: last,
    balance,
    endDate: format(due, "yyyy-MM-dd"),
  };
}
