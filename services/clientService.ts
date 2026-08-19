import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";
import type { Client, ClientOption } from "@/types";

const CLIENT_LIST_LIMIT = 1000;

/**
 * Obtiene todos los clientes activos (sin soft delete) para el listado.
 */
export async function getClients(): Promise<Client[]> {
  return withCache("svc:clients", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(CLIENT_LIST_LIMIT);

    if (error || !data) return [];
    return data;
  });
}

/**
 * Obtiene clientes como opciones (id, nombre, cédula) para formularios.
 */
export async function getClientOptions(): Promise<ClientOption[]> {
  return withCache("svc:client-options", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("clients")
      .select("id, first_name, last_name, cedula")
      .is("deleted_at", null)
      .order("first_name", { ascending: true })
      .limit(CLIENT_LIST_LIMIT);

    if (error || !data) return [];
    return data;
  });
}
