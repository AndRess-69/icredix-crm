import type {
  BlockStatus,
  ClientValidationStatus,
  CreditStatus,
  DeviceStatus,
  InstallmentStatus,
  PaymentMethod,
  UserRole,
} from "./enums";

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface SoftDeletable {
  deleted_at: string | null;
}

export interface CompanySettings extends BaseEntity {
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  telegram_token: string | null;
  telegram_chat_id: string | null;
  interest_rate: number;
  google_sheet_id: string | null;
  google_service_account_json: string | null;
  google_script_url: string | null;
  google_script_token: string | null;
}

/**
 * Configuración expuesta a componentes cliente (Server Component / RSC).
 * Nunca contiene secretos: telegram_token, google_script_token y
 * google_service_account_json se leen únicamente en el servidor.
 */
export interface CompanySettingsPublic
  extends Omit<
    CompanySettings,
    "telegram_token" | "google_script_token" | "google_service_account_json"
  > {
  has_telegram_token: boolean;
  has_google_script_token: boolean;
}

export interface Profile extends BaseEntity, SoftDeletable {
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
}

export interface Client extends BaseEntity, SoftDeletable {
  first_name: string;
  last_name: string;
  cedula: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  birth_date: string | null;
  notes: string | null;
  validation_status: ClientValidationStatus;
  request_date: string | null;
  approval_date: string | null;
  validation_result: string | null;
  validation_notes: string | null;
}

export interface ClientDocument extends BaseEntity, SoftDeletable {
  client_id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  doc_type: string | null;
  notes: string | null;
  created_by: string | null;
  credit_id: string | null;
}

export interface Device extends BaseEntity, SoftDeletable {
  brand: string;
  model: string;
  capacity: string | null;
  color: string | null;
  imei: string | null;
  imei2: string | null;
  purchase_date: string | null;
  delivery_date: string | null;
  status: DeviceStatus;
  notes: string | null;
}

export interface DeviceReference extends BaseEntity, SoftDeletable {
  brand: string;
  model: string;
  capacity: string | null;
  color: string | null;
}

export interface Credit extends BaseEntity, SoftDeletable {
  credit_number: string;
  client_id: string;
  device_id: string | null;
  device_reference_id: string | null;
  imei: string | null;
  device_value: number;
  financed_amount: number;
  initial_payment: number;
  balance: number;
  installments_count: number;
  installment_amount: number;
  interest_rate: number;
  start_date: string;
  end_date: string;
  approval_date: string | null;
  status: CreditStatus;
}

export interface Installment extends BaseEntity {
  credit_id: string;
  number: number;
  due_date: string;
  amount: number;
  status: InstallmentStatus;
  paid_at: string | null;
  days_overdue: number;
}

export interface Payment extends BaseEntity, SoftDeletable {
  client_id: string;
  credit_id: string;
  installment_id: string | null;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_by: string | null;
  transferred_to_installment_id: string | null;
  is_partial: boolean;
}

export interface Block extends BaseEntity {
  block_date: string;
  client_id: string;
  imei: string;
  reason: string;
  user_id: string | null;
  status: BlockStatus;
  phone_line?: string | null;
  diagnoses?: string | null;
  credit_id?: string | null;
  device_id?: string | null;
  blocked_by?: string | null;
  encargo_bloqueos_json?: Record<string, unknown> | null;
}

export interface Unblock extends BaseEntity {
  unblock_date: string;
  client_id: string;
  imei: string;
  payment_id: string | null;
  user_id: string | null;
  status: BlockStatus;
  unblock_reason?: string | null;
  phone_line?: string | null;
  diagnoses?: string | null;
  credit_id?: string | null;
  device_id?: string | null;
  blocked_by?: string | null;
}

/** Cliente con nombre completo calculado */
export interface ClientWithFullName extends Client {
  full_name: string;
}

/** Pago con relaciones para el dashboard */
export interface PaymentWithRelations extends Payment {
  client?: Pick<Client, "first_name" | "last_name" | "cedula">;
  credit?: Pick<Credit, "credit_number">;
  installment?: Pick<Installment, "id" | "number">;
}

/** Cuota con relaciones para vencimientos */
export interface InstallmentWithRelations extends Installment {
  credit?: Pick<Credit, "credit_number" | "client_id"> & {
    client?: Pick<Client, "first_name" | "last_name" | "phone">;
  };
}

/** Estadísticas del dashboard */
export interface DashboardStats {
  activeClients: number;
  activeCredits: number;
  paymentsToday: number;
  paymentsTodayAmount: number;
  pendingPayments: number;
  overdueClients: number;
  blockedDevices: number;
  balanceToCollect: number;
  monthlyIncome: number;
}

/** Punto de datos para gráfico mensual */
export interface MonthlyPaymentChartPoint {
  month: string;
  amount: number;
}

/** Crédito con relaciones para el listado */
export interface CreditWithRelations extends Credit {
  client?: Pick<Client, "id" | "first_name" | "last_name" | "cedula" | "phone">;
  device?: Pick<Device, "id" | "brand" | "model" | "capacity" | "color" | "imei">;
  device_reference?: Pick<DeviceReference, "id" | "brand" | "model" | "capacity" | "color">;
}

/** Opción de cliente para formularios */
export interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
  cedula: string;
}

/** Opción de equipo para formularios */
export interface DeviceOption {
  id: string;
  brand: string;
  model: string;
  capacity: string | null;
  color: string | null;
  imei: string | null;
}

/** Opción de referencia de equipo para formularios */
export interface DeviceReferenceOption {
  id: string;
  brand: string;
  model: string;
  capacity: string | null;
  color: string | null;
}

/** Bloqueo con relaciones para el listado */
export interface BlockWithRelations extends Block {
  client?: Pick<Client, "id" | "first_name" | "last_name" | "cedula">;
  user?: Pick<Profile, "id" | "full_name">;
}

/** Desbloqueo con relaciones para el listado */
export interface UnblockWithRelations extends Unblock {
  client?: Pick<Client, "id" | "first_name" | "last_name" | "cedula">;
  payment?: Pick<Payment, "id" | "amount" | "created_at" | "method">;
  user?: Pick<Profile, "id" | "full_name">;
}

/** Respuesta asociada a un desbloqueo (BD BRAND / carrier / interna) */
export interface UnblockResponse extends BaseEntity {
  unblock_id: string;
  response_type: "brand" | "carrier" | "internal";
  message: string | null;
  payload: Record<string, unknown>;
}

/** Equipo candidato a desbloqueo: bloqueado junto con su crédito y cliente */
export interface UnblockCandidate {
  device: Pick<Device, "id" | "brand" | "model" | "capacity" | "color" | "imei" | "status">;
  credit?: Pick<Credit, "id" | "credit_number" | "balance" | "status"> | null;
  client?: Pick<Client, "id" | "first_name" | "last_name" | "cedula" | "phone"> | null;
}

/** Crédito cobrable para el formulario de pago */
export interface CreditPaymentOption {
  id: string;
  credit_number: string;
  client_id: string;
  client_first_name: string;
  client_last_name: string;
  client_cedula: string;
  imei: string;
  balance: number;
  status: CreditStatus;
  pending_count: number;
}

/** Cuota pendiente para el formulario de pago */
export interface PendingInstallmentOption {
  id: string;
  number: number;
  due_date: string;
  amount: number;
  days_overdue: number;
}

/** Resumen de pagos por método (reportes) */
export interface PaymentMethodSummary {
  method: PaymentMethod;
  count: number;
  amount: number;
}

/** Resumen de créditos por estado (reportes) */
export interface CreditStatusSummary {
  status: CreditStatus;
  count: number;
  financed: number;
  balance: number;
}

/** Crédito resumido para el detalle de un cliente */
export interface ClientCreditDetail {
  id: string;
  credit_number: string;
  imei: string | null;
  balance: number;
  status: CreditStatus;
  device_label: string | null;
  pending_count: number;
}

/** Cuota pendiente/vencida para el detalle de un cliente */
export interface ClientPendingInstallment {
  id: string;
  credit_number: string;
  number: number;
  due_date: string;
  amount: number;
  status: InstallmentStatus;
}

/** Pago resumido para el detalle de un cliente */
export interface ClientPaymentDetail {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  created_at: string;
  credit_number: string | null;
}

/** Detalle completo de un cliente (card al hacer clic) */
export interface ClientDetail {
  client: Client;
  credits: ClientCreditDetail[];
  pendingInstallments: ClientPendingInstallment[];
  payments: ClientPaymentDetail[];
  deliveryPhotos: ClientDeliveryPhoto[];
}

/** Foto de entrega resumida para el detalle de un cliente */
export interface ClientDeliveryPhoto {
  id: string;
  credit_number: string;
  name: string;
  file_type: string | null;
  signed_url: string;
}

/** Documento administrativo (formatos, políticas, etc.) */
export interface AdminDocument extends BaseEntity, SoftDeletable {
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  created_by: string | null;
}

/** Documento administrativo con URL firmada lista para ver/descargar */
export interface AdminDocumentWithUrl extends AdminDocument {
  signed_url: string;
}

/** Clave de un formato diligenciable */
export type EditableDocKey = "autorizacion" | "ficha";

/** Registro de un documento editable diligenciado (ficha/autorización) */
export interface EditableDocument extends BaseEntity, SoftDeletable {
  doc_key: EditableDocKey;
  client_name: string;
  cedula: string;
  data: Record<string, string>;
  created_by: string | null;
}

/** Foto/adjunto de entrega de un crédito */
export interface CreditDocument extends SoftDeletable {
  id: string;
  credit_id: string;
  client_id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  created_by: string | null;
  created_at: string;
}

/** Foto de entrega con URL firmada */
export interface CreditDocumentWithUrl extends CreditDocument {
  signed_url: string;
}

/** Documento del cliente con URL firmada para ver/descargar */
export interface ClientDocumentWithUrl extends ClientDocument {
  signed_url: string;
  uploaded_by_name: string | null;
}

/** Pago dentro del expediente con crédito y cuota */
export interface ExpedientePayment {
  id: string;
  credit_id: string;
  credit_number: string | null;
  installment_number: number | null;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

/** Crédito con agregados para el expediente del cliente */
export interface ExpedienteCredit extends Credit {
  device: Device | null;
  device_reference: DeviceReference | null;
  installments: Installment[];
  total_paid: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
  next_due: string | null;
}

export type HistoryEventType =
  | "cliente_creado"
  | "validacion"
  | "credito_creado"
  | "credito_aprobado"
  | "pago"
  | "bloqueo"
  | "desbloqueo"
  | "documento"
  | "equipo";

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  title: string;
  description: string;
  date: string;
}

/** Expediente completo de un cliente (vista central del CRM) */
export interface ClientExpediente {
  client: Client;
  credits: ExpedienteCredit[];
  documents: ClientDocumentWithUrl[];
  payments: ExpedientePayment[];
  blocks: Block[];
  unblocks: Unblock[];
  history: HistoryEvent[];
}
