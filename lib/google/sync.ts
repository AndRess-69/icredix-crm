import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import {
  getBlockStatusInfo,
  getPaymentMethodLabel,
} from "@/lib/utils/status";
import {
  appendRowsToTab,
  getSheetConfig,
  overwriteTab,
} from "./sheets";

const CLIENTS_TAB = "Clientes";
const CREDITS_TAB = "Créditos Aprobados";
const PAYMENTS_TAB = "Pagos";
const BLOQUEOS_TAB = "Bloqueos";
const DESBLOQUEOS_TAB = "Desbloqueos";

const CLIENTS_HEADERS = [
  "Fecha",
  "Nombres",
  "Apellidos",
  "Cédula",
  "Teléfono",
  "Correo",
  "Ciudad",
  "Dirección",
  "Fecha nacimiento",
  "Notas",
];

const CREDITS_HEADERS = [
  "Fecha aprobación",
  "N° crédito",
  "Cliente",
  "Cédula",
  "Equipo",
  "IMEI",
  "Valor equipo",
  "Cuota inicial",
  "Valor a financiar (base)",
  "Total a pagar (con interés)",
  "Interés %",
  "N° cuotas",
  "Valor cuota",
  "Saldo",
  "Primer pago",
];

const PAYMENTS_HEADERS = [
  "Fecha",
  "N° crédito",
  "Cliente",
  "Cédula",
  "Cuota",
  "Monto",
  "Método",
  "Referencia",
  "Notas",
];

const BLOQUEOS_HEADERS = [
  "Fecha",
  "Cliente",
  "Cédula",
  "IMEI",
  "Motivo",
  "Estado",
];

const DESBLOQUEOS_HEADERS = [
  "Fecha",
  "Cliente",
  "Cédula",
  "IMEI",
  "Pago asociado",
  "Estado",
];

function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  const iso = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "dd/MM/yyyy");
}

function fullName(
  client?: { first_name?: string | null; last_name?: string | null } | null
): string {
  if (!client) return "";
  return `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
}

/* ------------------------------ Clientes ------------------------------ */

export async function syncClientToSheet(clientId: string): Promise<void> {
  try {
    const config = await getSheetConfig();
    if (!config) return;

    const supabase = await createClient();

    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!data) return;

    await appendRowsToTab(config, CLIENTS_TAB, CLIENTS_HEADERS, [
      [
        fmtDate(data.created_at),
        data.first_name,
        data.last_name,
        data.cedula,
        data.phone,
        data.email ?? "",
        data.city ?? "",
        data.address ?? "",
        fmtDate(data.birth_date),
        data.notes ?? "",
      ],
    ]);
  } catch (error) {
    console.error("[google-sheets] No se pudo sincronizar el cliente:", error);
  }
}

/* ----------------------- Créditos aprobados ---------------------------- */

export async function syncApprovedCreditToSheet(creditId: string): Promise<void> {
  try {
    const config = await getSheetConfig();
    if (!config) return;

    const row = await buildCreditRow(creditId);
    if (!row) return;

    await appendRowsToTab(config, CREDITS_TAB, CREDITS_HEADERS, [row]);
  } catch (error) {
    console.error(
      "[google-sheets] No se pudo sincronizar el crédito aprobado:",
      error
    );
  }
}

async function buildCreditRow(
  creditId: string
): Promise<(string | number)[] | null> {
  const supabase = await createClient();

  const { data: credit } = await supabase
    .from("credits")
    .select(
      "credit_number, imei, device_value, financed_amount, initial_payment, balance, installments_count, installment_amount, interest_rate, approval_date, client:clients(first_name, last_name, cedula), device:devices(brand, model), device_reference:device_references(brand, model)"
    )
    .eq("id", creditId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!credit) return null;

  const { data: firstInstallment } = await supabase
    .from("installments")
    .select("due_date")
    .eq("credit_id", creditId)
    .eq("number", 1)
    .maybeSingle();

  const client = Array.isArray(credit.client) ? credit.client[0] : credit.client;
  const device = Array.isArray(credit.device) ? credit.device[0] : credit.device;
  const deviceRef = Array.isArray(credit.device_reference) ? credit.device_reference[0] : credit.device_reference;

  return [
    fmtDate(credit.approval_date),
    credit.credit_number,
    fullName(client),
    client?.cedula ?? "",
    deviceRef ? `${deviceRef.brand} ${deviceRef.model}`.trim()
      : device ? `${device.brand} ${device.model}`.trim()
      : "",
    credit.imei,
    Number(credit.device_value),
    Number(credit.initial_payment),
    Math.max(0, Number(credit.device_value) - Number(credit.initial_payment)),
    Number(credit.financed_amount),
    Number(credit.interest_rate),
    credit.installments_count,
    Number(credit.installment_amount),
    Number(credit.balance),
    firstInstallment?.due_date ? fmtDate(firstInstallment.due_date) : "",
  ];
}

/* ------------------------------- Pagos --------------------------------- */

export async function syncPaymentToSheet(
  creditId: string,
  installmentId: string | null
): Promise<void> {
  try {
    const config = await getSheetConfig();
    if (!config) return;

    const row = await buildPaymentRow(creditId, installmentId);
    if (!row) return;

    await appendRowsToTab(config, PAYMENTS_TAB, PAYMENTS_HEADERS, [row]);
  } catch (error) {
    console.error("[google-sheets] No se pudo sincronizar el pago:", error);
  }
}

async function buildPaymentRow(
  creditId: string,
  installmentId: string | null
): Promise<(string | number)[] | null> {
  const supabase = await createClient();

  let query = supabase
    .from("payments")
    .select(
      "amount, method, reference, notes, created_at, credit:credits(credit_number, client:clients(first_name, last_name, cedula)), installment:installments!payments_installment_id_fkey(number)"
    )
    .eq("credit_id", creditId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (installmentId) {
    query = query.eq("installment_id", installmentId);
  }

  const { data } = await query.maybeSingle();
  if (!data) return null;

  const credit = Array.isArray(data.credit) ? data.credit[0] : data.credit;
  const client = credit?.client ?? null;
  const installment = Array.isArray(data.installment)
    ? data.installment[0]
    : data.installment;

  return [
    fmtDate(data.created_at),
    credit?.credit_number ?? "",
    fullName(client),
    client?.cedula ?? "",
    installment?.number != null ? `Cuota ${installment.number}` : "",
    Number(data.amount),
    getPaymentMethodLabel(data.method),
    data.reference ?? "",
    data.notes ?? "",
  ];
}

/* --------------------- Bloqueos y desbloqueos --------------------------- */

export async function syncBlockToSheet(blockId: string): Promise<void> {
  try {
    const config = await getSheetConfig();
    if (!config) return;

    const row = await buildBlockRow(blockId);
    if (!row) return;

    await appendRowsToTab(config, BLOQUEOS_TAB, BLOQUEOS_HEADERS, [row]);
  } catch (error) {
    console.error("[google-sheets] No se pudo sincronizar el bloqueo:", error);
  }
}

async function buildBlockRow(
  blockId: string
): Promise<(string | number)[] | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("blocks")
    .select(
      "block_date, imei, reason, status, client:clients(first_name, last_name, cedula)"
    )
    .eq("id", blockId)
    .maybeSingle();

  if (!data) return null;

  const client = Array.isArray(data.client) ? data.client[0] : data.client;

  return [
    fmtDate(data.block_date),
    fullName(client),
    client?.cedula ?? "",
    data.imei,
    data.reason ?? "",
    getBlockStatusInfo(data.status).label,
  ];
}

export async function syncUnblockToSheet(unblockId: string): Promise<void> {
  try {
    const config = await getSheetConfig();
    if (!config) return;

    const row = await buildUnblockRow(unblockId);
    if (!row) return;

    await appendRowsToTab(config, DESBLOQUEOS_TAB, DESBLOQUEOS_HEADERS, [row]);
  } catch (error) {
    console.error("[google-sheets] No se pudo sincronizar el desbloqueo:", error);
  }
}

async function buildUnblockRow(
  unblockId: string
): Promise<(string | number)[] | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("unblocks")
    .select(
      "unblock_date, imei, status, client:clients(first_name, last_name, cedula), payment:payments(credit:credits(credit_number), installment:installments!payments_installment_id_fkey(number))"
    )
    .eq("id", unblockId)
    .maybeSingle();

  if (!data) return null;

  const client = Array.isArray(data.client) ? data.client[0] : data.client;
  const payment = Array.isArray(data.payment) ? data.payment[0] : data.payment;
  const credit = Array.isArray(payment?.credit)
    ? payment.credit[0]
    : payment?.credit ?? null;
  const installment = Array.isArray(payment?.installment)
    ? payment.installment[0]
    : payment?.installment ?? null;

  return [
    fmtDate(data.unblock_date),
    fullName(client),
    client?.cedula ?? "",
    data.imei,
    credit?.credit_number != null
      ? `${credit.credit_number}${
          installment?.number != null ? ` · Cuota ${installment.number}` : ""
        }`
      : "",
    getBlockStatusInfo(data.status).label,
  ];
}

/* ------------------------ Sincronización total ------------------------- */

export interface SyncAllResult {
  ok: boolean;
  error?: string;
  clients?: number;
  credits?: number;
  payments?: number;
  blocks?: number;
  unblocks?: number;
}

/**
 * Reconstruye por completo las tres pestañas con todo el historial.
 */
export async function syncAllToSheet(): Promise<SyncAllResult> {
  let config;
  try {
    config = await getSheetConfig();
  } catch {
    return {
      ok: false,
      error: "No se pudo leer la configuración de Google Sheets",
    };
  }

  if (!config) {
    return {
      ok: false,
      error: "Configura primero la URL del Web App de Google Sheets",
    };
  }

  try {
    const supabase = await createClient();

    const [clientsRes, creditsRes, paymentsRes, blocksRes, unblocksRes] =
      await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .limit(10000),
        supabase
          .from("credits")
          .select(
            "id, credit_number, imei, device_value, financed_amount, initial_payment, balance, installments_count, installment_amount, interest_rate, approval_date, client:clients(first_name, last_name, cedula), device:devices(brand, model), device_reference:device_references(brand, model)"
          )
          .is("deleted_at", null)
          .not("approval_date", "is", null)
          .order("approval_date", { ascending: true })
          .limit(10000),
        supabase
          .from("payments")
          .select(
            "credit_id, amount, method, reference, notes, created_at, credit:credits(credit_number, client:clients(first_name, last_name, cedula)), installment:installments(number)"
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .limit(10000),
        supabase
          .from("blocks")
          .select(
            "block_date, imei, reason, status, client:clients(first_name, last_name, cedula)"
          )
          .order("block_date", { ascending: true })
          .limit(10000),
        supabase
          .from("unblocks")
          .select(
            "unblock_date, imei, status, client:clients(first_name, last_name, cedula), payment:payments(credit:credits(credit_number), installment:installments!payments_installment_id_fkey(number))"
          )
          .order("unblock_date", { ascending: true })
          .limit(10000),
      ]);

    const clients = clientsRes.data ?? [];
    const credits = creditsRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const blocks = blocksRes.data ?? [];
    const unblocks = unblocksRes.data ?? [];

    const creditIds = credits.map((credit) => credit.id);
    const firstDueByCredit = new Map<string, string>();
    if (creditIds.length > 0) {
      const { data: firsts } = await supabase
        .from("installments")
        .select("credit_id, due_date")
        .in("credit_id", creditIds)
        .eq("number", 1);
      for (const first of firsts ?? []) {
        if (!firstDueByCredit.has(first.credit_id)) {
          firstDueByCredit.set(first.credit_id, first.due_date);
        }
      }
    }

    const clientRows = clients.map((client) => [
      fmtDate(client.created_at),
      client.first_name,
      client.last_name,
      client.cedula,
      client.phone,
      client.email ?? "",
      client.city ?? "",
      client.address ?? "",
      fmtDate(client.birth_date),
      client.notes ?? "",
    ]);

    const creditRows = credits.map((credit) => {
      const client = Array.isArray(credit.client)
        ? credit.client[0]
        : credit.client;
      const device = Array.isArray(credit.device)
        ? credit.device[0]
        : credit.device;
      const deviceRef = Array.isArray(credit.device_reference)
        ? credit.device_reference[0]
        : credit.device_reference;
      return [
        fmtDate(credit.approval_date),
        credit.credit_number,
        fullName(client),
        client?.cedula ?? "",
        deviceRef ? `${deviceRef.brand} ${deviceRef.model}`.trim()
          : device ? `${device.brand} ${device.model}`.trim()
          : "",
        credit.imei,
        Number(credit.device_value),
        Number(credit.initial_payment),
        Math.max(0, Number(credit.device_value) - Number(credit.initial_payment)),
        Number(credit.financed_amount),
        Number(credit.interest_rate),
        credit.installments_count,
        Number(credit.installment_amount),
        Number(credit.balance),
        fmtDate(firstDueByCredit.get(credit.id) ?? null),
      ];
    });

    const paymentRows = payments.map((payment) => {
      const credit = Array.isArray(payment.credit)
        ? payment.credit[0]
        : payment.credit;
      const client = credit?.client ?? null;
      const installment = Array.isArray(payment.installment)
        ? payment.installment[0]
        : payment.installment;
      return [
        fmtDate(payment.created_at),
        credit?.credit_number ?? "",
        fullName(client),
        client?.cedula ?? "",
        installment?.number != null ? `Cuota ${installment.number}` : "",
        Number(payment.amount),
        getPaymentMethodLabel(payment.method),
        payment.reference ?? "",
        payment.notes ?? "",
      ];
    });

    const blockRows = blocks.map((block) => {
      const client = Array.isArray(block.client)
        ? block.client[0]
        : block.client;
      return [
        fmtDate(block.block_date),
        fullName(client),
        client?.cedula ?? "",
        block.imei,
        block.reason ?? "",
        getBlockStatusInfo(block.status).label,
      ];
    });

    const unblockRows = unblocks.map((unblock) => {
      const client = Array.isArray(unblock.client)
        ? unblock.client[0]
        : unblock.client;
      const payment = Array.isArray(unblock.payment)
        ? unblock.payment[0]
        : unblock.payment;
      const credit = Array.isArray(payment?.credit)
        ? payment.credit[0]
        : payment?.credit ?? null;
      const installment = Array.isArray(payment?.installment)
        ? payment.installment[0]
        : payment?.installment ?? null;
      return [
        fmtDate(unblock.unblock_date),
        fullName(client),
        client?.cedula ?? "",
        unblock.imei,
        credit?.credit_number != null
          ? `${credit.credit_number}${
              installment?.number != null ? ` · Cuota ${installment.number}` : ""
            }`
          : "",
        getBlockStatusInfo(unblock.status).label,
      ];
    });

    await Promise.all([
      overwriteTab(config, CLIENTS_TAB, CLIENTS_HEADERS, clientRows),
      overwriteTab(config, CREDITS_TAB, CREDITS_HEADERS, creditRows),
      overwriteTab(config, PAYMENTS_TAB, PAYMENTS_HEADERS, paymentRows),
      overwriteTab(config, BLOQUEOS_TAB, BLOQUEOS_HEADERS, blockRows),
      overwriteTab(config, DESBLOQUEOS_TAB, DESBLOQUEOS_HEADERS, unblockRows),
    ]);

    return {
      ok: true,
      clients: clients.length,
      credits: credits.length,
      payments: payments.length,
      blocks: blocks.length,
      unblocks: unblocks.length,
    };
  } catch (error) {
    console.error("[google-sheets] No se pudo sincronizar todo:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error al sincronizar",
    };
  }
}
