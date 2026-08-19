import {
  BLOCK_STATUSES,
  CLIENT_VALIDATION_STATUSES,
  CREDIT_STATUSES,
  DEVICE_STATUSES,
  INSTALLMENT_STATUSES,
  PAYMENT_METHODS,
  type BlockStatus,
  type ClientValidationStatus,
  type CreditStatus,
  type DeviceStatus,
  type InstallmentStatus,
  type PaymentMethod,
} from "@/types";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | "success" | "warning" | "info";

const creditStatusLabels: Record<CreditStatus, string> = {
  en_proceso: "En proceso",
  activo: "Activo",
  negado: "Negado",
  finalizado: "Finalizado",
  en_mora: "En mora",
  bloqueado: "Bloqueado",
  desbloqueado: "Desbloqueado",
};

const creditStatusVariants: Record<CreditStatus, BadgeVariant> = {
  en_proceso: "warning",
  activo: "info",
  negado: "destructive",
  finalizado: "success",
  en_mora: "destructive",
  bloqueado: "destructive",
  desbloqueado: "success",
};

const deviceStatusLabels: Record<DeviceStatus, string> = {
  disponible: "Disponible",
  entregado: "Entregado",
  bloqueado: "Bloqueado",
  desbloqueado: "Desbloqueado",
  pendiente_asignacion: "Pendiente de asignación",
  comprado: "Comprado",
  asignado: "Asignado",
  devuelto: "Devuelto",
};

const deviceStatusVariants: Record<DeviceStatus, BadgeVariant> = {
  disponible: "info",
  entregado: "secondary",
  bloqueado: "destructive",
  desbloqueado: "success",
  pendiente_asignacion: "warning",
  comprado: "info",
  asignado: "secondary",
  devuelto: "outline",
};

const installmentStatusLabels: Record<InstallmentStatus, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  vencida: "Vencida",
};

const installmentStatusVariants: Record<InstallmentStatus, BadgeVariant> = {
  pendiente: "warning",
  pagada: "success",
  vencida: "destructive",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  nequi: "Nequi",
  daviplata: "Daviplata",
  otro: "Otro",
};

const blockStatusLabels: Record<BlockStatus, string> = {
  pendiente: "Pendiente",
  enviado: "Enviado",
  confirmado: "Confirmado",
};

const blockStatusVariants: Record<BlockStatus, BadgeVariant> = {
  pendiente: "warning",
  enviado: "secondary",
  confirmado: "success",
};

const clientValidationStatusLabels: Record<ClientValidationStatus, string> = {
  pendiente: "Pendiente",
  en_estudio: "En estudio",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

const clientValidationStatusVariants: Record<ClientValidationStatus, BadgeVariant> = {
  pendiente: "warning",
  en_estudio: "info",
  aprobado: "success",
  rechazado: "destructive",
};

export function getBlockStatusInfo(status: BlockStatus) {
  return { label: blockStatusLabels[status], variant: blockStatusVariants[status] };
}

export function getClientValidationStatusInfo(status: ClientValidationStatus) {
  return {
    label: clientValidationStatusLabels[status],
    variant: clientValidationStatusVariants[status],
  };
}

export function getCreditStatusInfo(status: CreditStatus) {
  return { label: creditStatusLabels[status], variant: creditStatusVariants[status] };
}

export function getDeviceStatusInfo(status: DeviceStatus) {
  return { label: deviceStatusLabels[status], variant: deviceStatusVariants[status] };
}

export function getInstallmentStatusInfo(status: InstallmentStatus) {
  return { label: installmentStatusLabels[status], variant: installmentStatusVariants[status] };
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return paymentMethodLabels[method];
}

export {
  BLOCK_STATUSES,
  CLIENT_VALIDATION_STATUSES,
  CREDIT_STATUSES,
  DEVICE_STATUSES,
  INSTALLMENT_STATUSES,
  PAYMENT_METHODS,
};
