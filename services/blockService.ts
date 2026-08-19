import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";
import type {
  BlockWithRelations,
  UnblockWithRelations,
  UnblockCandidate,
  ClientCreditDetail,
} from "@/types";

const LIST_LIMIT = 1000;

/**
 * Obtiene las solicitudes de bloqueo con cliente y usuario asociados.
 */
export async function getBlocks(): Promise<BlockWithRelations[]> {
  return withCache("svc:blocks", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("blocks")
      .select(
        `
      *,
      client:clients(id, first_name, last_name, cedula),
      user:profiles!blocks_user_id_fkey(id, full_name)
    `
      )
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);

    if (error || !data) return [];
    return data.map((row) => ({
      ...row,
      user: Array.isArray(row.user) ? row.user[0] : row.user,
    })) as unknown as BlockWithRelations[];
  });
}

/**
 * Obtiene las solicitudes de desbloqueo con cliente, pago y usuario asociados.
 */
export async function getUnblocks(): Promise<UnblockWithRelations[]> {
  return withCache("svc:unblocks", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("unblocks")
      .select(
        `
      *,
      client:clients(id, first_name, last_name, cedula),
      payment:payments(id, amount, created_at, method),
      user:profiles!unblocks_user_id_fkey(id, full_name)
    `
      )
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);

    if (error || !data) return [];
    return data.map((row) => ({
      ...row,
      user: Array.isArray(row.user) ? row.user[0] : row.user,
    })) as unknown as UnblockWithRelations[];
  });
}

/**
 * Equipos operativamente bloqueados que aún no tienen una solicitud de
 * desbloqueo activa. Se usan para poblar el panel de "Pendientes de
 * desbloqueo" y enlazar device_id/credit_id al crear el desbloqueo.
 */
export async function getUnblockCandidates(): Promise<UnblockCandidate[]> {
  return withCache("svc:unblock-candidates", async () => {
    const supabase = await createClient();

    const { data: blocks } = await supabase
      .from("blocks")
      .select("imei")
      .in("status", ["pendiente", "enviado"]);

    const activeBlockImeis = new Set((blocks ?? []).map((b) => b.imei));

    const { data: unblocks } = await supabase
      .from("unblocks")
      .select("imei")
      .in("status", ["pendiente", "enviado"]);

    const activeUnblockImeis = new Set((unblocks ?? []).map((u) => u.imei));

    const { data, error } = await supabase
      .from("devices")
      .select(
        `
      id, brand, model, capacity, color, imei, status,
      credit:credits(id, credit_number, balance, status, client:clients(id, first_name, last_name, cedula, phone))
    `
      )
      .eq("status", "bloqueado")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(LIST_LIMIT);

    if (error || !data) return [];

    const candidates: UnblockCandidate[] = [];
    for (const device of data) {
      if (!device.imei) continue;
      if (activeBlockImeis.has(device.imei)) continue;
      if (activeUnblockImeis.has(device.imei)) continue;

      const creditRow = Array.isArray(device.credit)
        ? device.credit[0]
        : device.credit;
      const clientRow =
        creditRow && Array.isArray(creditRow.client)
          ? creditRow.client[0]
          : creditRow?.client ?? null;

      candidates.push({
        device: {
          id: device.id,
          brand: device.brand,
          model: device.model,
          capacity: device.capacity,
          color: device.color,
          imei: device.imei,
          status: device.status,
        },
        credit: creditRow
          ? {
              id: creditRow.id,
              credit_number: creditRow.credit_number,
              balance: creditRow.balance,
              status: creditRow.status,
            }
          : null,
        client: clientRow
          ? {
              id: clientRow.id,
              first_name: clientRow.first_name,
              last_name: clientRow.last_name,
              cedula: clientRow.cedula,
              phone: clientRow.phone,
            }
          : null,
      });
    }

    return candidates;
  });
}

/**
 * Créditos no finalizados de un cliente con su etiqueta de equipo, para
 * enlazar el credit_id/device_id al crear un bloqueo o desbloqueo.
 */
export async function getClientCredits(
  clientId: string
): Promise<ClientCreditDetail[]> {
  return withCache(`svc:client-credits:${clientId}`, async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("credits")
      .select(
        "id, credit_number, imei, balance, status, device_id, device:devices(brand, model)"
      )
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .neq("status", "finalizado")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((credit) => {
      const device = Array.isArray(credit.device) ? credit.device[0] : credit.device;
      const deviceLabel = device
        ? `${device.brand} ${device.model}`.trim()
        : null;

      return {
        id: credit.id,
        credit_number: credit.credit_number,
        imei: credit.imei,
        balance: credit.balance,
        status: credit.status,
        device_label: deviceLabel,
        pending_count: 0,
      };
    });
  });
}
