import { createClient } from "@/lib/supabase/server";
import { getDocumentTypeLabel } from "@/lib/constants/documents";
import {
  getBlockStatusInfo,
  getClientValidationStatusInfo,
  getCreditStatusInfo,
} from "@/lib/utils/status";
import type {
  Block,
  ClientExpediente,
  ExpedienteCredit,
  ExpedientePayment,
  HistoryEvent,
  Unblock,
} from "@/types";

function toBlock(doc: { [key: string]: unknown }): Block {
  return {
    id: String(doc.id),
    block_date: String(doc.block_date),
    client_id: String(doc.client_id),
    imei: String(doc.imei),
    reason: String(doc.reason),
    user_id: doc.user_id ? String(doc.user_id) : null,
    status: doc.status as Block["status"],
    created_at: String(doc.created_at),
    updated_at: String(doc.updated_at),
  };
}

function toUnblock(doc: { [key: string]: unknown }): Unblock {
  return {
    id: String(doc.id),
    unblock_date: String(doc.unblock_date),
    client_id: String(doc.client_id),
    imei: String(doc.imei),
    payment_id: doc.payment_id ? String(doc.payment_id) : null,
    user_id: doc.user_id ? String(doc.user_id) : null,
    status: doc.status as Unblock["status"],
    created_at: String(doc.created_at),
    updated_at: String(doc.updated_at),
  };
}

/**
 * Expediente completo de un cliente: datos, validación, créditos con equipo,
 * cuotas, pagos, documentos (con URLs firmadas), bloqueos/desbloqueos e
 * historial cronológico derivado de los registros existentes.
 *
 * No usa caché: las URLs firmadas expiran y la información debe estar fresca.
 */
export async function getClientExpediente(
  clientId: string
): Promise<ClientExpediente | null> {
  const supabase = await createClient();

  const [clientRes, creditsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("credits")
      .select(
        "id, credit_number, client_id, device_id, device_reference_id, imei, device_value, financed_amount, initial_payment, balance, installments_count, installment_amount, interest_rate, start_date, end_date, approval_date, status, created_at, updated_at, deleted_at, device:devices(*), device_reference:device_references(id, brand, model, capacity, color)"
      )
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const client = clientRes.data;
  if (!client) return null;

  const credits = creditsRes.data ?? [];
  const creditIds = credits.map((credit) => credit.id);

  const { data: installments } =
    creditIds.length > 0
      ? await supabase
          .from("installments")
          .select("*")
          .in("credit_id", creditIds)
          .order("number", { ascending: true })
      : { data: [] };

  const [paymentsRes, blocksRes, unblocksRes, documentsRes] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, credit_id, amount, method, reference, notes, created_at, credit:credits(credit_number), installment:installments!payments_installment_id_fkey(number)"
      )
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("blocks")
      .select("*")
      .eq("client_id", clientId)
      .order("block_date", { ascending: false })
      .limit(100),
    supabase
      .from("unblocks")
      .select("*")
      .eq("client_id", clientId)
      .order("unblock_date", { ascending: false })
      .limit(100),
    supabase
      .from("client_documents")
      .select(
        "id, client_id, name, file_url, file_type, doc_type, notes, created_by, credit_id, created_at, updated_at, deleted_at, uploaded_by:profiles(full_name)"
      )
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const blocks = (blocksRes.data ?? []).map(toBlock);
  const unblocks = (unblocksRes.data ?? []).map(toUnblock);
  const payments = paymentsRes.data ?? [];
  const documents = (documentsRes.data ?? []) as Array<{
    id: string;
    name: string;
    file_url: string;
    file_type: string | null;
    doc_type: string | null;
    notes: string | null;
    created_by: string | null;
    credit_id: string | null;
    created_at: string;
    updated_at: string | null;
    deleted_at: string | null;
    uploaded_by: { full_name: string } | Array<{ full_name: string }> | null;
  }>;

  // Firmar URLs de documentos (1h) — en paralelo
  const signedResults = await Promise.all(
    documents.map((doc) =>
      supabase.storage
        .from("documents")
        .createSignedUrl(doc.file_url, 3600)
        .then(({ data: signed }) => {
          const uploadedBy = Array.isArray(doc.uploaded_by)
            ? doc.uploaded_by[0]
            : doc.uploaded_by;
          return {
            id: doc.id,
            client_id: clientId,
            name: doc.name,
            file_url: doc.file_url,
            file_type: doc.file_type,
            doc_type: doc.doc_type,
            notes: doc.notes,
            created_by: doc.created_by,
            credit_id: doc.credit_id,
            created_at: doc.created_at,
            updated_at: doc.updated_at ?? doc.created_at,
            deleted_at: doc.deleted_at ?? null,
            signed_url: signed?.signedUrl ?? "",
            uploaded_by_name: uploadedBy?.full_name ?? null,
          };
        })
    )
  );
  const documentsWithUrl = signedResults;

  // Agregados por crédito
  const paidCountByCredit = new Map<string, number>();
  const pendingCountByCredit = new Map<string, number>();
  const overdueCountByCredit = new Map<string, number>();
  const totalPaidByCredit = new Map<string, number>();
  const nextDueByCredit = new Map<string, string>();

  for (const installment of installments ?? []) {
    const creditId = installment.credit_id;
    if (installment.status === "pagada") {
      paidCountByCredit.set(creditId, (paidCountByCredit.get(creditId) ?? 0) + 1);
    } else {
      pendingCountByCredit.set(creditId, (pendingCountByCredit.get(creditId) ?? 0) + 1);
      if (installment.status === "vencida") {
        overdueCountByCredit.set(creditId, (overdueCountByCredit.get(creditId) ?? 0) + 1);
      }
      const current = nextDueByCredit.get(creditId);
      if (!current || installment.due_date < current) {
        nextDueByCredit.set(creditId, installment.due_date);
      }
    }
  }

  const paymentsDetail: ExpedientePayment[] = (payments ?? []).map((payment) => {
    const credit = Array.isArray(payment.credit)
      ? payment.credit[0]
      : payment.credit;
    const installment = Array.isArray(payment.installment)
      ? payment.installment[0]
      : payment.installment;
    const detail: ExpedientePayment = {
      id: payment.id,
      credit_id: payment.credit_id,
      credit_number: credit?.credit_number ?? null,
      installment_number: installment?.number != null ? installment.number : null,
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
      created_at: payment.created_at,
    };
    totalPaidByCredit.set(
      payment.credit_id,
      (totalPaidByCredit.get(payment.credit_id) ?? 0) + detail.amount
    );
    return detail;
  });

  const creditsDetail: ExpedienteCredit[] = (credits ?? []).map((credit) => {
    const device = Array.isArray(credit.device)
      ? credit.device[0] ?? null
      : (credit.device ?? null);
    const device_reference = Array.isArray(credit.device_reference)
      ? credit.device_reference[0] ?? null
      : (credit.device_reference ?? null);
    return {
      id: credit.id,
      credit_number: credit.credit_number,
      client_id: credit.client_id,
      device_id: credit.device_id,
      device_reference_id: credit.device_reference_id,
      imei: credit.imei,
      device_value: Number(credit.device_value),
      financed_amount: Number(credit.financed_amount),
      initial_payment: Number(credit.initial_payment),
      balance: Number(credit.balance),
      installments_count: credit.installments_count,
      installment_amount: Number(credit.installment_amount),
      interest_rate: Number(credit.interest_rate),
      start_date: credit.start_date,
      end_date: credit.end_date,
      approval_date: credit.approval_date,
      status: credit.status,
      created_at: credit.created_at,
      updated_at: credit.updated_at,
      deleted_at: credit.deleted_at,
      device,
      device_reference,
      installments: (installments ?? []).filter((inst) => inst.credit_id === credit.id),
      total_paid: totalPaidByCredit.get(credit.id) ?? 0,
      paid_count: paidCountByCredit.get(credit.id) ?? 0,
      pending_count: pendingCountByCredit.get(credit.id) ?? 0,
      overdue_count: overdueCountByCredit.get(credit.id) ?? 0,
      next_due: nextDueByCredit.get(credit.id) ?? null,
    };
  });

  // Historial cronológico (derivado, sin tabla nueva)
  const history: HistoryEvent[] = [];

  history.push({
    id: `cliente-${client.id}`,
    type: "cliente_creado",
    title: "Cliente registrado",
    description: `${client.first_name} ${client.last_name}`.trim(),
    date: client.created_at,
  });

  const validationLabel = getClientValidationStatusInfo(client.validation_status).label;
  history.push({
    id: `validacion-${client.id}`,
    type: "validacion",
    title: `Validación: ${validationLabel}`,
    description: client.validation_notes ?? client.validation_result ?? "",
    date: client.approval_date ?? client.updated_at,
  });

  for (const credit of creditsDetail) {
    const creditLabel = getCreditStatusInfo(credit.status).label;
    history.push({
      id: `credito-${credit.id}`,
      type: "credito_creado",
      title: `Crédito ${credit.credit_number} creado`,
      description: `${credit.installments_count} cuotas · ${credit.imei ?? "sin IMEI"}`,
      date: credit.created_at,
    });
    if (credit.approval_date) {
      history.push({
        id: `credito-aprobado-${credit.id}`,
        type: "credito_aprobado",
        title: `Crédito ${credit.credit_number} aprobado`,
        description: `Estado actual: ${creditLabel}`,
        date: credit.approval_date,
      });
    }
    if (credit.device) {
      if (credit.device.purchase_date) {
        history.push({
          id: `equipo-comprado-${credit.device.id}`,
          type: "equipo",
          title: `${credit.device.brand} ${credit.device.model} comprado`,
          description: credit.credit_number,
          date: `${credit.device.purchase_date}T00:00:00`,
        });
      }
      if (credit.device.delivery_date) {
        history.push({
          id: `equipo-entregado-${credit.device.id}`,
          type: "equipo",
          title: `${credit.device.brand} ${credit.device.model} entregado`,
          description: credit.credit_number,
          date: `${credit.device.delivery_date}T00:00:00`,
        });
      }
    }
  }

  for (const payment of paymentsDetail) {
    history.push({
      id: `pago-${payment.id}`,
      type: "pago",
      title: `Pago de ${payment.amount}`,
      description: `${payment.credit_number ?? "—"}${
        payment.installment_number != null ? ` · Cuota ${payment.installment_number}` : ""
      }`,
      date: payment.created_at,
    });
  }

  for (const block of blocks) {
    const label = getBlockStatusInfo(block.status).label;
    history.push({
      id: `bloqueo-${block.id}`,
      type: "bloqueo",
      title: `Bloqueo ${label.toLowerCase()}`,
      description: `IMEI ${block.imei} · ${block.reason}`,
      date: block.block_date,
    });
  }

  for (const unblock of unblocks) {
    const label = getBlockStatusInfo(unblock.status).label;
    history.push({
      id: `desbloqueo-${unblock.id}`,
      type: "desbloqueo",
      title: `Desbloqueo ${label.toLowerCase()}`,
      description: `IMEI ${unblock.imei}`,
      date: unblock.unblock_date,
    });
  }

  for (const doc of documentsWithUrl) {
    history.push({
      id: `documento-${doc.id}`,
      type: "documento",
      title: `Documento cargado: ${doc.name}`,
      description: getDocumentTypeLabel(doc.doc_type),
      date: doc.created_at,
    });
  }

  history.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return {
    client,
    credits: creditsDetail,
    documents: documentsWithUrl,
    payments: paymentsDetail,
    blocks,
    unblocks,
    history,
  };
}
