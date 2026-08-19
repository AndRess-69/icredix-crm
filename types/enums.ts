export const USER_ROLES = ["admin", "agente"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DEVICE_STATUSES = [
  "disponible",
  "entregado",
  "bloqueado",
  "desbloqueado",
  "pendiente_asignacion",
  "comprado",
  "asignado",
  "devuelto",
] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const CLIENT_VALIDATION_STATUSES = [
  "pendiente",
  "en_estudio",
  "aprobado",
  "rechazado",
] as const;
export type ClientValidationStatus = (typeof CLIENT_VALIDATION_STATUSES)[number];

export const CREDIT_STATUSES = [
  "en_proceso",
  "activo",
  "negado",
  "finalizado",
  "en_mora",
  "bloqueado",
  "desbloqueado",
] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export const INSTALLMENT_STATUSES = ["pendiente", "pagada", "vencida"] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  "efectivo",
  "transferencia",
  "nequi",
  "daviplata",
  "otro",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const BLOCK_STATUSES = ["pendiente", "enviado", "confirmado"] as const;
export type BlockStatus = (typeof BLOCK_STATUSES)[number];
