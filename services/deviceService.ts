import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";
import type { Device, DeviceOption } from "@/types";

const DEVICE_LIST_LIMIT = 1000;

/**
 * Obtiene todos los equipos activos (sin soft delete) para el listado.
 */
export async function getDevices(): Promise<Device[]> {
  return withCache("svc:devices", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(DEVICE_LIST_LIMIT);

    if (error || !data) return [];
    return data;
  });
}

/**
 * Obtiene los equipos disponibles como opciones para el formulario de crédito.
 */
export async function getAvailableDevices(): Promise<DeviceOption[]> {
  return withCache("svc:devices-available", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("devices")
      .select("id, brand, model, capacity, color, imei")
      .eq("status", "disponible")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(DEVICE_LIST_LIMIT);

    if (error || !data) return [];
    return data;
  });
}
